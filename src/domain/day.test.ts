import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { addDays, dayKey, dayKeyToDate, daysBetween, isDayKey, lastDays, localDateKey, mondayIndex } from './day'

// Pin a zone with DST so boundary cases are real. Node applies TZ changes at runtime.
const originalTz = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'Europe/Berlin'
})
afterAll(() => {
  process.env.TZ = originalTz
})

/** Local wall-clock time in the pinned zone. */
const at = (y: number, mo: number, d: number, h: number, mi = 0): Date => new Date(y, mo - 1, d, h, mi)

describe('timezone pin', () => {
  it('is active (winter +1h, summer +2h)', () => {
    expect(new Date('2026-01-15T12:00:00Z').getTimezoneOffset()).toBe(-60)
    expect(new Date('2026-07-15T12:00:00Z').getTimezoneOffset()).toBe(-120)
  })
})

describe('dayKey', () => {
  it('puts a 00:30 snack on the previous day with start 4', () => {
    expect(dayKey(at(2026, 10, 27, 0, 30), 4)).toBe('2026-10-26')
  })

  it('switches exactly at the start hour', () => {
    expect(dayKey(at(2026, 10, 27, 3, 59), 4)).toBe('2026-10-26')
    expect(dayKey(at(2026, 10, 27, 4, 0), 4)).toBe('2026-10-27')
  })

  it('uses the plain calendar date with start 0', () => {
    expect(dayKey(at(2026, 10, 27, 0, 0), 0)).toBe('2026-10-27')
    expect(dayKey(at(2026, 10, 26, 23, 59), 0)).toBe('2026-10-26')
  })

  it.each([3, 5, 6] as const)('honours start %i', (start) => {
    expect(dayKey(at(2026, 5, 10, start - 1, 59), start)).toBe('2026-05-09')
    expect(dayKey(at(2026, 5, 10, start, 0), start)).toBe('2026-05-10')
  })

  it('rolls back across month and year boundaries', () => {
    expect(dayKey(at(2026, 3, 1, 1, 0), 4)).toBe('2026-02-28')
    expect(dayKey(at(2027, 1, 1, 2, 0), 4)).toBe('2026-12-31')
    expect(dayKey(at(2028, 3, 1, 2, 0), 4)).toBe('2028-02-29')
  })

  describe('DST spring forward (2026-03-29, 02:00 -> 03:00)', () => {
    it('03:30 is still the previous day with start 4', () => {
      expect(dayKey(at(2026, 3, 29, 3, 30), 4)).toBe('2026-03-28')
    })
    it('04:10 is the new day even though only 3 real hours passed since midnight', () => {
      expect(dayKey(at(2026, 3, 29, 4, 10), 4)).toBe('2026-03-29')
    })
    it('start 3 switches at 03:00 right after the gap', () => {
      expect(dayKey(new Date('2026-03-29T00:59:00Z'), 3)).toBe('2026-03-28') // 01:59 CET
      expect(dayKey(new Date('2026-03-29T01:00:00Z'), 3)).toBe('2026-03-29') // 03:00 CEST
    })
  })

  describe('DST fall back (2026-10-25, 03:00 -> 02:00)', () => {
    it('both 02:30 occurrences belong to the previous day with start 4', () => {
      expect(dayKey(new Date('2026-10-25T00:30:00Z'), 4)).toBe('2026-10-24') // 02:30 CEST
      expect(dayKey(new Date('2026-10-25T01:30:00Z'), 4)).toBe('2026-10-24') // 02:30 CET
    })
    it('03:59 CET is still the previous day, 04:00 CET the new one', () => {
      expect(dayKey(new Date('2026-10-25T02:59:00Z'), 4)).toBe('2026-10-24')
      expect(dayKey(new Date('2026-10-25T03:00:00Z'), 4)).toBe('2026-10-25')
    })
  })
})

describe('day key helpers', () => {
  it('formats local dates with padding', () => {
    expect(localDateKey(at(2026, 1, 5, 9))).toBe('2026-01-05')
  })

  it('validates keys', () => {
    expect(isDayKey('2026-02-28')).toBe(true)
    expect(isDayKey('2026-02-29')).toBe(false)
    expect(isDayKey('2026-2-28')).toBe(false)
    expect(isDayKey(20260228)).toBe(false)
  })

  it('adds days across DST and year ends', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-25', -1)).toBe('2026-10-24')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('counts calendar days between keys, even over a DST change', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
    expect(daysBetween('2026-10-27', '2026-10-20')).toBe(-7)
  })

  it('lists the last 7 days oldest first', () => {
    expect(lastDays('2026-10-27')).toEqual([
      '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27',
    ])
  })

  it('maps keys to local noon and Monday-first weekdays', () => {
    const d = dayKeyToDate('2026-03-29')
    expect([d.getDate(), d.getHours()]).toEqual([29, 12])
    expect(mondayIndex('2026-10-26')).toBe(0) // Monday
    expect(mondayIndex('2026-10-25')).toBe(6) // Sunday
    expect(mondayIndex('2026-10-01')).toBe(3) // Thursday
  })

  it('rejects malformed keys', () => {
    expect(() => addDays('nope', 1)).toThrow(RangeError)
  })
})
