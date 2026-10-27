<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { DAY_START_HOURS } from '@/domain/settings'
import type { Settings } from '@/domain/types'

/** "Neuer Tag ab" select, shared by Settings and onboarding step 1. */
defineProps<{ id: string; size?: 'md' | 'lg' }>()
const model = defineModel<Settings['dayStartHour']>({ required: true })

const { t } = useI18n()

function label(hour: Settings['dayStartHour']): string {
  return hour === 0 ? t('settings.dayStart.midnight') : t('settings.dayStart.hour', { h: hour })
}
</script>

<template>
  <select :id="id" v-model.number="model" class="day-select" :class="`day-select--${size ?? 'md'}`">
    <option v-for="hour in DAY_START_HOURS" :key="hour" :value="hour">{{ label(hour) }}</option>
  </select>
</template>

<style scoped>
.day-select {
  flex: none;
  height: var(--touch-target);
  border: 2px solid var(--color-surface-chip);
  border-radius: var(--radius-xs);
  padding: 0 10px;
  background: var(--color-card);
  color: var(--color-ink);
  font: 800 15px var(--font-body);
}

.day-select--lg {
  height: 52px;
  min-width: 104px;
  border-color: var(--color-line);
  border-radius: var(--radius-sm);
  padding: 0 12px;
  font: 700 18px var(--font-body);
}
</style>
