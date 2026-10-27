<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PartOfDay } from '@/domain/types'
import { tileDotVar } from '@/domain/tiles'
import { PARTS, cheerKey, columnPreview, type TodayItem } from './todayModel'

const props = defineProps<{
  /** Today's items, oldest first. */
  items: readonly TodayItem[]
  /** Part of day the clock is in now (highlighted; later parts say "Später"). */
  nowPart: PartOfDay
}>()

const emit = defineEmits<{ open: [part: PartOfDay] }>()

const { t } = useI18n()

const total = computed(() => props.items.length)

const columns = computed(() => {
  const nowIndex = PARTS.indexOf(props.nowPart)
  return PARTS.map((part, index) => {
    const all = props.items.filter((i) => i.part === part)
    const { shown, more } = columnPreview(all)
    const name = t(`today.parts.${part}`)
    return {
      part,
      name,
      count: all.length,
      shown,
      more,
      current: part === props.nowPart,
      emptyText: index > nowIndex ? t('today.summary.later') : t('today.summary.nothingYet'),
      // Read after the visible text, so the accessible name contains what is on screen (WCAG 2.5.3).
      hint: t('today.summary.columnHint', { n: all.length }, all.length),
    }
  })
})
</script>

<template>
  <section class="summary card" aria-labelledby="today-summary-title">
    <div class="summary__head">
      <h2 id="today-summary-title" class="summary__title">{{ t('today.summary.title', { n: total }, total) }}</h2>
      <span class="summary__cheer">{{ t(`today.summary.cheer.${cheerKey(total)}`) }}</span>
    </div>
    <div class="summary__columns">
      <button
        v-for="col in columns"
        :key="col.part"
        type="button"
        class="column"
        :class="{ 'column--current': col.current }"
        :data-part="col.part"
        @click="emit('open', col.part)"
      >
        <span class="column__name">
          <span>{{ col.name }}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="column__chevron">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </span>
        <span v-for="item in col.shown" :key="item.id" class="column__item">
          <span class="column__dot" :style="{ background: tileDotVar(item.color) }"></span>
          <span class="column__label">{{ item.label }}</span>
        </span>
        <span v-if="col.more > 0" class="column__more">{{ t('today.summary.more', { n: col.more }) }}</span>
        <span v-if="col.count === 0" class="column__empty">{{ col.emptyText }}</span>
        <span class="visually-hidden">, {{ col.hint }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
}

.summary {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.summary__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.summary__title {
  font-size: 20px;
}

.summary__cheer {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-muted);
}

.summary__columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.column {
  background: var(--color-surface-subtle);
  border: 0;
  border-radius: var(--radius-sm);
  padding: 10px;
  min-height: 104px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  min-width: 0;
  text-align: left;
  font-family: var(--font-body);
  color: var(--color-ink);
}

.column--current {
  background: var(--color-surface-highlight);
}

.column__name {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 800;
  color: var(--color-muted);
}

.column__chevron {
  color: var(--color-faint);
  flex: none;
}

.column__item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  min-width: 0;
}

.column__dot {
  width: 9px;
  height: 9px;
  border-radius: 5px;
  flex: none;
}

.column__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.column__more {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-muted);
  padding-left: 15px;
}

.column__empty {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted-soft);
}

/* The softer grey is below 4.5:1 on the highlighted column, so use the regular muted ink there. */
.column--current .column__empty {
  color: var(--color-muted);
}
</style>
