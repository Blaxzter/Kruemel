import { describe, expect, it } from 'vitest'
import { BUILTIN_TILES } from '@/domain/tiles'
import type { Entry, Tile } from '@/domain/types'
import { buildTodayItems, cheerKey, columnPreview, countByTile, formatTime, nextGlasses } from '../todayModel'

const at = (h: number, m = 0): number => new Date(2026, 9, 27, h, m).getTime()
const entry = (id: string, tileId: string, time: number, extra: Partial<Entry> = {}): Entry => ({
  id,
  tileId,
  at: time,
  dayKey: '2026-10-27',
  ...extra,
})

describe('copy selectors', () => {
  it('cheers by count', () => {
    expect([0, 1, 2, 3, 5, 6, 9].map(cheerKey)).toEqual(['none', 'start', 'start', 'going', 'going', 'busy', 'busy'])
  })
})

describe('buildTodayItems', () => {
  const tiles: Tile[] = BUILTIN_TILES.map((t) => ({ ...t }))
  const label = (t: Tile): string => t.name ?? t.id

  it('keeps only today, resolves tiles, sorts by time and skips unknown tiles', () => {
    const items = buildTodayItems(
      [
        entry('3', 'fruit', at(10, 15)),
        entry('1', 'bread', at(7, 40)),
        entry('x', 'gone', at(8)),
        entry('old', 'veg', at(9), { dayKey: '2026-10-26' }),
        entry('4', 'meal', at(18)),
      ],
      '2026-10-27',
      tiles,
      label,
    )
    expect(items.map((i) => [i.id, i.label, i.color, i.part])).toEqual([
      ['1', 'bread', 'butter', 'morning'],
      ['3', 'fruit', 'coral', 'morning'],
      ['4', 'meal', 'apricot', 'evening'],
    ])
    expect(countByTile(items)).toEqual({ bread: 1, fruit: 1, meal: 1 })
  })

  it('puts a snack after midnight but before the day start into the evening of the diary day', () => {
    const late = entry('late', 'snack', new Date(2026, 9, 28, 0, 30).getTime())
    const items = buildTodayItems([late], '2026-10-27', tiles, label)
    expect(items.map((i) => i.part)).toEqual(['evening'])
  })
})

describe('columnPreview', () => {
  it('shows up to 3, else 2 + "+N mehr"', () => {
    expect(columnPreview([1, 2, 3])).toEqual({ shown: [1, 2, 3], more: 0 })
    expect(columnPreview([1, 2, 3, 4, 5])).toEqual({ shown: [1, 2], more: 3 })
  })
})

describe('nextGlasses', () => {
  it('fills up to the tapped glass and unsets the last filled one', () => {
    expect(nextGlasses(0, 3)).toBe(3)
    expect(nextGlasses(3, 3)).toBe(2)
    expect(nextGlasses(3, 1)).toBe(1)
    expect(nextGlasses(1, 1)).toBe(0)
  })
})

describe('formatTime', () => {
  it('shows 24h times in both languages', () => {
    expect(formatTime(at(19, 40), 'de')).toBe('19:40')
    expect(formatTime(at(19, 40), 'en')).toBe('19:40')
  })
})
