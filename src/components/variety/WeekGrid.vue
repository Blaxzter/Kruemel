<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GridColumn, GridRow } from './types'

/** Tiles x last 7 days. A real table so screen readers can move by row and column. */
const props = defineProps<{ rows: GridRow[]; columns: GridColumn[] }>()

const { t } = useI18n()

const had = computed(() => props.rows.filter((r) => r.cells.some(Boolean)).length)
</script>

<template>
  <section class="card" aria-labelledby="variety-week-title">
    <div class="card__head">
      <h2 id="variety-week-title" class="card__title">{{ t('variety.week.title') }}</h2>
      <span class="card__meta">{{ t('variety.week.count', { n: had, total: rows.length }) }}</span>
    </div>
    <table class="grid" aria-labelledby="variety-week-title">
      <colgroup>
        <col class="grid__label-col" />
        <col v-for="col in columns" :key="col.key" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col"><span class="visually-hidden">{{ t('variety.week.tile') }}</span></th>
          <th v-for="col in columns" :key="col.key" scope="col" class="grid__day" :class="{ 'grid__day--today': col.isToday }">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <th scope="row" class="grid__tile">
            <span class="grid__tile-inner">
              <span class="grid__dot" :style="{ background: row.dot }" aria-hidden="true"></span>
              <span class="grid__name">{{ row.label }}</span>
            </span>
          </th>
          <td v-for="(on, i) in row.cells" :key="i" class="grid__cell">
            <span
              class="grid__fill"
              :class="{ 'grid__fill--today': columns[i]?.isToday }"
              :style="on ? { background: row.dot } : undefined"
            ></span>
            <span v-if="on" class="visually-hidden">{{ t('variety.week.had') }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped src="./card.css"></style>

<style scoped>
.grid {
  table-layout: fixed;
  border-collapse: separate;
  /* 4px between columns, 8px between rows: the design's 28px row pitch. */
  border-spacing: 4px 8px;
  margin: -8px -4px;
  width: calc(100% + 8px);
}

/* Wide enough that built-in names such as "Warmes Essen" stay on one line. */
.grid__label-col {
  width: 112px;
}

.grid th {
  padding: 0;
  font-weight: inherit;
}

.grid__day {
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  color: var(--color-muted);
}

.grid__day--today {
  color: var(--color-ink);
}

.grid__tile {
  text-align: left;
}

.grid__name {
  /* Long custom names wrap to a second line instead of being cut off. */
  min-width: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.grid__tile-inner {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.grid__dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 5px;
}

.grid__cell {
  padding: 0;
}

.grid__fill {
  display: block;
  height: 20px;
  border-radius: 6px;
  background: var(--color-surface-subtle);
}

.grid__fill--today {
  box-shadow: inset 0 0 0 1.5px var(--color-ink);
}
</style>
