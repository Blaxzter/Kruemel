import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { db, SETTINGS_ROW_ID } from '@/db/db'
import { BUILTIN_TILES } from '@/domain/tiles'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import { setLocale } from '@/i18n'
import { initStores, useEntries, useSettings, useTiles, useToday, useWater } from '.'
import { resetPersistRequest } from './persist'
import { stopToday } from './today'

async function freshDb(): Promise<void> {
  db.close()
  await db.delete()
  resetPersistRequest()
  await initStores()
}

/** Simulates an app restart: memory is rebuilt from IndexedDB only. */
const restart = (): Promise<void> => initStores()

function mockStorage(persisted = false) {
  const storage = { persisted: vi.fn(async () => persisted), persist: vi.fn(async () => true) }
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
  return storage
}

beforeEach(async () => {
  mockStorage()
  await freshDb()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('initStores', () => {
  it('seeds builtin tiles in order and default settings on first run', async () => {
    const { tiles, visibleTiles } = useTiles()
    expect(tiles.value.map((t) => t.id)).toEqual(['fruit', 'veg', 'bread', 'meal', 'snack', 'sweets', 'dairy', 'drink'])
    expect(visibleTiles.value).toHaveLength(8)
    expect(useSettings().settings.value).toEqual(DEFAULT_SETTINGS)
    expect(useSettings().ready.value).toBe(true)
    expect((await db.settings.get(SETTINGS_ROW_ID))?.value).toEqual(DEFAULT_SETTINGS)
  })

  it('does not reseed or duplicate on later starts and keeps user changes', async () => {
    const { tiles, updateTile } = useTiles()
    await updateTile('fruit', { name: 'Äpfel', color: 'lemon' })
    await useSettings().update({ name: 'Mia' })
    await restart()
    await restart()
    expect(await db.tiles.count()).toBe(8)
    expect(tiles.value[0]).toMatchObject({ id: 'fruit', name: 'Äpfel', color: 'lemon' })
    expect(useSettings().settings.value.name).toBe('Mia')
  })

  it('appends builtins missing from an older database without touching existing rows', async () => {
    await db.tiles.bulkDelete(['dairy', 'drink'])
    await db.tiles.update('fruit', { order: 5 })
    await restart()
    const { tiles } = useTiles()
    expect(tiles.value.map((t) => t.id).slice(-2)).toEqual(['dairy', 'drink'])
    expect(tiles.value.find((t) => t.id === 'fruit')?.order).toBe(5)
    expect(tiles.value.at(-1)?.order).toBe(7) // appended after the highest order (5)
  })

  it('requests persistent storage once onboarding is done', async () => {
    const storage = mockStorage()
    resetPersistRequest()
    await useSettings().update({ name: 'Mia' })
    expect(storage.persist).not.toHaveBeenCalled()
    await useSettings().update({ onboardingDone: true })
    await vi.waitFor(() => expect(storage.persist).toHaveBeenCalledTimes(1))

    resetPersistRequest()
    await restart()
    await vi.waitFor(() => expect(storage.persist).toHaveBeenCalledTimes(2))
  })

  it('does not ask again when storage is already persisted', async () => {
    const storage = mockStorage(true)
    resetPersistRequest()
    await useSettings().update({ onboardingDone: true })
    await vi.waitFor(() => expect(storage.persisted).toHaveBeenCalled())
    expect(storage.persist).not.toHaveBeenCalled()
  })
})

describe('useSettings', () => {
  it('writes through and sanitises values', async () => {
    const { settings, update } = useSettings()
    await update({ dayStartHour: 0, theme: 'dark', locale: 'en' })
    await update({ dayStartHour: 7 as never })
    expect(settings.value).toMatchObject({ dayStartHour: 4, theme: 'dark', locale: 'en' })
    await restart()
    expect(settings.value).toMatchObject({ dayStartHour: 4, theme: 'dark', locale: 'en' })
  })

  it('rolls back memory when the write fails', async () => {
    vi.spyOn(db.settings, 'put').mockRejectedValueOnce(new Error('quota'))
    await expect(useSettings().update({ name: 'X' })).rejects.toThrow('quota')
    expect(useSettings().settings.value.name).toBe('')
  })
})

describe('useTiles', () => {
  const custom = { builtinKey: null, name: ' Müsli ', icon: 'bowl', color: 'butter', hidden: false } as const

  it('adds custom tiles at the end and persists them', async () => {
    const { addTile, tiles } = useTiles()
    const t = await addTile(custom)
    expect(t).toMatchObject({ name: 'Müsli', order: 8, builtinKey: null })
    await restart()
    expect(tiles.value.at(-1)).toEqual(t)
  })

  it('updates without changing the id; an empty rename restores the builtin name', async () => {
    const { updateTile, tiles, tileLabel } = useTiles()
    await updateTile('veg', { id: 'hack', name: 'Grünzeug' })
    expect(tiles.value.find((t) => t.id === 'veg')?.name).toBe('Grünzeug')
    await updateTile('veg', { name: '   ' })
    const veg = tiles.value.find((t) => t.id === 'veg')
    expect(veg?.name).toBeNull()
    expect(veg && tileLabel(veg)).toBe('Gemüse')
  })

  it('labels builtins via i18n and follows the locale', async () => {
    const { tiles, tileLabel } = useTiles()
    const drink = tiles.value.find((t) => t.id === 'drink')
    if (!drink) throw new Error('missing builtin')
    expect(tileLabel(drink)).toBe('Kaffee & Tee')
    setLocale('en')
    expect(tileLabel(drink)).toBe('Coffee & tea')
    setLocale('de')
  })

  it('moves tiles up and down and keeps orders dense', async () => {
    const { moveTile, tiles } = useTiles()
    await moveTile('veg', -1)
    expect(tiles.value.slice(0, 2).map((t) => t.id)).toEqual(['veg', 'fruit'])
    await moveTile('veg', -1) // already first: no-op
    await moveTile('drink', 1) // already last: no-op
    await moveTile('fruit', 1)
    expect(tiles.value.slice(0, 3).map((t) => t.id)).toEqual(['veg', 'bread', 'fruit'])
    expect(tiles.value.map((t) => t.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    await restart()
    expect(tiles.value.slice(0, 3).map((t) => t.id)).toEqual(['veg', 'bread', 'fruit'])
  })

  describe('deleteTile', () => {
    it('deletes a custom tile without entries', async () => {
      const { addTile, deleteTile, tiles } = useTiles()
      const t = await addTile(custom)
      await deleteTile(t.id)
      expect(tiles.value.some((x) => x.id === t.id)).toBe(false)
      expect(await db.tiles.get(t.id)).toBeUndefined()
    })

    it('hides a custom tile that has entries, keeping its history', async () => {
      const { addTile, deleteTile, tiles, visibleTiles } = useTiles()
      const t = await addTile(custom)
      await useEntries().addEntry(t.id)
      await deleteTile(t.id)
      expect(tiles.value.find((x) => x.id === t.id)?.hidden).toBe(true)
      expect(visibleTiles.value.some((x) => x.id === t.id)).toBe(false)
      expect(useEntries().entries.value).toHaveLength(1)
      await restart()
      expect(tiles.value.find((x) => x.id === t.id)?.hidden).toBe(true)
    })

    it('hides instead of deleting when another tab logged the tile since this one loaded', async () => {
      const { addTile, deleteTile, tiles } = useTiles()
      const t = await addTile(custom)
      // The other tab's entry is only in the DB, not in this tab's memory.
      await db.entries.add({ id: 'other-tab', tileId: t.id, at: Date.now(), dayKey: '2026-10-27' })
      expect(useEntries().entries.value).toHaveLength(0)
      await deleteTile(t.id)
      expect(tiles.value.find((x) => x.id === t.id)?.hidden).toBe(true)
      expect((await db.tiles.get(t.id))?.hidden).toBe(true)
    })

    it('hides builtin tiles instead of deleting them, and they stay hidden after restart', async () => {
      const { deleteTile, tiles, updateTile } = useTiles()
      await deleteTile('sweets')
      await restart()
      expect(tiles.value.find((t) => t.id === 'sweets')?.hidden).toBe(true)
      await updateTile('sweets', { hidden: false })
      expect(useTiles().visibleTiles.value).toHaveLength(8)
    })
  })
})

describe('useEntries', () => {
  it('adds an entry on the diary day of the current setting', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 28, 0, 30))
    const { addEntry, entries } = useEntries()
    const a = await addEntry('snack', { note: '  Chips ', mood: 'yum' })
    expect(a).toMatchObject({ tileId: 'snack', dayKey: '2026-10-27', note: 'Chips', mood: 'yum' })

    await useSettings().update({ dayStartHour: 0 })
    vi.setSystemTime(new Date(2026, 9, 28, 0, 31))
    const b = await addEntry('fruit', { note: '   ' })
    expect(b.dayKey).toBe('2026-10-28')
    expect('note' in b).toBe(false)
    expect(entries.value.map((e) => e.id)).toEqual([a.id, b.id])
  })

  it('updates and clears note and mood, and removes entries', async () => {
    const { addEntry, updateEntry, removeEntry, entries } = useEntries()
    const e = await addEntry('meal')
    await updateEntry(e.id, { note: 'Suppe', mood: 'ok' })
    expect(entries.value[0]).toMatchObject({ note: 'Suppe', mood: 'ok' })
    await updateEntry(e.id, { note: '', mood: undefined })
    expect(entries.value[0]).toEqual(e)
    await restart()
    expect(entries.value[0]).toEqual(e)
    await removeEntry(e.id)
    await restart()
    expect(entries.value).toEqual([])
  })

  it('restores a removed entry unchanged, once', async () => {
    const { addEntry, removeEntry, restoreEntry, entries } = useEntries()
    const first = await addEntry('fruit', { note: 'Apfel', mood: 'yum' })
    await addEntry('bread')
    const before = [...entries.value]
    await removeEntry(first.id)
    await restoreEntry(first)
    await restoreEntry(first)
    expect(entries.value).toEqual(before)
    await restart()
    expect(entries.value).toEqual(before)
  })

  it('rolls back an add when the DB write fails', async () => {
    vi.spyOn(db.entries, 'add').mockRejectedValueOnce(new Error('boom'))
    await expect(useEntries().addEntry('fruit')).rejects.toThrow('boom')
    expect(useEntries().entries.value).toEqual([])
  })

  it('a failed write undoes only itself, keeping a later write that did save', async () => {
    let fail: (err: Error) => void = () => {}
    vi.spyOn(db.entries, 'add').mockImplementationOnce(
      () => new Promise((_resolve, reject) => (fail = reject)) as ReturnType<typeof db.entries.add>,
    )
    const { addEntry, entries } = useEntries()
    const first = addEntry('fruit')
    const second = await addEntry('bread')
    fail(new Error('quota'))
    await expect(first).rejects.toThrow('quota')
    expect(entries.value.map((e) => e.id)).toEqual([second.id])
    await restart()
    expect(entries.value.map((e) => e.id)).toEqual([second.id])
  })

  it('rolls back a failed remove without losing other changes', async () => {
    const { addEntry, removeEntry, entries } = useEntries()
    const e = await addEntry('fruit')
    vi.spyOn(db.entries, 'delete').mockRejectedValueOnce(new Error('boom'))
    await expect(removeEntry(e.id)).rejects.toThrow('boom')
    expect(entries.value).toEqual([e])
  })
})

describe('useWater', () => {
  it('clamps, persists, and removes the row at 0', async () => {
    const { glassesFor, setGlasses } = useWater()
    expect(glassesFor('2026-10-27')).toBe(0)
    await setGlasses('2026-10-27', 3)
    await setGlasses('2026-10-26', 12)
    expect([glassesFor('2026-10-27'), glassesFor('2026-10-26')]).toEqual([3, 8])
    await restart()
    expect(glassesFor('2026-10-27')).toBe(3)
    await setGlasses('2026-10-27', 0)
    expect(await db.water.get('2026-10-27')).toBeUndefined()
    await setGlasses('2026-10-25', -2)
    expect(glassesFor('2026-10-25')).toBe(0)
  })
})

describe('useToday', () => {
  afterEach(() => stopToday())

  it('rolls over at the day start on the minute tick', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 28, 3, 59, 10))
    stopToday()
    const { todayKey, now } = useToday()
    expect(todayKey.value).toBe('2026-10-27')
    vi.advanceTimersByTime(60_000)
    expect(now.value.getHours()).toBe(4)
    expect(todayKey.value).toBe('2026-10-28')
  })

  it('re-evaluates on visibilitychange and when the day start changes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 27, 23, 0))
    stopToday()
    const { todayKey } = useToday()
    expect(todayKey.value).toBe('2026-10-27')

    // Phone asleep: timers do not fire, the clock moves on.
    vi.setSystemTime(new Date(2026, 9, 28, 9, 0))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(todayKey.value).toBe('2026-10-28')

    vi.setSystemTime(new Date(2026, 9, 29, 2, 0))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(todayKey.value).toBe('2026-10-28')
    vi.useRealTimers()
    await useSettings().update({ dayStartHour: 0 })
    await nextTick()
    expect(todayKey.value).toBe('2026-10-29')
  })
})

describe('builtin catalogue', () => {
  it('matches the SPEC names in German', () => {
    const { tileLabel } = useTiles()
    expect(BUILTIN_TILES.map((t) => tileLabel(t))).toEqual([
      'Obst', 'Gemüse', 'Brot', 'Warmes Essen', 'Snack', 'Süßes', 'Milch & Co', 'Kaffee & Tee',
    ])
  })
})
