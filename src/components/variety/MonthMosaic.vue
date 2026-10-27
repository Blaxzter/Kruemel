<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { MosaicDay } from './types'

/** Month mosaic: one field per day with a dot per logged tile colour. Monday first. */
defineProps<{ title: string; heads: string[]; leading: number; trailing: number; days: MosaicDay[] }>()

const { t } = useI18n()
</script>

<template>
  <section class="card" aria-labelledby="variety-month-title">
    <div class="card__head">
      <h2 id="variety-month-title" class="card__title">{{ title }}</h2>
      <span class="card__meta">{{ t('variety.month.hint') }}</span>
    </div>
    <div class="mosaic__heads" aria-hidden="true">
      <span v-for="head in heads" :key="head" class="mosaic__head">{{ head }}</span>
    </div>
    <ol class="mosaic" aria-labelledby="variety-month-title">
      <li v-for="n in leading" :key="`lead-${n}`" class="mosaic__blank" aria-hidden="true"></li>
      <li
        v-for="day in days"
        :key="day.key"
        class="mosaic__day"
        :class="{ 'mosaic__day--today': day.isToday, 'mosaic__day--future': day.isFuture, 'mosaic__day--filled': day.dots.length > 0 }"
      >
        <span class="mosaic__num" aria-hidden="true">{{ day.day }}</span>
        <span class="mosaic__dots" aria-hidden="true">
          <span v-for="(dot, i) in day.dots" :key="i" class="mosaic__dot" :style="{ background: dot }"></span>
        </span>
        <span class="visually-hidden">{{ day.label }}</span>
      </li>
      <li v-for="n in trailing" :key="`trail-${n}`" class="mosaic__blank" aria-hidden="true"></li>
    </ol>
  </section>
</template>

<style scoped src="./card.css"></style>

<style scoped>
.mosaic__heads,
.mosaic {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.mosaic {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mosaic__head {
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  color: var(--color-muted);
}

.mosaic__day {
  height: 40px;
  min-width: 0;
  border-radius: 10px;
  padding: 4px;
  border: 1px solid var(--color-surface-chip);
  background: var(--color-card);
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

.mosaic__day--filled {
  background: var(--color-surface-subtle);
}

.mosaic__day--future {
  background: transparent;
  border: 1.5px dashed var(--color-line);
}

.mosaic__day--today {
  border: 2px solid var(--color-ink);
}

.mosaic__num {
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  color: var(--color-ink);
}

.mosaic__day--future .mosaic__num {
  color: var(--color-muted);
}

.mosaic__dots {
  display: grid;
  grid-template-columns: repeat(4, 6px);
  gap: 2px;
}

.mosaic__dot {
  width: 6px;
  height: 6px;
  border-radius: 3px;
}
</style>
