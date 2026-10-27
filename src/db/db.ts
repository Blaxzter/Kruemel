import { Dexie, type EntityTable } from 'dexie'
import type { Entry, Settings, Tile, WaterDay } from '@/domain/types'

export const DB_NAME = 'kruemel'

/** Settings live in a single row so they can be read and written atomically. */
export const SETTINGS_ROW_ID = 'app'
export interface SettingsRow {
  id: typeof SETTINGS_ROW_ID
  value: Settings
}

export type KruemelDB = Dexie & {
  settings: EntityTable<SettingsRow, 'id'>
  tiles: EntityTable<Tile, 'id'>
  entries: EntityTable<Entry, 'id'>
  water: EntityTable<WaterDay, 'dayKey'>
}

/**
 * Schema history. Never edit a released version: add a new `db.version(n)` with the
 * changed stores and an `.upgrade()` when existing rows need rewriting.
 */
export function createDb(name = DB_NAME): KruemelDB {
  const db = new Dexie(name) as KruemelDB
  db.version(1).stores({
    settings: 'id',
    tiles: 'id, order',
    entries: 'id, dayKey, tileId, at',
    water: 'dayKey',
  })
  return db
}

export const db = createDb()
