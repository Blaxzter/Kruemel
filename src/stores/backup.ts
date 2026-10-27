import { db, SETTINGS_ROW_ID } from '@/db/db'
import { i18n } from '@/i18n'
import { localDateKey } from '@/domain/day'
import { sanitizeSettings } from '@/domain/settings'
import type { Entry, Settings, Tile, WaterDay } from '@/domain/types'
import { parseEntry, parseTile, parseWaterDay } from '@/domain/validate'
import { useSettings } from './settings'
import { useTiles } from './tiles'
import { useEntries } from './entries'
import { waterDays } from './water'
import { reloadStores } from './load'

const BACKUP_VERSION = 1
const BACKUP_APP_ID = 'kruemel'

export interface BackupFile {
  version: 1
  settings: Settings
  tiles: Tile[]
  entries: Entry[]
  water: WaterDay[]
  /** Informational only; ignored on import. */
  app?: typeof BACKUP_APP_ID
  exportedAt?: string
}

export interface BackupStore {
  exportBlob(): Promise<Blob>
  importFile(f: File): Promise<void>
}

/**
 * Why an import was refused. The UI maps `code` to a friendly translated message;
 * `message` is for logs only.
 */
export type BackupErrorCode = 'unreadable' | 'not-json' | 'not-a-backup' | 'unsupported-version' | 'invalid-data'

export class BackupError extends Error {
  readonly code: BackupErrorCode
  constructor(code: BackupErrorCode, message: string) {
    super(message)
    this.name = 'BackupError'
    this.code = code
  }
}

/** Suggested download name, e.g. kruemel-backup-2026-10-27.json. */
export function backupFileName(date = new Date()): string {
  return `kruemel-backup-${localDateKey(date)}.json`
}

/**
 * Adds a hidden placeholder tile for every entry whose tile is missing, so such entries are
 * kept (and stay visible in history) instead of making the whole backup unusable. This can
 * happen when a tile was deleted in one tab while another tab logged it.
 */
function withPlaceholderTiles(tiles: readonly Tile[], entries: readonly Entry[]): Tile[] {
  const result = [...tiles]
  const known = new Set(tiles.map((t) => t.id))
  let order = tiles.reduce((max, t) => Math.max(max, t.order), -1)
  for (const e of entries) {
    if (known.has(e.tileId)) continue
    known.add(e.tileId)
    order += 1
    result.push({
      id: e.tileId,
      builtinKey: null,
      name: i18n.global.t('tiles.placeholder'),
      icon: 'bowl',
      color: 'latte',
      order,
      hidden: true,
    })
  }
  return result
}

function createBackup(): BackupFile {
  const entries = useEntries().entries.value.map((e) => ({ ...e }))
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: { ...useSettings().settings.value },
    tiles: withPlaceholderTiles(useTiles().tiles.value.map((t) => ({ ...t })), entries),
    entries,
    water: waterDays(),
  }
}

async function exportBlob(): Promise<Blob> {
  return new Blob([JSON.stringify(createBackup(), null, 2)], { type: 'application/json' })
}

function parseList<T>(value: unknown, field: string, parse: (v: unknown) => T | null, key: (t: T) => string): T[] {
  if (!Array.isArray(value)) throw new BackupError('not-a-backup', `"${field}" is not a list`)
  const seen = new Set<string>()
  return value.map((raw, i) => {
    const item = parse(raw)
    if (!item) throw new BackupError('invalid-data', `${field}[${i}] is invalid`)
    const k = key(item)
    if (seen.has(k)) throw new BackupError('invalid-data', `${field}[${i}] is a duplicate (${k})`)
    seen.add(k)
    return item
  })
}

/** Validates backup JSON text. Throws BackupError; never partially accepts a file. */
export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('not-json', 'File is not valid JSON')
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data) || !('version' in data)) {
    throw new BackupError('not-a-backup', 'File is not a diary backup')
  }
  const raw = data as Record<string, unknown>
  if (raw.version !== BACKUP_VERSION) {
    throw new BackupError('unsupported-version', `Unsupported backup version: ${String(raw.version)}`)
  }
  if (typeof raw.settings !== 'object' || raw.settings === null) {
    throw new BackupError('not-a-backup', '"settings" is missing')
  }
  const tiles = parseList(raw.tiles, 'tiles', parseTile, (t) => t.id)
  const entries = parseList(raw.entries, 'entries', parseEntry, (e) => e.id)
  const water = parseList(raw.water, 'water', parseWaterDay, (w) => w.dayKey)
  return {
    version: BACKUP_VERSION,
    settings: sanitizeSettings(raw.settings),
    tiles: withPlaceholderTiles(tiles, entries),
    entries,
    water,
  }
}

async function readText(f: Blob): Promise<string> {
  try {
    if (typeof f.text === 'function') return await f.text()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error ?? new Error('read failed'))
      reader.readAsText(f)
    })
  } catch {
    throw new BackupError('unreadable', 'File could not be read')
  }
}

/** Reads and validates a backup file without changing anything (e.g. to show counts before confirming). */
export async function readBackupFile(f: Blob): Promise<BackupFile> {
  return parseBackup(await readText(f))
}

/** Replaces the whole diary with the backup, atomically, then reloads every store. */
async function restoreBackup(backup: BackupFile): Promise<void> {
  await db.transaction('rw', [db.settings, db.tiles, db.entries, db.water], async () => {
    await Promise.all([db.settings.clear(), db.tiles.clear(), db.entries.clear(), db.water.clear()])
    await db.settings.add({ id: SETTINGS_ROW_ID, value: { ...backup.settings } })
    await db.tiles.bulkAdd(backup.tiles)
    await db.entries.bulkAdd(backup.entries)
    await db.water.bulkAdd(backup.water.filter((w) => w.glasses > 0))
  })
  await reloadStores()
}

async function importFile(f: File): Promise<void> {
  await restoreBackup(await readBackupFile(f))
}

export function useBackup(): BackupStore {
  return { exportBlob, importFile }
}
