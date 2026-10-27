<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DaySummary from '@/components/today/DaySummary.vue'
import DescribeSheet from '@/components/today/DescribeSheet.vue'
import PartSheet from '@/components/today/PartSheet.vue'
import TileGrid from '@/components/today/TileGrid.vue'
import TodayHeader from '@/components/today/TodayHeader.vue'
import WaterRow from '@/components/today/WaterRow.vue'
import TileEditorSheet from '@/components/tiles/TileEditorSheet.vue'
import { buildTodayItems, countByTile, formatDateLabel, formatTime } from '@/components/today/todayModel'
import { useToast } from '@/composables/useToast'
import { useSheetStack } from '@/composables/sheetStack'
import { showErrorToast, withErrorToast } from '@/composables/errorToast'
import { dayKeyToDate, greetingFor, leafCount as countLeaves, partOfDay, recentNotes } from '@/domain'
import type { Mood, PartOfDay, Tile } from '@/domain/types'
import { useEntries, useSettings, useTiles, useToday, useWater } from '@/stores'

const { t, locale } = useI18n()
const { settings } = useSettings()
const { tiles, visibleTiles, tileLabel } = useTiles()
const { entries, addEntry, removeEntry, restoreEntry } = useEntries()
const { glassesFor, setGlasses } = useWater()
const { todayKey, now } = useToday()
const toast = useToast()

// Header
const greeting = computed(() => {
  const base = t(`today.greeting.${greetingFor(now.value)}`)
  const name = settings.value.name.trim()
  return name ? t('today.greeting.withName', { greeting: base, name }) : base
})
// The diary day, not the wall clock: before the day start the page still shows yesterday.
const dateLabel = computed(() => formatDateLabel(dayKeyToDate(todayKey.value), locale.value))
const leafCount = computed(() => countLeaves(entries.value))

// Today's entries
const items = computed(() => buildTodayItems(entries.value, todayKey.value, tiles.value, tileLabel))
const counts = computed(() => countByTile(items.value))
// The current moment as a pseudo entry: before the day start it is still yesterday's evening.
const nowPart = computed(() => partOfDay({ at: now.value.getTime(), dayKey: todayKey.value }))

// Part sheet
const partSheetOpen = ref(false)
const sheetPart = ref<PartOfDay>('morning')
const sheetItems = computed(() => items.value.filter((i) => i.part === sheetPart.value))

function openPart(part: PartOfDay): void {
  sheetPart.value = part
  partSheetOpen.value = true
}

// Logging
// Store writes roll memory back on failure; these handlers tell the user instead of failing silently.
async function log(tile: Tile, extra?: { note?: string; mood?: Mood }): Promise<void> {
  let entry
  try {
    entry = await addEntry(tile.id, extra)
  } catch (err) {
    showErrorToast(err)
    return
  }
  toast.show(t('today.toast.added', { tile: tileLabel(tile) }), {
    actionLabel: t('common.actions.undo'),
    onAction: () => withErrorToast(removeEntry(entry.id)),
  })
}

async function onRemove(id: string): Promise<void> {
  const entry = entries.value.find((e) => e.id === id)
  if (!entry) return
  try {
    await removeEntry(id)
  } catch (err) {
    showErrorToast(err)
    return
  }
  const tile = tiles.value.find((x) => x.id === entry.tileId)
  toast.show(t('today.toast.removed', { tile: tile ? tileLabel(tile) : '' }), {
    actionLabel: t('common.actions.undo'),
    onAction: () => withErrorToast(restoreEntry(entry)),
  })
}

const describeOpen = ref(false)
const describeTile = ref<Tile | null>(null)
const describeTime = ref('')
const describeNotes = computed(() => (describeTile.value ? recentNotes(entries.value, describeTile.value.id, 6) : []))

function onTile(tile: Tile): void {
  if (settings.value.logMode === 'describe') {
    describeTile.value = tile
    describeTime.value = formatTime(Date.now(), locale.value)
    describeOpen.value = true
    return
  }
  void log(tile)
}

async function onDescribeSave(extra: { note?: string; mood?: Mood }): Promise<void> {
  // A second tap while the sheet is closing must not log the tile twice.
  if (!describeOpen.value) return
  const tile = describeTile.value
  describeOpen.value = false
  if (tile) await log(tile, extra)
}

// Tile edit mode (long press on a tile)
const editing = ref(false)
const editorOpen = ref(false)
const editorTile = ref<Tile | null>(null)
const { anySheetOpen } = useSheetStack()

function openEditor(tile: Tile | null): void {
  editorTile.value = tile
  editorOpen.value = true
}

// Capture phase: runs before a sheet's own Esc handling, so Esc on an open sheet only closes the sheet.
function onWindowKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || !editing.value || anySheetOpen.value || editorOpen.value) return
  editing.value = false
}

// Like a phone home screen: a tap anywhere outside the tiles ends edit mode (and still does what it taps).
// Sheets and the toast are left alone: a sheet opened from edit mode returns to it.
function onWindowPointerdown(e: PointerEvent): void {
  if (!editing.value || anySheetOpen.value || editorOpen.value) return
  const target = e.target as Element | null
  if (!target || target.closest('[data-testid="tile-grid"], [role="dialog"], .toast-layer')) return
  editing.value = false
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown, true)
  window.addEventListener('pointerdown', onWindowPointerdown, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown, true)
  window.removeEventListener('pointerdown', onWindowPointerdown, true)
})
onBeforeRouteLeave(() => {
  editing.value = false
})

// Water
const glasses = computed(() => glassesFor(todayKey.value))

function onGlasses(n: number): void {
  withErrorToast(setGlasses(todayKey.value, n))
}
</script>

<template>
  <main class="today">
    <TodayHeader :date-label="dateLabel" :greeting="greeting" :leaf-count="leafCount" :show-tree="settings.showTree" />
    <DaySummary :items="items" :now-part="nowPart" @open="openPart" />
    <TileGrid
      v-model:editing="editing"
      :tiles="visibleTiles"
      :label-of="tileLabel"
      :counts="counts"
      @press="onTile"
      @edit="openEditor"
      @new="openEditor(null)"
    />
    <WaterRow v-if="settings.showWater" :glasses="glasses" @set="onGlasses" />

    <PartSheet :open="partSheetOpen" :part="sheetPart" :items="sheetItems" @close="partSheetOpen = false" @remove="onRemove" />
    <DescribeSheet
      v-if="describeTile"
      :open="describeOpen"
      :tile="describeTile"
      :label="tileLabel(describeTile)"
      :time="describeTime"
      :recent-notes="describeNotes"
      @close="describeOpen = false"
      @save="onDescribeSave"
    />
    <TileEditorSheet :open="editorOpen" :tile="editorTile" manage @close="editorOpen = false" @saved="editorOpen = false" />
  </main>
</template>

<style scoped>
.today {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
