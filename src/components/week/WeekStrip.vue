<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { StripDay } from './types'

/** The 7-day strip: each day is a toggle button that selects it for the detail card. */
defineProps<{ days: StripDay[] }>()
const selected = defineModel<string>({ required: true })

const { t } = useI18n()

/** Full day name (unless it is the visible label, as for "Heute") and the entry count. */
function hint(day: StripDay): string {
  return day.name === day.label
    ? t('week.dayCount', { n: day.entryCount }, day.entryCount)
    : t('week.dayAria', { day: day.name, n: day.entryCount }, day.entryCount)
}
</script>

<template>
  <section class="strip" :aria-label="t('week.stripLabel')">
    <button
      v-for="day in days"
      :key="day.key"
      type="button"
      class="strip__day"
      :class="{ 'strip__day--today': day.isToday, 'strip__day--selected': selected === day.key }"
      :aria-pressed="selected === day.key ? 'true' : 'false'"
      @click="selected = day.key"
    >
      <span class="strip__label">{{ day.label }}</span>
      <span class="strip__num">{{ day.day }}</span>
      <!-- Named by its content: the visible "Mi 21" comes first, so voice control finds it (WCAG 2.5.3). -->
      <span class="visually-hidden">, {{ hint(day) }}</span>
      <span class="strip__dots" aria-hidden="true">
        <span v-for="(dot, i) in day.dots" :key="i" class="strip__dot" :style="{ background: dot }"></span>
        <span v-if="day.entryCount === 0" class="strip__dot strip__dot--none"></span>
      </span>
    </button>
  </section>
</template>

<style scoped>
.strip {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: 14px 10px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.strip__day {
  border: 0;
  border-radius: var(--radius-sm);
  padding: 6px 0;
  background: transparent;
  color: var(--color-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.strip__day--selected {
  background: var(--color-surface-highlight);
  box-shadow: inset 0 0 0 2px var(--color-accent);
}

.strip__day--today {
  background: var(--color-inverse);
  color: var(--color-inverse-ink);
}

.strip__label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-muted);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.strip__day--today .strip__label {
  color: var(--color-inverse-ink);
}

.strip__num {
  font-size: 16px;
  font-weight: 800;
}

.strip__dots {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  min-height: 66px;
}

.strip__dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
}

.strip__dot--none {
  border: 1.5px dashed var(--color-line-dashed);
}
</style>
