// Tree growth rules. The tree only ever grows: nothing here can decrease over time.
import { daysBetween, type DayKey } from './day'
import type { Entry } from './types'
import type { Season, TimeOfDay } from '@/tree/types'

export const LEAVES_PER_FLOWER = 7
export const LEAVES_PER_APPLE = 30
export const LEAVES_FOR_SWING = 60
/** A day with entries after a gap of at least this many days brings the bird. */
const BIRD_GAP_DAYS = 3

/** Distinct diary days with at least one entry, oldest first. Water alone never counts. */
export function loggedDays(entries: readonly Pick<Entry, 'dayKey'>[]): DayKey[] {
  return [...new Set(entries.map((e) => e.dayKey))].sort()
}

/** One leaf per distinct day with entries. */
export function leafCount(entries: readonly Pick<Entry, 'dayKey'>[]): number {
  return new Set(entries.map((e) => e.dayKey)).size
}

export function flowerCount(leaves: number): number {
  return Math.floor(Math.max(0, leaves) / LEAVES_PER_FLOWER)
}

export function appleCount(leaves: number): number {
  return Math.floor(Math.max(0, leaves) / LEAVES_PER_APPLE)
}

export function hasSwing(leaves: number): boolean {
  return leaves >= LEAVES_FOR_SWING
}

export interface Milestones {
  /** Leaves until the next flower (1..7). */
  toFlower: number
  /** Leaves until the next apple (1..30). */
  toApple: number
  /** True while no apple has grown yet ("erster Apfel" vs "nächster Apfel"). */
  firstApple: boolean
}

export function nextMilestones(leaves: number): Milestones {
  const n = Math.max(0, leaves)
  return {
    toFlower: LEAVES_PER_FLOWER - (n % LEAVES_PER_FLOWER),
    toApple: LEAVES_PER_APPLE - (n % LEAVES_PER_APPLE),
    firstApple: n < LEAVES_PER_APPLE,
  }
}

/**
 * "Welcome back" bird: today has entries and the previous day with entries is at least
 * BIRD_GAP_DAYS calendar days earlier. The very first logged day gets no bird.
 */
export function showBird(entries: readonly Pick<Entry, 'dayKey'>[], today: DayKey): boolean {
  const days = loggedDays(entries)
  if (!days.includes(today)) return false
  const previous = days.filter((d) => d < today).at(-1)
  return previous !== undefined && daysBetween(previous, today) >= BIRD_GAP_DAYS
}

/** The newest leaf is "fresh" (white outline + pop) when today already has an entry. */
export function hasFreshLeaf(entries: readonly Pick<Entry, 'dayKey'>[], today: DayKey): boolean {
  return entries.some((e) => e.dayKey === today)
}

/** Mar to May spring, Jun to Aug summer, Sep to Nov autumn, Dec to Feb winter. */
export function seasonFor(date: Date): Season {
  const month = date.getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

/** 5 to 9 morning, 9 to 17 day, 17 to 21 evening, else night (local clock). */
export function timeOfDayFor(date: Date): TimeOfDay {
  const h = date.getHours()
  if (h >= 5 && h < 9) return 'morning'
  if (h >= 9 && h < 17) return 'day'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

/** Morgen / Mittag / Abend greeting bucket for the Today header (< 11, < 17, else). */
export function greetingFor(date: Date): 'morning' | 'day' | 'evening' {
  const h = date.getHours()
  return h < 11 ? 'morning' : h < 17 ? 'day' : 'evening'
}
