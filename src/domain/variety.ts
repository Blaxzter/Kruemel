// Data for the Vielfalt page (/vielfalt) and the "Deine Vielfalt" card on the Week screen.
// Both count tiles the same way (weekMatrix), so the card and the page always agree.
// Purely descriptive: it records which tiles appeared, never what is "missing".
import { addDays, lastDays, mondayIndex, type DayKey } from './day'
import { tileDotVar } from './tiles'
import type { Entry, Tile } from './types'

interface WeekRow {
  tileId: string
  /** One flag per day of `WeekMatrix.days`: did this tile appear that day? */
  days: boolean[]
}

export interface WeekMatrix {
  /** Day keys, oldest first; the last one is today. */
  days: DayKey[]
  rows: WeekRow[]
  /** Number of tiles that appeared at least once in the window. */
  tilesSeen: number
}

/** Map of dayKey -> set of tile ids logged that day. */
function tilesByDay(entries: readonly Entry[]): Map<DayKey, Set<string>> {
  const map = new Map<DayKey, Set<string>>()
  for (const e of entries) {
    let set = map.get(e.dayKey)
    if (!set) map.set(e.dayKey, (set = new Set()))
    set.add(e.tileId)
  }
  return map
}

/**
 * Tiles shown on the Vielfalt card and page, in tile order: visible tiles plus hidden tiles that
 * appear in the given days (so hiding a tile never erases its history colours).
 */
function relevantTiles(tiles: readonly Tile[], byDay: Map<DayKey, Set<string>>, days: readonly DayKey[]): Tile[] {
  const used = new Set<string>()
  for (const d of days) for (const id of byDay.get(d) ?? []) used.add(id)
  return tiles.filter((t) => !t.hidden || used.has(t.id)).sort((a, b) => a.order - b.order)
}

/** Tiles x last `count` days grid, ending with today. */
export function weekMatrix(entries: readonly Entry[], tiles: readonly Tile[], today: DayKey, count = 7): WeekMatrix {
  const days = lastDays(today, count)
  const byDay = tilesByDay(entries)
  const rows = relevantTiles(tiles, byDay, days).map((t) => ({
    tileId: t.id,
    days: days.map((d) => byDay.get(d)?.has(t.id) ?? false),
  }))
  return { days, rows, tilesSeen: rows.filter((r) => r.days.some(Boolean)).length }
}

/** One petal of the Vielfalt rosette on the Week screen: one row of the week matrix. */
export interface Petal {
  id: string
  label: string
  /** CSS colour of the tile's dot. */
  dot: string
  /** Logged at least once in the last `days` days. */
  filled: boolean
}

/**
 * One petal per row of `weekMatrix`, in tile order: every visible tile, plus a hidden tile that
 * was logged in the window (so hiding a tile never erases its colour, and it never stays open).
 */
export function varietyPetals(
  entries: readonly Entry[],
  tiles: readonly Tile[],
  today: DayKey,
  label: (tile: Tile) => string,
  days = 7,
): Petal[] {
  const byId = new Map(tiles.map((t) => [t.id, t]))
  return weekMatrix(entries, tiles, today, days).rows.flatMap((row) => {
    const tile = byId.get(row.tileId)
    return tile ? [{ id: tile.id, label: label(tile), dot: tileDotVar(tile.color), filled: row.days.some(Boolean) }] : []
  })
}

interface MosaicDay {
  dayKey: DayKey
  /** Day of month, 1..31. */
  day: number
  isToday: boolean
  isFuture: boolean
  /** Tile ids logged that day, in tile order (empty for future days). */
  tileIds: string[]
}

export interface MonthMosaic {
  year: number
  /** 1..12 */
  month: number
  /** Empty cells before day 1 in a Monday-first grid. */
  leadingBlanks: number
  /** Empty cells after the last day to complete the final week row. */
  trailingBlanks: number
  days: MosaicDay[]
}

/** Calendar of the month that contains `today`, with the tiles logged on each day. */
export function monthMosaic(entries: readonly Entry[], tiles: readonly Tile[], today: DayKey): MonthMosaic {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  const first = `${today.slice(0, 7)}-01`
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const keys = Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))
  const byDay = tilesByDay(entries)
  const ordered = relevantTiles(tiles, byDay, keys)

  const days = keys.map((key, i): MosaicDay => {
    const isFuture = key > today
    const logged = byDay.get(key)
    return {
      dayKey: key,
      day: i + 1,
      isToday: key === today,
      isFuture,
      tileIds: isFuture || !logged ? [] : ordered.filter((t) => logged.has(t.id)).map((t) => t.id),
    }
  })
  const leadingBlanks = mondayIndex(first)
  return { year, month, leadingBlanks, trailingBlanks: (7 - ((leadingBlanks + daysInMonth) % 7)) % 7, days }
}
