import { localDateKey, type DayKey } from './day'
import type { Entry, PartOfDay } from './types'

export const PARTS_OF_DAY: readonly PartOfDay[] = ['morning', 'midday', 'evening']

/** Part of day for a clock hour: < 11 morning, < 17 midday, else evening. */
export function partOfDayForHour(hour: number): PartOfDay {
  if (hour < 11) return 'morning'
  if (hour < 17) return 'midday'
  return 'evening'
}

/**
 * Part of day of an entry, by the local clock hour of `at`.
 * An entry logged after midnight but before the day start (its dayKey is the previous
 * calendar date) is the late evening of that previous day.
 */
export function partOfDay(entry: Pick<Entry, 'at' | 'dayKey'>): PartOfDay {
  const at = new Date(entry.at)
  if (localDateKey(at) !== entry.dayKey) return 'evening'
  return partOfDayForHour(at.getHours())
}

/** Entries of one diary day, oldest first. */
export function entriesForDay(entries: readonly Entry[], day: DayKey): Entry[] {
  return entries.filter((e) => e.dayKey === day).sort((a, b) => a.at - b.at)
}

/** Entries of one day grouped into morning / midday / evening, each oldest first. */
export function groupByPart(entries: readonly Entry[], day: DayKey): Record<PartOfDay, Entry[]> {
  const groups: Record<PartOfDay, Entry[]> = { morning: [], midday: [], evening: [] }
  for (const e of entriesForDay(entries, day)) groups[partOfDay(e)].push(e)
  return groups
}

/** Number of entries per tile id on one day (for the tile badges). */
export function countsByTile(entries: readonly Entry[], day: DayKey): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const e of entries) {
    if (e.dayKey === day) counts[e.tileId] = (counts[e.tileId] ?? 0) + 1
  }
  return counts
}

/**
 * Recent distinct notes written for a tile, newest first, for the Describe sheet chips.
 * Duplicates are matched case-insensitively and ignoring surrounding whitespace.
 */
export function recentNotes(entries: readonly Entry[], tileId: string, limit = 4): string[] {
  const seen = new Set<string>()
  const notes: string[] = []
  const sorted = entries.filter((e) => e.tileId === tileId && e.note).sort((a, b) => b.at - a.at)
  for (const e of sorted) {
    const note = (e.note ?? '').trim()
    const key = note.toLocaleLowerCase()
    if (!note || seen.has(key)) continue
    seen.add(key)
    notes.push(note)
    if (notes.length >= limit) break
  }
  return notes
}
