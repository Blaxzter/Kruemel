import { describe, expect, it } from 'vitest'
import { dayKey } from './day'
import { countsByTile, entriesForDay, groupByPart, partOfDay, partOfDayForHour, recentNotes } from './entries'
import type { Entry } from './types'

let seq = 0
function entry(tileId: string, date: Date, extra: Partial<Entry> = {}, start: 0 | 4 = 4): Entry {
  return { id: `e${++seq}`, tileId, at: date.getTime(), dayKey: dayKey(date, start), ...extra }
}
const t = (h: number, mi = 0, d = 27): Date => new Date(2026, 9, d, h, mi)

describe('partOfDay', () => {
  it('splits by clock hour at 11 and 17', () => {
    expect(partOfDayForHour(10)).toBe('morning')
    expect(partOfDayForHour(11)).toBe('midday')
    expect(partOfDayForHour(16)).toBe('midday')
    expect(partOfDayForHour(17)).toBe('evening')
  })

  it('classifies entries by their local hour', () => {
    expect(partOfDay(entry('a', t(7, 40)))).toBe('morning')
    expect(partOfDay(entry('a', t(13)))).toBe('midday')
    expect(partOfDay(entry('a', t(21)))).toBe('evening')
  })

  it('treats hours before the day start as the evening of the previous day', () => {
    const late = entry('a', t(0, 30, 28))
    expect(late.dayKey).toBe('2026-10-27')
    expect(partOfDay(late)).toBe('evening')
    expect(partOfDay(entry('a', t(3, 59, 28)))).toBe('evening')
  })

  it('keeps 00:30 as morning when the day starts at midnight', () => {
    expect(partOfDay(entry('a', t(0, 30, 28), {}, 0))).toBe('morning')
  })
})

describe('day grouping', () => {
  const list = [
    entry('fruit', t(10, 15)),
    entry('bread', t(7, 40)),
    entry('meal', t(13)),
    entry('snack', t(1, 0, 28)), // late night, still the 27th
    entry('bread', t(8, 0, 26)),
  ]

  it('returns one day sorted by time', () => {
    expect(entriesForDay(list, '2026-10-27').map((e) => e.tileId)).toEqual(['bread', 'fruit', 'meal', 'snack'])
  })

  it('groups into parts of the day', () => {
    const g = groupByPart(list, '2026-10-27')
    expect(g.morning.map((e) => e.tileId)).toEqual(['bread', 'fruit'])
    expect(g.midday.map((e) => e.tileId)).toEqual(['meal'])
    expect(g.evening.map((e) => e.tileId)).toEqual(['snack'])
  })

  it('counts entries per tile for badges', () => {
    const more = [...list, entry('bread', t(9))]
    expect(countsByTile(more, '2026-10-27')).toEqual({ bread: 2, fruit: 1, meal: 1, snack: 1 })
  })
})

describe('recentNotes', () => {
  it('returns distinct notes for the tile, newest first, limited', () => {
    const list = [
      entry('meal', t(12, 0, 20), { note: 'Tomatensuppe' }),
      entry('meal', t(12, 0, 21), { note: 'Nudeln mit Pesto' }),
      entry('meal', t(12, 0, 22), { note: '  tomatensuppe ' }),
      entry('meal', t(12, 0, 23)),
      entry('fruit', t(12, 0, 24), { note: 'Apfel' }),
      entry('meal', t(12, 0, 25), { note: 'Reis mit Gemüse' }),
      entry('meal', t(12, 0, 26), { note: 'Pizza von gestern' }),
      entry('meal', t(12, 0, 27), { note: 'Linsen' }),
    ]
    expect(recentNotes(list, 'meal')).toEqual(['Linsen', 'Pizza von gestern', 'Reis mit Gemüse', 'tomatensuppe'])
    expect(recentNotes(list, 'meal', 2)).toEqual(['Linsen', 'Pizza von gestern'])
    expect(recentNotes(list, 'veg')).toEqual([])
  })
})
