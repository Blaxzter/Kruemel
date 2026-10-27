import type { Settings } from './types'

/** A diary day as local `YYYY-MM-DD`. */
export type DayKey = string

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86_400_000

const pad = (n: number): string => String(n).padStart(2, '0')

/** Local YYYY-MM-DD of a date. */
export function localDateKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Diary day of a moment: the local date of `date - dayStartHour hours`.
 * With dayStartHour 4, a snack at 00:30 belongs to the previous day.
 *
 * Works on local wall-clock fields instead of subtracting milliseconds, so DST days
 * (23 or 25 hours long) still switch exactly at the chosen local hour.
 */
export function dayKey(date: Date, dayStartHour: Settings['dayStartHour']): DayKey {
  if (date.getHours() >= dayStartHour) return localDateKey(date)
  // Noon of the previous calendar day is never skipped or repeated by DST.
  return localDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 12))
}

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== 'string') return false
  const m = DAY_KEY_RE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const probe = new Date(Date.UTC(y, mo - 1, d))
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d
}

function parts(key: DayKey): [number, number, number] {
  const m = DAY_KEY_RE.exec(key)
  if (!m) throw new RangeError(`Invalid day key: ${key}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** Local noon of a day key: safe for formatting and weekday lookups on any DST day. */
export function dayKeyToDate(key: DayKey): Date {
  const [y, m, d] = parts(key)
  return new Date(y, m - 1, d, 12)
}

/** Shifts a day key by whole calendar days (timezone independent). */
export function addDays(key: DayKey, days: number): DayKey {
  const [y, m, d] = parts(key)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** Calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: DayKey, to: DayKey): number {
  const [y1, m1, d1] = parts(from)
  const [y2, m2, d2] = parts(to)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / MS_PER_DAY)
}

/** The last `count` day keys ending with `today`, oldest first. */
export function lastDays(today: DayKey, count = 7): DayKey[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)))
}

/** 0 = Monday ... 6 = Sunday (the design's week starts on Monday). */
export function mondayIndex(key: DayKey): number {
  const [y, m, d] = parts(key)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}
