<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntries, useSettings, useTiles, useToday, useWater } from '@/stores'
import { dayKeyToDate, groupByPart, lastDays, leafCount, PARTS_OF_DAY, tileDotVar, tileSoftVar, varietyPetals } from '@/domain'
import WeekStrip from '@/components/week/WeekStrip.vue'
import DayDetail from '@/components/week/DayDetail.vue'
import VarietyCard from '@/components/week/VarietyCard.vue'
import TreeCard from '@/components/week/TreeCard.vue'
import type { DetailItem, StripDay } from '@/components/week/types'
import { formatRange, shortWeekday } from '@/components/week/diary'
import { intlLocale } from '@/components/today/todayModel'

const { t, locale } = useI18n()
const { settings } = useSettings()
const { tiles, tileLabel } = useTiles()
const { entries } = useEntries()
const { glassesFor } = useWater()
const { todayKey } = useToday()

const weekKeys = computed(() => lastDays(todayKey.value, 7))
const tileById = computed(() => new Map(tiles.value.map((tile) => [tile.id, tile])))

/** dayKey -> that day's entries, oldest first. */
const byDay = computed(() => {
  const map = new Map<string, typeof entries.value>()
  for (const entry of entries.value) map.set(entry.dayKey, [...(map.get(entry.dayKey) ?? []), entry])
  for (const list of map.values()) list.sort((a, b) => a.at - b.at)
  return map
})

const selected = ref(todayKey.value)
// Follow the day rollover while today is selected, and never keep a day that left the strip.
watch(todayKey, (key, previous) => {
  if (selected.value === previous || !weekKeys.value.includes(selected.value)) selected.value = key
})

const range = computed(() =>
  formatRange(dayKeyToDate(weekKeys.value[0] ?? todayKey.value), dayKeyToDate(todayKey.value), locale.value, t),
)

const days = computed<StripDay[]>(() =>
  weekKeys.value.map((key) => {
    const date = dayKeyToDate(key)
    const isToday = key === todayKey.value
    const list = byDay.value.get(key) ?? []
    return {
      key,
      isToday,
      label: isToday ? t('week.today') : shortWeekday(date, locale.value),
      name: isToday ? t('week.today') : new Intl.DateTimeFormat(intlLocale(locale.value), { weekday: 'long' }).format(date),
      day: date.getDate(),
      entryCount: list.length,
      dots: list.slice(0, 7).map((e) => tileDotVar(tileById.value.get(e.tileId)?.color ?? 'lilac')),
    }
  }),
)

const selectedDay = computed(() => days.value.find((d) => d.key === selected.value) ?? days.value.at(-1))

const parts = computed(() => {
  const grouped = groupByPart(entries.value, selected.value)
  return PARTS_OF_DAY.map((part) => ({
    part,
    items: grouped[part].flatMap<DetailItem>((e) => {
      const tile = tileById.value.get(e.tileId)
      return tile ? [{ id: e.id, label: tileLabel(tile), soft: tileSoftVar(tile.color) }] : []
    }),
  })).filter((group) => group.items.length > 0)
})

const water = computed(() => (settings.value.showWater ? glassesFor(selected.value) : null))

const petals = computed(() => varietyPetals(entries.value, tiles.value, todayKey.value, tileLabel))

const leaves = computed(() => leafCount(entries.value))
const newLeavesThisWeek = computed(() => weekKeys.value.filter((key) => byDay.value.has(key)).length)
</script>

<template>
  <main class="week">
    <header class="week__header">
      <span class="week__range">{{ range }}</span>
      <h1 class="week__title">{{ t('week.title') }}</h1>
    </header>

    <WeekStrip v-model="selected" :days="days" />

    <DayDetail :title="selectedDay?.name ?? ''" :parts="parts" :water="water" />

    <div v-if="settings.showColors || settings.showTree" class="week__cards">
      <VarietyCard v-if="settings.showColors" :petals="petals" />
      <TreeCard v-if="settings.showTree" :leaves="leaves" :new-this-week="newLeavesThisWeek" :seed="settings.treeSeed" />
    </div>
  </main>
</template>

<style scoped>
.week {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.week__header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.week__range {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-muted);
}

.week__title {
  font-size: 30px;
  line-height: 1.1;
}

.week__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}
</style>
