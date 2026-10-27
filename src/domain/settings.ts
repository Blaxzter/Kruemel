import type { Settings } from './types'

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  name: '',
  dayStartHour: 4,
  logMode: 'quick',
  showWater: true,
  showTree: true,
  showColors: true,
  theme: 'system',
  locale: 'de',
  treeSeed: 1,
  onboardingDone: false,
}

export const DAY_START_HOURS: readonly Settings['dayStartHour'][] = [0, 3, 4, 5, 6]

export const MAX_GLASSES = 8

/** Random tree seed in 1..999, picked once at onboarding. */
export function randomTreeSeed(): number {
  return 1 + Math.floor(Math.random() * 999)
}

const THEMES: readonly Settings['theme'][] = ['system', 'light', 'dark']
const LOCALES: readonly Settings['locale'][] = ['de', 'en']
const LOG_MODES: readonly Settings['logMode'][] = ['quick', 'describe']

function pick<T>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/**
 * Turns any stored or imported value into valid Settings: unknown fields are dropped,
 * missing or invalid ones fall back to the defaults. Lets old databases and backups
 * gain new settings without a migration.
 */
export function sanitizeSettings(value: unknown): Settings {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const d = DEFAULT_SETTINGS
  const seed = v.treeSeed
  return {
    name: typeof v.name === 'string' ? v.name.slice(0, 60) : d.name,
    dayStartHour: pick(DAY_START_HOURS, v.dayStartHour, d.dayStartHour),
    logMode: pick(LOG_MODES, v.logMode, d.logMode),
    showWater: bool(v.showWater, d.showWater),
    showTree: bool(v.showTree, d.showTree),
    showColors: bool(v.showColors, d.showColors),
    theme: pick(THEMES, v.theme, d.theme),
    locale: pick(LOCALES, v.locale, d.locale),
    treeSeed: typeof seed === 'number' && Number.isInteger(seed) && seed >= 1 && seed <= 999 ? seed : d.treeSeed,
    onboardingDone: bool(v.onboardingDone, d.onboardingDone),
  }
}
