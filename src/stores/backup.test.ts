import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/db'
import { BackupError, initStores, readBackupFile, useBackup, useEntries, useSettings, useTiles, useWater, type BackupFile } from '.'
import { backupFileName, parseBackup } from './backup'

async function freshDb(): Promise<void> {
  db.close()
  await db.delete()
  await initStores()
}

const file = (content: string): File => new File([content], 'backup.json', { type: 'application/json' })

async function fillDiary(): Promise<void> {
  await useSettings().update({ name: 'Mia', dayStartHour: 5, theme: 'dark', treeSeed: 321, onboardingDone: true })
  const { addTile, updateTile, moveTile, deleteTile } = useTiles()
  const muesli = await addTile({ builtinKey: null, name: 'Müsli', icon: 'bowl', color: 'butter', hidden: false })
  await updateTile('fruit', { name: 'Äpfel' })
  await moveTile('drink', -1)
  await deleteTile('sweets')
  const { addEntry } = useEntries()
  await addEntry(muesli.id, { note: 'mit Beeren', mood: 'yum' })
  await addEntry('fruit')
  await useWater().setGlasses('2026-10-27', 4)
}

function snapshot() {
  return {
    settings: { ...useSettings().settings.value },
    tiles: useTiles().tiles.value.map((t) => ({ ...t })),
    entries: useEntries().entries.value.map((e) => ({ ...e })),
    water: useWater().glassesFor('2026-10-27'),
  }
}

async function expectCode(content: string, code: BackupError['code']): Promise<void> {
  const err = await useBackup().importFile(file(content)).catch((e: unknown) => e)
  expect(err).toBeInstanceOf(BackupError)
  expect((err as BackupError).code).toBe(code)
}

beforeEach(freshDb)

describe('backup', () => {
  it('exports versioned JSON', async () => {
    await fillDiary()
    const blob = await useBackup().exportBlob()
    expect(blob.type).toBe('application/json')
    const data = JSON.parse(await blob.text()) as BackupFile
    expect(data.version).toBe(1)
    expect(data.app).toBe('kruemel')
    expect(data.tiles).toHaveLength(9)
    expect(data.entries).toHaveLength(2)
    expect(data.water).toEqual([{ dayKey: '2026-10-27', glasses: 4 }])
    expect(data.settings.name).toBe('Mia')
  })

  it('round-trips the whole diary through a file', async () => {
    await fillDiary()
    const before = snapshot()
    const text = await (await useBackup().exportBlob()).text()

    await freshDb()
    expect(useEntries().entries.value).toHaveLength(0)

    await useBackup().importFile(file(text))
    expect(snapshot()).toEqual(before)
    // Persisted too, not only in memory.
    await initStores()
    expect(snapshot()).toEqual(before)
  })

  it('replaces existing data instead of merging', async () => {
    await fillDiary()
    const text = await (await useBackup().exportBlob()).text()
    await useEntries().addEntry('veg')
    await useWater().setGlasses('2026-10-20', 2)
    await useBackup().importFile(file(text))
    expect(useEntries().entries.value.some((e) => e.tileId === 'veg')).toBe(false)
    expect(useWater().glassesFor('2026-10-20')).toBe(0)
  })

  it('re-adds builtin tiles missing from an older backup', async () => {
    const data = JSON.parse(await (await useBackup().exportBlob()).text()) as BackupFile
    data.tiles = data.tiles.filter((t) => t.id !== 'drink')
    await useBackup().importFile(file(JSON.stringify(data)))
    expect(useTiles().tiles.value.map((t) => t.id)).toContain('drink')
  })

  it('keeps entries whose tile is missing, under a hidden placeholder tile', async () => {
    const data = JSON.parse(await (await useBackup().exportBlob()).text()) as BackupFile
    data.entries = [{ id: 'e1', tileId: 'ghost', at: 1, dayKey: '2026-10-27' }]
    await useBackup().importFile(file(JSON.stringify(data)))
    expect(useEntries().entries.value.map((e) => e.tileId)).toEqual(['ghost'])
    const ghost = useTiles().tiles.value.find((t) => t.id === 'ghost')
    expect(ghost).toMatchObject({ builtinKey: null, name: 'Alte Kachel', hidden: true })
    expect(useTiles().visibleTiles.value.some((t) => t.id === 'ghost')).toBe(false)
  })

  it('exports an importable file even when an entry lost its tile (e.g. deleted in another tab)', async () => {
    const soup = await useTiles().addTile({ builtinKey: null, name: 'Suppe', icon: 'bowl', color: 'mint', hidden: false })
    await useEntries().addEntry(soup.id)
    await db.tiles.delete(soup.id)
    await initStores()
    const text = await (await useBackup().exportBlob()).text()
    const data = JSON.parse(text) as BackupFile
    expect(data.tiles.find((t) => t.id === soup.id)?.hidden).toBe(true)
    await freshDb()
    await useBackup().importFile(file(text))
    expect(useEntries().entries.value.map((e) => e.tileId)).toEqual([soup.id])
  })

  it('previews a file without changing anything', async () => {
    await fillDiary()
    const text = await (await useBackup().exportBlob()).text()
    await freshDb()
    const preview = await readBackupFile(file(text))
    expect(preview.entries).toHaveLength(2)
    expect(useEntries().entries.value).toHaveLength(0)
  })

  describe('rejects bad files with a clear code and leaves data untouched', () => {
    const valid = (): BackupFile => JSON.parse(JSON.stringify({
      version: 1,
      settings: { name: 'X' },
      tiles: [{ id: 'fruit', builtinKey: 'tiles.fruit', name: null, icon: 'apple', color: 'coral', order: 0, hidden: false }],
      entries: [{ id: 'e1', tileId: 'fruit', at: 1, dayKey: '2026-10-27' }],
      water: [],
    })) as BackupFile

    beforeEach(fillDiary)

    it.each([
      ['not JSON', 'hello', 'not-json'],
      ['a JSON array', '[]', 'not-a-backup'],
      ['an unrelated object', '{"foo":1}', 'not-a-backup'],
      ['a future version', JSON.stringify({ ...valid(), version: 2 }), 'unsupported-version'],
      ['missing lists', JSON.stringify({ version: 1, settings: {} }), 'not-a-backup'],
      ['a broken entry', JSON.stringify({ ...valid(), entries: [{ id: 'e1', tileId: 'fruit', at: 'x', dayKey: '2026-10-27' }] }), 'invalid-data'],
      ['duplicate ids', JSON.stringify({ ...valid(), entries: [valid().entries[0], valid().entries[0]] }), 'invalid-data'],
      ['bad water', JSON.stringify({ ...valid(), water: [{ dayKey: '2026-10-27', glasses: 20 }] }), 'invalid-data'],
    ] as const)('%s', async (_label, content, code) => {
      const before = snapshot()
      await expectCode(content, code)
      expect(snapshot()).toEqual(before)
      await initStores()
      expect(snapshot()).toEqual(before)
    })
  })

  it('sanitises settings from the file', () => {
    const parsed = parseBackup(JSON.stringify({ version: 1, settings: { theme: 'neon', name: 'N' }, tiles: [], entries: [], water: [] }))
    expect(parsed.settings).toMatchObject({ theme: 'system', name: 'N', dayStartHour: 4 })
  })

  it('suggests a dated file name', () => {
    expect(backupFileName(new Date(2026, 9, 27, 12))).toBe('kruemel-backup-2026-10-27.json')
  })
})
