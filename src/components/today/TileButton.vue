<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TileIcon from '@/components/ui/TileIcon.vue'
import type { Tile } from '@/domain/types'
import { tileSoftVar } from '@/domain/tiles'

const props = withDefaults(
  defineProps<{
    tile: Tile
    label: string
    /** Entries for this tile today; the badge shows when > 0. */
    count: number
    /** Edit mode: the tile opens its editor instead of logging. */
    editing?: boolean
    /** Edit mode: this tile is being dragged, so its slot shows the drop position. */
    placeholder?: boolean
  }>(),
  { editing: false, placeholder: false },
)

const emit = defineEmits<{ press: [tile: Tile] }>()

const { t } = useI18n()

const ariaLabel = computed(() =>
  props.editing ? t('today.edit.tileAria', { tile: props.label }) : t('today.tiles.aria', { tile: props.label, n: props.count }, props.count),
)
</script>

<template>
  <button
    type="button"
    class="tile"
    :class="{ 'tile--editing': editing, 'tile--placeholder': placeholder }"
    :data-tile="tile.id"
    :style="{ background: placeholder ? undefined : tileSoftVar(tile.color) }"
    :aria-label="ariaLabel"
    :aria-haspopup="editing ? 'dialog' : undefined"
    @click="emit('press', tile)"
  >
    <TileIcon :name="tile.icon" :size="34" />
    <span class="tile__label">{{ label }}</span>
    <span v-if="count > 0 && !editing" class="tile__badge" data-testid="tile-badge" aria-hidden="true">{{ count }}</span>
    <span v-if="editing" class="tile__pencil" data-testid="tile-pencil" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" focusable="false">
        <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
        <path d="M13.5 6.5l4 4" />
      </svg>
    </span>
  </button>
</template>

<style scoped>
.tile {
  position: relative;
  min-height: 92px;
  border: 0;
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
  min-width: 0;
  /* A long press opens edit mode: no text selection, no iOS callout, no tap highlight. */
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

.tile__label {
  text-align: center;
  overflow-wrap: anywhere;
}

/* Badge stays dark on light in both themes because tiles stay pastel. */
.tile__badge {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 12px;
  background: var(--color-tile-ink);
  color: #ffffff;
  font: 800 13px var(--font-body);
  display: flex;
  align-items: center;
  justify-content: center;
}

/*
 * No touch-action override while editing: a swipe on a tile still scrolls the page. The grid
 * blocks scrolling itself (touchmove) once a finger has rested on a tile, see useTileGestures.ts.
 */

.tile__pencil {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border-radius: 13px;
  background: var(--color-tile-ink);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile--placeholder {
  background: transparent;
  outline: 3px dashed var(--color-accent);
  outline-offset: -3px;
}

.tile--placeholder > * {
  visibility: hidden;
}

@media (prefers-reduced-motion: no-preference) {
  .tile--editing:not(.tile--placeholder) {
    animation: tile-wiggle 0.32s ease-in-out infinite alternate;
  }

  /* Neighbours wiggle out of step, like a set of app icons. */
  .tile--editing:nth-child(2n) {
    animation-delay: -0.16s;
  }

  .tile--editing:nth-child(3n) {
    animation-duration: 0.36s;
  }
}

@keyframes tile-wiggle {
  from {
    transform: rotate(-0.9deg);
  }
  to {
    transform: rotate(0.9deg);
  }
}
</style>
