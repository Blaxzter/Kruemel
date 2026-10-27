import { describe, expect, it } from 'vitest'
import { newId } from './id'
import { DEFAULT_SETTINGS, randomTreeSeed, sanitizeSettings } from './settings'
import { BUILTIN_TILES } from './tiles'
import { parseEntry, parseTile, parseWaterDay } from './validate'

describe('sanitizeSettings', () => {
  it('fills defaults for missing or invalid values and drops unknown fields', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    const s = sanitizeSettings({ name: 'Mia', dayStartHour: 2, theme: 'neon', locale: 'en', treeSeed: 0, extra: 1 })
    expect(s).toEqual({ ...DEFAULT_SETTINGS, name: 'Mia', locale: 'en' })
    expect('extra' in s).toBe(false)
  })

  it('keeps valid values', () => {
    const v = { ...DEFAULT_SETTINGS, dayStartHour: 0, logMode: 'describe', showWater: false, theme: 'dark', treeSeed: 999, onboardingDone: true }
    expect(sanitizeSettings(v)).toEqual(v)
  })

  it('picks tree seeds in 1..999', () => {
    for (let i = 0; i < 200; i++) {
      const seed = randomTreeSeed()
      expect(Number.isInteger(seed) && seed >= 1 && seed <= 999).toBe(true)
    }
  })
})

describe('record parsers', () => {
  it('accepts builtin and custom tiles', () => {
    for (const t of BUILTIN_TILES) expect(parseTile(t)).toEqual(t)
    const custom = { id: newId(), builtinKey: null, name: 'Müsli', icon: 'bowl', color: 'butter', order: 9, hidden: false }
    expect(parseTile({ ...custom, junk: true })).toEqual(custom)
  })

  it('rejects broken tiles', () => {
    const ok = BUILTIN_TILES[0]
    expect(parseTile({ ...ok, icon: 'banana' })).toBeNull()
    expect(parseTile({ ...ok, color: '#fff' })).toBeNull()
    expect(parseTile({ ...ok, hidden: 'no' })).toBeNull()
    expect(parseTile({ ...ok, id: '' })).toBeNull()
    expect(parseTile([ok])).toBeNull()
  })

  it('only accepts builtinKeys of real builtin tiles', () => {
    const ok = BUILTIN_TILES[0]
    expect(parseTile({ ...ok, builtinKey: 'tiles.manage.moveUp' })).toBeNull()
    expect(parseTile({ ...ok, builtinKey: 'settings' })).toBeNull()
    expect(parseTile({ ...ok, builtinKey: 'x', name: null })).toBeNull()
    expect(parseTile({ ...ok, builtinKey: null, name: null })).toBeNull()
    expect(parseTile({ ...ok, builtinKey: 'tiles.manage.moveUp', name: 'Müsli' })).toEqual({ ...ok, builtinKey: null, name: 'Müsli' })
  })

  it('accepts entries with optional note and mood, rejects bad ones', () => {
    const ok = { id: 'x', tileId: 'fruit', at: 1_700_000_000_000, dayKey: '2026-10-27' }
    expect(parseEntry(ok)).toEqual(ok)
    expect(parseEntry({ ...ok, note: 'Apfel', mood: 'yum' })).toEqual({ ...ok, note: 'Apfel', mood: 'yum' })
    expect(parseEntry({ ...ok, mood: 'great' })).toBeNull()
    expect(parseEntry({ ...ok, dayKey: '27.10.2026' })).toBeNull()
    expect(parseEntry({ ...ok, at: '2026' })).toBeNull()
    expect(parseEntry({ ...ok, note: 'x'.repeat(501) })).toBeNull()
  })

  it('accepts water days in 0..8', () => {
    expect(parseWaterDay({ dayKey: '2026-10-27', glasses: 8 })).toEqual({ dayKey: '2026-10-27', glasses: 8 })
    expect(parseWaterDay({ dayKey: '2026-10-27', glasses: 9 })).toBeNull()
    expect(parseWaterDay({ dayKey: '2026-10-27', glasses: 1.5 })).toBeNull()
  })

  it('generates v4 uuids', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
