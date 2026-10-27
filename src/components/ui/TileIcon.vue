<script setup lang="ts">
import { computed } from 'vue'
import type { IconName } from '@/domain/types'
import { TILE_ICON_SHAPES } from './tileIcons'

/**
 * Decorative tile icon. Colour follows `currentColor`; the parent supplies the accessible name.
 * Pass `label` only when the icon stands alone and must be announced.
 */
const props = withDefaults(defineProps<{ name: IconName; size?: number; strokeWidth?: number; label?: string }>(), {
  size: 34,
  strokeWidth: 1.8,
  label: undefined,
})

const shapes = computed(() => TILE_ICON_SHAPES[props.name])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <template v-for="(shape, i) in shapes" :key="i">
      <path v-if="shape.kind === 'path'" :d="shape.d" />
      <circle v-else :cx="shape.cx" :cy="shape.cy" :r="shape.r" />
    </template>
  </svg>
</template>
