<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TreeView from '@/tree/TreeView.vue'
import { usePrefersReducedMotion } from '@/tree/environment'
import IntroArt from './IntroArt.vue'

/**
 * Step 3: the tree from the seed the user will get, grown to a full crown with flowers and
 * apples, so the step shows what the copy promises. (The mockup draws 30 leaves, which is
 * a thin sapling in a mostly empty sky and looked like it had not loaded.) It grows from
 * a sapling once when the step opens; with reduced motion it is drawn grown right away.
 */
defineProps<{ seed: number }>()

/** Leaves of the preview tree: a nearly full-size crown (full scale is 200). */
const PREVIEW_LEAVES = 180
const GROW_MS = 1500

const { t } = useI18n()
const reducedMotion = usePrefersReducedMotion()
const canAnimate = !reducedMotion.value && typeof requestAnimationFrame === 'function'
const leaves = ref(canAnimate ? 1 : PREVIEW_LEAVES)
let frame = 0

onMounted(() => {
  if (!canAnimate) return
  const start = performance.now()
  const tick = (now: number): void => {
    const p = Math.min(1, (now - start) / GROW_MS)
    const eased = 1 - Math.pow(1 - p, 3)
    leaves.value = Math.max(1, Math.round(PREVIEW_LEAVES * eased))
    if (p < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
})
onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <div class="step">
    <IntroArt :width="246" :height="301">
      <TreeView :leaves="leaves" :seed="seed" season="auto" time="day" :size="246" />
    </IntroArt>

    <div class="step__copy">
      <h1 class="step__title" tabindex="-1" data-step-title>{{ t('intro.tree.title') }}</h1>
      <p class="step__lead">{{ t('intro.tree.text') }}</p>
      <p class="step__more">{{ t('intro.tree.more') }}</p>
    </div>
  </div>
</template>

<style scoped src="./intro.css"></style>
