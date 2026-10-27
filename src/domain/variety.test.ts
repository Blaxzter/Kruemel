import { describe, expect, it } from 'vitest'
import { monthMosaic, weekMatrix } from './variety'
import { BUILTIN_TILES } from './tiles'
import type { Entry, Tile } from './types'

const tiles: Tile[] = BUILTIN_TILES.map((t) => ({ ...t }))
let seq = 0
const e = (tileId: string, dayKey: string): Entry => ({ id: `e${++seq}`, tileId, dayKey, at: 0 })

describe('weekMatrix', () => {
  const entries = [
    e('bread', '2026-10-21'), e('meal', '2026-10-21'),
    e('fruit', '2026-10-27'), e('bread', '2026-10-27'), e('bread', '2026-10-27'),
    e('veg', '2026-10-19'), // outside the window
  ]

  it('builds a tiles x 7 days grid ending today', () => {
    const m = weekMatrix(entries, tiles, '2026-10-27')
    expect(m.days[0]).toBe('2026-10-21')
    expect(m.days[6]).toBe('2026-10-27')
    expect(m.rows.map((r) => r.tileId)).toEqual(BUILTIN_TILES.map((t) => t.id))
    const row = (id: string) => m.rows.find((r) => r.tileId === id)?.days
    expect(row('bread')).toEqual([true, false, false, false, false, false, true])
    expect(row('veg')).toEqual([false, false, false, false, false, false, false])
    expect(m.tilesSeen).toBe(3)
  })

  it('keeps a hidden tile while it has colours in the window, and drops it otherwise', () => {
    const hidden = tiles.map((t) => (t.id === 'meal' || t.id === 'veg' ? { ...t, hidden: true } : t))
    const ids = weekMatrix(entries, hidden, '2026-10-27').rows.map((r) => r.tileId)
    expect(ids).toContain('meal')
    expect(ids).not.toContain('veg')
  })

  it('follows tile order', () => {
    const reordered = tiles.map((t) => (t.id === 'drink' ? { ...t, order: -1 } : t))
    expect(weekMatrix([], reordered, '2026-10-27').rows[0]?.tileId).toBe('drink')
  })
})

describe('monthMosaic', () => {
  it('lays out October 2026 Monday-first with tiles per day', () => {
    const m = monthMosaic([e('sweets', '2026-10-05'), e('fruit', '2026-10-05'), e('bread', '2026-10-28'), e('veg', '2026-09-30')], tiles, '2026-10-27')
    expect([m.year, m.month, m.days.length]).toEqual([2026, 10, 31])
    expect(m.leadingBlanks).toBe(3) // 1 Oct 2026 is a Thursday
    expect((m.leadingBlanks + m.days.length + m.trailingBlanks) % 7).toBe(0)
    expect(m.days[4]?.tileIds).toEqual(['fruit', 'sweets'])
    expect(m.days[26]).toMatchObject({ day: 27, isToday: true, isFuture: false })
    expect(m.days[27]).toMatchObject({ day: 28, isFuture: true, tileIds: [] })
  })

  it('handles February in a leap year and full rows', () => {
    const m = monthMosaic([], tiles, '2028-02-10')
    expect(m.days.length).toBe(29)
    expect(m.leadingBlanks).toBe(1) // 1 Feb 2028 is a Tuesday
    expect(m.trailingBlanks).toBe(5)
    const feb2027 = monthMosaic([], tiles, '2027-02-01')
    expect([feb2027.leadingBlanks, feb2027.trailingBlanks]).toEqual([0, 0])
  })
})
