<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TileIcon from '@/components/ui/TileIcon.vue'
import type { Tile } from '@/domain/types'
import { tileSoftVar } from '@/domain/tiles'
import { moveTileToVisibleIndex } from '@/components/tiles/reorder'
import { showErrorToast } from '@/composables/errorToast'
import { useTileGestures } from './useTileGestures'
import TileButton from './TileButton.vue'

/**
 * The tile grid on Today. A tap logs a tile. A long press (or the context menu key) starts edit
 * mode: tiles wiggle, a tap opens the tile editor, a drag moves a tile to another place.
 */
const props = withDefaults(
  defineProps<{
    tiles: readonly Tile[]
    labelOf: (tile: Tile) => string
    counts: Readonly<Record<string, number>>
    editing?: boolean
  }>(),
  { editing: false },
)

const emit = defineEmits<{
  press: [tile: Tile]
  /** Edit mode: open the editor for this tile. */
  edit: [tile: Tile]
  /** Edit mode: open the editor for a new tile. */
  new: []
  'update:editing': [editing: boolean]
}>()

const { t } = useI18n()
const section = ref<HTMLElement | null>(null)
const announcement = ref('')

function enterEdit(haptic: boolean): void {
  if (props.editing) return
  if (haptic) navigator.vibrate?.(10)
  emit('update:editing', true)
}

async function exitEdit(): Promise<void> {
  const hadFocus = section.value?.contains(document.activeElement) ?? false
  emit('update:editing', false)
  await nextTick()
  // "Fertig" is gone now; keep keyboard users inside the grid.
  if (hadFocus && !section.value?.contains(document.activeElement)) section.value?.querySelector<HTMLElement>('[data-tile]')?.focus()
}

watch(
  () => props.editing,
  (editing, was) => {
    if (editing === was) return
    announcement.value = editing ? t('today.edit.on') : t('today.edit.off')
    if (!editing) gestures.cancelDrag()
  },
)

// Long press and drag to reorder
const gestures = useTileGestures({
  section,
  tiles: () => props.tiles,
  editing: () => props.editing,
  enterEdit,
  async drop(id, to) {
    const tile = props.tiles.find((x) => x.id === id)
    try {
      await moveTileToVisibleIndex(id, to)
      if (tile) announcement.value = t('today.edit.moved', { tile: props.labelOf(tile), n: to + 1 })
    } catch (err) {
      showErrorToast(err)
    }
  },
})
const { dragId, saving, ghost, ghostTile, shown, pointerHandlers, onContextMenu } = gestures

function onTileClick(tile: Tile): void {
  if (gestures.consumeClick()) return
  if (props.editing) emit('edit', tile)
  else emit('press', tile)
}

function onKeydown(e: KeyboardEvent): void {
  const onTile = (e.target as Element | null)?.closest('[data-tile]')
  if (!onTile) return
  if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
    e.preventDefault()
    enterEdit(false)
  }
}

function onNew(): void {
  emit('new')
}
</script>

<template>
  <section
    ref="section"
    class="tiles"
    :class="{ 'tiles--editing': editing, 'tiles--dragging': dragId !== null }"
    :aria-label="t('today.tiles.label')"
    data-testid="tile-grid"
    :data-editing="editing ? 'true' : undefined"
    :aria-busy="saving ? 'true' : undefined"
    @contextmenu="onContextMenu"
    @keydown="onKeydown"
  >
    <div v-if="editing" class="tiles__bar" data-testid="edit-bar">
      <div class="tiles__bar-text">
        <h2 class="tiles__bar-title">{{ t('today.edit.title') }}</h2>
        <p class="tiles__bar-hint">{{ t('today.edit.hint') }}</p>
      </div>
      <button type="button" class="tiles__done" data-testid="edit-done" @click="exitEdit">{{ t('common.actions.done') }}</button>
    </div>

    <div class="tile-grid" v-on="pointerHandlers">
      <TileButton
        v-for="tile in shown"
        :key="tile.id"
        :tile="tile"
        :label="labelOf(tile)"
        :count="counts[tile.id] ?? 0"
        :editing="editing"
        :placeholder="dragId === tile.id"
        @press="onTileClick"
      />
      <button v-if="editing" type="button" class="tile-grid__custom" data-testid="custom-tile" aria-haspopup="dialog" @click="onNew">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>{{ t('today.edit.newTile') }}</span>
      </button>
      <RouterLink v-else :to="{ path: '/kacheln', query: { neu: '1' } }" class="tile-grid__custom" data-testid="custom-tile" :aria-label="t('today.tiles.customAria')">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>{{ t('today.tiles.custom') }}</span>
      </RouterLink>
    </div>

    <div
      v-if="ghost && ghostTile"
      class="tile-ghost"
      data-testid="tile-ghost"
      aria-hidden="true"
      :style="{ left: `${ghost.x}px`, top: `${ghost.y}px`, width: `${ghost.width}px`, height: `${ghost.height}px`, background: tileSoftVar(ghostTile.color) }"
    >
      <TileIcon :name="ghostTile.icon" :size="34" />
      <span class="tile-ghost__label">{{ labelOf(ghostTile) }}</span>
    </div>

    <!-- Outside #app: a live region inside it would stop a sheet from hiding the page (aria-hidden keeps live regions). -->
    <Teleport to="body">
      <p class="visually-hidden" aria-live="polite" data-testid="edit-announcer">{{ announcement }}</p>
    </Teleport>
  </section>
</template>

<style scoped>
.tiles {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.tiles__bar {
  position: sticky;
  top: calc(8px + env(safe-area-inset-top));
  z-index: 5;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 8px 8px 8px 16px;
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.08);
}

.tiles__bar-text {
  flex: 1;
  min-width: 0;
}

.tiles__bar-title {
  font: 800 16px var(--font-body);
  color: var(--color-ink);
}

.tiles__bar-hint {
  font-size: 13px;
  color: var(--color-muted);
}

.tiles__done {
  flex: none;
  min-height: var(--touch-target);
  padding: 0 18px;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  font: 800 15px var(--font-body);
}

.tile-grid__custom {
  min-height: 92px;
  border: 2px dashed var(--color-line-dashed);
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: 700 15px var(--font-body);
  text-decoration: none;
}

.tile-grid__custom:hover {
  color: var(--color-ink);
}

.tiles--editing .tile-grid__custom {
  color: var(--color-ink);
}

.tile-ghost {
  position: fixed;
  z-index: 40;
  pointer-events: none;
  border-radius: var(--radius-lg);
  color: var(--color-tile-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 6px;
  font: 700 15px var(--font-body);
  line-height: 1.15;
  box-shadow: 0 12px 28px rgb(0 0 0 / 0.22);
  transform: scale(1.06);
}

.tile-ghost__label {
  text-align: center;
  overflow-wrap: anywhere;
}

.tiles--dragging {
  -webkit-user-select: none;
  user-select: none;
}
</style>
