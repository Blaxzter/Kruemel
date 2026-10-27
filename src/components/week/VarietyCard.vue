<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Petal } from '@/domain'
import { petalShapes } from './rosette'

/** "Deine Vielfalt": a small rosette, one petal per visible tile, filled when it was logged this week. */
const props = defineProps<{ petals: Petal[] }>()

const { t } = useI18n()

const total = computed(() => props.petals.length)
const filled = computed(() => props.petals.filter((p) => p.filled).length)
const shapes = computed(() => {
  const geometry = petalShapes(total.value)
  return props.petals.flatMap((petal, i) => {
    const shape = geometry[i]
    return shape ? [{ ...shape, petal }] : []
  })
})
</script>

<template>
  <section class="mini-card variety-card">
    <h2 class="mini-card__title">
      <RouterLink
        to="/vielfalt"
        class="mini-card__link"
        :aria-label="t('week.varietyCard.aria', { n: filled, total })"
        data-testid="variety-card"
      >
        {{ t('week.varietyCard.title') }}
      </RouterLink>
    </h2>
    <div class="rosette" aria-hidden="true">
      <svg class="rosette__svg" viewBox="0 0 100 100" focusable="false">
        <ellipse
          v-for="s in shapes"
          :key="s.petal.id"
          class="rosette__petal"
          :class="{ 'rosette__petal--open': !s.petal.filled }"
          :cx="s.cx"
          :cy="s.cy"
          :rx="s.rx"
          :ry="s.ry"
          :transform="`rotate(${s.angle} 50 50)`"
          :style="{ '--petal': s.petal.dot }"
          :data-filled="s.petal.filled"
        />
        <circle class="rosette__centre" cx="50" cy="50" r="17" />
      </svg>
      <span class="rosette__count">{{ filled }}/{{ total }}</span>
    </div>
    <p class="mini-card__text">
      <b v-if="total > 0">{{ t('week.varietyCard.count', { n: filled, total }) }}</b>{{ total > 0 ? ' ' : '' }}{{ t('week.varietyCard.tagline') }}
    </p>
  </section>
</template>

<style scoped src="./miniCard.css"></style>

<style scoped>
.rosette {
  position: relative;
  align-self: center;
  /* Decoration: taps go to the card link. */
  pointer-events: none;
  width: 96px;
  height: 96px;
}

.rosette__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.rosette__petal {
  fill: var(--petal);
  stroke: var(--petal);
  stroke-width: 2;
}

/* An open petal keeps its colour as a soft outline: calm, not a warning. */
.rosette__petal--open {
  fill: var(--color-card);
  stroke-dasharray: 3.5 3;
  stroke-linecap: round;
}

.rosette__centre {
  fill: var(--color-ground);
  stroke: var(--color-card);
  stroke-width: 2.5;
}

.rosette__count {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 15px var(--font-display);
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
</style>
