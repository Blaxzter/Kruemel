<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PartOfDay } from '@/domain/types'
import type { DetailItem } from './types'

/** Selected day: entries grouped by part of day, plus glasses of water. */
defineProps<{
  title: string
  parts: { part: PartOfDay; items: DetailItem[] }[]
  /** Glasses of water, or null when the water row is switched off. */
  water: number | null
}>()

const { t } = useI18n()
</script>

<template>
  <section class="detail">
    <h2 class="detail__title">{{ title }}</h2>
    <p v-if="parts.length === 0" class="detail__empty">{{ t('week.empty') }}</p>
    <div v-for="group in parts" :key="group.part" class="detail__part">
      <h3 class="detail__part-name">{{ t(`week.parts.${group.part}`) }}</h3>
      <ul class="detail__chips">
        <li v-for="item in group.items" :key="item.id" class="detail__chip" :style="{ background: item.soft }">{{ item.label }}</li>
      </ul>
    </div>
    <p v-if="water" class="detail__water">
      <svg width="16" height="18" viewBox="0 0 24 28" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="M4 3h16l-2 22H6z" fill="var(--color-water-fill)" stroke="var(--color-water-stroke)" />
      </svg>
      <span>{{ t('week.water', { n: water }, water) }}</span>
    </p>
  </section>
</template>

<style scoped>
.detail {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail__title {
  font-size: 20px;
}

.detail__empty {
  font-size: 15px;
  color: var(--color-muted);
}

.detail__part {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.detail__part-name {
  width: 64px;
  flex: none;
  padding-top: 6px;
  font: 800 13px var(--font-body);
  color: var(--color-muted);
}

.detail__chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail__chip {
  border-radius: var(--radius-pill);
  padding: 6px 10px;
  color: var(--color-tile-ink);
  font-size: 13px;
  font-weight: 700;
}

.detail__water {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-muted);
}
</style>
