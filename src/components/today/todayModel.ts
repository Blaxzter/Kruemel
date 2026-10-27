// Pure helpers for the Today screen. No Vue, no stores: easy to unit test.
// Day, part-of-day and growth rules live in @/domain; this file only shapes them for display.
import { PARTS_OF_DAY, partOfDay } from '@/domain'
import type { Entry, PartOfDay, Settings, Tile, TileColor } from '@/domain/types'

export const PARTS: readonly PartOfDay[] = PARTS_OF_DAY

/** Max rows a summary column shows before collapsing to 2 rows + "+N mehr". */
const MAX_COLUMN_ITEMS = 3

export type CheerKey = 'none' | 'start' | 'going' | 'busy'

export function cheerKey(total: number): CheerKey {
  if (total === 0) return 'none'
  if (total < 3) return 'start'
  if (total < 6) return 'going'
  return 'busy'
}

/** One logged thing, ready to display. */
export interface TodayItem {
  id: string
  tileId: string
  label: string
  color: TileColor
  at: number
  part: PartOfDay
}

/**
 * Today's entries, oldest first, resolved against tiles (hidden tiles too, so history keeps
 * its label). Entries whose tile no longer exists are skipped.
 */
export function buildTodayItems(
  entries: readonly Entry[],
  todayKey: string,
  tiles: readonly Tile[],
  labelOf: (t: Tile) => string,
): TodayItem[] {
  const byId = new Map(tiles.map((t) => [t.id, t]))
  const items: TodayItem[] = []
  for (const e of entries) {
    if (e.dayKey !== todayKey) continue
    const tile = byId.get(e.tileId)
    if (!tile) continue
    items.push({ id: e.id, tileId: e.tileId, label: labelOf(tile), color: tile.color, at: e.at, part: partOfDay(e) })
  }
  return items.sort((a, b) => a.at - b.at)
}

export function countByTile(items: readonly Pick<TodayItem, 'tileId'>[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) counts[item.tileId] = (counts[item.tileId] ?? 0) + 1
  return counts
}

/** Rows a summary column shows and how many are folded into "+N mehr". */
export function columnPreview<T>(items: readonly T[]): { shown: T[]; more: number } {
  if (items.length <= MAX_COLUMN_ITEMS) return { shown: [...items], more: 0 }
  return { shown: items.slice(0, MAX_COLUMN_ITEMS - 1), more: items.length - (MAX_COLUMN_ITEMS - 1) }
}

/** Next glass count when glass number `n` (1-based) is tapped: tapping the last filled one unsets it. */
export function nextGlasses(current: number, n: number): number {
  return current === n ? n - 1 : n
}

const INTL_LOCALES: Record<Settings['locale'], string> = { de: 'de-DE', en: 'en-GB' }

export function intlLocale(locale: string): string {
  return INTL_LOCALES[locale as Settings['locale']] ?? locale
}

/** e.g. "Dienstag, 27. Oktober". */
export function formatDateLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(intlLocale(locale), { weekday: 'long', day: 'numeric', month: 'long' })
}

/** e.g. "7:40". */
export function formatTime(at: number | Date, locale: string): string {
  return new Date(at).toLocaleTimeString(intlLocale(locale), { hour: 'numeric', minute: '2-digit' })
}
