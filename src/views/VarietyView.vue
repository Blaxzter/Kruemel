<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntries, useTiles, useToday } from '@/stores'
import { dayKeyToDate, monthMosaic, tileDotVar, weekMatrix } from '@/domain'
import WeekGrid from '@/components/variety/WeekGrid.vue'
import MonthMosaic from '@/components/variety/MonthMosaic.vue'
import PageHeader from '@/components/settings/PageHeader.vue'
import type { GridColumn, GridRow, MosaicDay } from '@/components/variety/types'
import { monthName, shortWeekday, weekdayHeads } from '@/components/week/diary'
import { intlLocale } from '@/components/today/todayModel'

const { t, locale } = useI18n()
const { tiles, tileLabel } = useTiles()
const { entries } = useEntries()
const { todayKey } = useToday()

const tileById = computed(() => new Map(tiles.value.map((tile) => [tile.id, tile])))
const week = computed(() => weekMatrix(entries.value, tiles.value, todayKey.value))
const month = computed(() => monthMosaic(entries.value, tiles.value, todayKey.value))

const columns = computed<GridColumn[]>(() =>
  week.value.days.map((key) => ({
    key,
    isToday: key === todayKey.value,
    label: key === todayKey.value ? t('week.today') : shortWeekday(dayKeyToDate(key), locale.value),
  })),
)

const rows = computed<GridRow[]>(() =>
  week.value.rows.flatMap((row) => {
    const tile = tileById.value.get(row.tileId)
    return tile ? [{ id: tile.id, label: tileLabel(tile), dot: tileDotVar(tile.color), cells: row.days }] : []
  }),
)

const monthTitle = computed(() => monthName(dayKeyToDate(todayKey.value), locale.value))
const heads = computed(() => weekdayHeads(locale.value))

const mosaicDays = computed<MosaicDay[]>(() => {
  const dateFormat = new Intl.DateTimeFormat(intlLocale(locale.value), { day: 'numeric', month: 'long' })
  return month.value.days.map((day) => {
    const logged = day.tileIds.flatMap((id) => tileById.value.get(id) ?? [])
    const date = dateFormat.format(dayKeyToDate(day.dayKey))
    const label = day.isFuture
      ? t('variety.month.dayLater', { date })
      : logged.length > 0
        ? t('variety.month.dayWith', { date, tiles: logged.map(tileLabel).join(', ') })
        : t('variety.month.dayNothing', { date })
    return {
      key: day.dayKey,
      day: day.day,
      isToday: day.isToday,
      isFuture: day.isFuture,
      dots: logged.map((tile) => tileDotVar(tile.color)),
      label,
    }
  })
})
</script>

<template>
  <main class="variety">
    <PageHeader :title="t('variety.title')" back-to="/woche" :back-label="t('variety.back')" />
    <p class="variety__intro">{{ t('variety.intro') }}</p>

    <WeekGrid :rows="rows" :columns="columns" />
    <MonthMosaic
      :title="monthTitle"
      :heads="heads"
      :leading="month.leadingBlanks"
      :trailing="month.trailingBlanks"
      :days="mosaicDays"
    />
  </main>
</template>

<style scoped>
.variety {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.variety__intro {
  margin-bottom: 4px;
  font-size: 15px;
  line-height: 1.4;
  color: var(--color-ink-secondary);
}
</style>
