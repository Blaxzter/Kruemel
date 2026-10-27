<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/settings/PageHeader.vue'
import TileIcon from '@/components/ui/TileIcon.vue'
import TileEditorSheet from '@/components/tiles/TileEditorSheet.vue'
import { tileSoftVar } from '@/domain/tiles'
import type { Tile } from '@/domain/types'
import { useTiles } from '@/stores'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { tiles, moveTile, updateTile, tileLabel } = useTiles()

const sorted = computed(() => [...tiles.value].sort((a, b) => a.order - b.order))

const editorOpen = ref(false)
const editing = ref<Tile | null>(null)
/** The sheet was opened through ?neu=1 (e.g. the "Eigene" tile on Today). */
const openedFromLink = ref(false)

function openNew(): void {
  editing.value = null
  editorOpen.value = true
}

function openEdit(tile: Tile): void {
  editing.value = tile
  editorOpen.value = true
}

watch(
  () => route.query.neu,
  (neu) => {
    if (neu === undefined) return
    openedFromLink.value = true
    openNew()
    // Drop the flag so a reload or the back button does not reopen the sheet.
    const query = { ...route.query }
    delete query.neu
    void router.replace({ query })
  },
  { immediate: true },
)

function closeEditor(): void {
  editorOpen.value = false
  if (openedFromLink.value) {
    openedFromLink.value = false
    // Return to where the link came from (usually Today).
    if (window.history.state?.back) router.back()
  }
}

const listEl = ref<HTMLElement | null>(null)

async function move(tile: Tile, dir: -1 | 1, button: 'up' | 'down'): Promise<void> {
  await moveTile(tile.id, dir)
  // Keep keyboard focus on the same control of the moved row.
  await nextTick()
  const target = listEl.value?.querySelector<HTMLButtonElement>(`[data-tile="${tile.id}"] [data-move="${button}"]`)
  if (target && !target.disabled) target.focus()
  else listEl.value?.querySelector<HTMLButtonElement>(`[data-tile="${tile.id}"] [data-move="${button === 'up' ? 'down' : 'up'}"]`)?.focus()
}

async function toggleHidden(tile: Tile): Promise<void> {
  const hidden = !tile.hidden
  await updateTile(tile.id, { hidden })
  toast.show(t(hidden ? 'tiles.manage.hiddenToast' : 'tiles.manage.shownToast', { name: tileLabel(tile) }))
}
</script>

<template>
  <main class="tiles-page">
    <PageHeader :title="t('tiles.manage.title')" back-to="/einstellungen" :back-label="t('tiles.manage.back')" />
    <p class="tiles-page__intro">{{ t('tiles.manage.intro') }}</p>

    <ul ref="listEl" class="tile-list" :aria-label="t('tiles.manage.listLabel')">
      <li v-for="(tile, index) in sorted" :key="tile.id" class="tile-row" :class="{ 'tile-row--hidden': tile.hidden }" :data-tile="tile.id">
        <button type="button" class="tile-row__main" :aria-label="t('tiles.manage.edit', { name: tileLabel(tile) })" aria-haspopup="dialog" @click="openEdit(tile)">
          <span class="tile-row__icon" :style="{ background: tileSoftVar(tile.color) }">
            <TileIcon :name="tile.icon" :size="26" />
          </span>
          <span class="tile-row__name">
            <span class="tile-row__label">{{ tileLabel(tile) }}</span>
            <span v-if="tile.hidden" class="tile-row__badge">{{ t('tiles.manage.hiddenBadge') }}</span>
          </span>
        </button>
        <button
          type="button"
          class="tile-row__tool"
          data-move="up"
          :disabled="index === 0"
          :aria-label="t('tiles.manage.moveUp', { name: tileLabel(tile) })"
          @click="move(tile, -1, 'up')"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 15l6-6 6 6" /></svg>
        </button>
        <button
          type="button"
          class="tile-row__tool"
          data-move="down"
          :disabled="index === sorted.length - 1"
          :aria-label="t('tiles.manage.moveDown', { name: tileLabel(tile) })"
          @click="move(tile, 1, 'down')"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <button
          type="button"
          class="tile-row__tool"
          data-action="visibility"
          :aria-label="t(tile.hidden ? 'tiles.manage.show' : 'tiles.manage.hide', { name: tileLabel(tile) })"
          @click="toggleHidden(tile)"
        >
          <svg v-if="tile.hidden" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M3 3l18 18" /><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6-.5 1-1.5 2.4-2.9 3.7M6.6 7.7C4.6 9 3.1 10.8 2.5 12c1 2 4.5 6 9.5 6 1.6 0 3-.4 4.3-1" /><path d="M9.9 10a3 3 0 0 0 4.2 4.2" />
          </svg>
          <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M2.5 12c1-2 4.5-6 9.5-6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6z" /><circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </li>
    </ul>

    <button type="button" class="tiles-page__new" aria-haspopup="dialog" @click="openNew">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" /></svg>
      <span>{{ t('tiles.manage.new') }}</span>
    </button>

    <TileEditorSheet :open="editorOpen" :tile="editing" @close="closeEditor" @saved="closeEditor" />
  </main>
</template>

<style scoped>
.tiles-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tiles-page__intro {
  font-size: 14px;
  color: var(--color-muted);
  padding: 0 4px;
}

.tile-list {
  list-style: none;
  margin: 0;
  padding: 4px 8px 4px 6px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
}

.tile-row {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 60px;
}

.tile-row + .tile-row {
  border-top: 1px solid var(--color-surface-chip);
}

.tile-row__main {
  flex: 1;
  min-width: 0;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border: 0;
  border-radius: var(--radius-xs);
  padding: 4px 6px;
  background: transparent;
  color: var(--color-ink);
  text-align: left;
}

.tile-row__icon {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-xs);
  color: var(--color-tile-ink);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-row__name {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tile-row__label {
  font-size: 15px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile-row__badge {
  font-size: 12px;
  color: var(--color-muted);
}

.tile-row--hidden .tile-row__icon {
  opacity: 0.55;
}

.tile-row__tool {
  flex: none;
  width: var(--touch-target);
  height: var(--touch-target);
  border: 0;
  border-radius: 22px;
  background: transparent;
  color: var(--color-ink-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-row__tool:disabled {
  color: var(--color-line);
}

.tiles-page__new {
  min-height: 56px;
  border: 2px dashed var(--color-line-dashed);
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font: 800 16px var(--font-body);
}
</style>
