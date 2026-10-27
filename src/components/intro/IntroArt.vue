<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Illustration area of an onboarding step. It keeps the design size on tall phones and
 * scales its content down on short screens (or with the browser bars showing), so the
 * step's text and the buttons below stay on screen. When there is too little room for a
 * readable picture, the picture is left out and its space goes to the text.
 */
const props = defineProps<{ width: number; height: number }>()

/** Below this scale the picture is too small to read and is hidden. */
const MIN_FIT = 0.35

const box = ref<HTMLElement | null>(null)
const fit = ref(1)
/** Too little room: the picture is left out and gives its space to the text. */
const collapsed = ref(false)
let observer: ResizeObserver | undefined

/**
 * While collapsed the box still grows into whatever height is free (flex-grow 1, basis 0), so a
 * later measurement can bring the picture back once there is room. That happens when the first
 * layout ran before the fonts or the page were ready, or on a wide landscape screen.
 */
function measure(width: number, height: number): void {
  const next = Math.max(0, Math.min(1, height / props.height, width / props.width))
  if (collapsed.value) {
    if (next >= MIN_FIT) {
      collapsed.value = false
      fit.value = next
    }
    return
  }
  fit.value = next
  if (next < MIN_FIT) collapsed.value = true
}

// The screen got bigger or smaller (rotation, browser bars): measure again from full size.
function onResize(): void {
  collapsed.value = false
}

onMounted(() => {
  if (!box.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (rect) measure(rect.width, rect.height)
  })
  observer.observe(box.value)
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', onResize)
})

const innerStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
  transform: fit.value < 1 ? `scale(${fit.value.toFixed(3)})` : undefined,
}))
</script>

<template>
  <div ref="box" class="art" :style="collapsed ? { flexBasis: '0px', flexGrow: 1 } : { flexBasis: `${height}px` }" aria-hidden="true" data-testid="intro-art" :data-fit="collapsed ? '0' : fit.toFixed(2)">
    <div v-show="!collapsed" class="art__inner" :style="innerStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* Shrinks first when the step runs out of room (text and fields keep their size). */
.art {
  flex-grow: 0;
  flex-shrink: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.art__inner {
  flex: none;
  transform-origin: 50% 50%;
}
</style>
