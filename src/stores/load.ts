import { db } from '@/db/db'
import { ensureSeeded } from '@/db/seed'
import { loadEntries } from './entries'
import { loadSettings } from './settings'
import { loadTiles } from './tiles'
import { loadWater } from './water'

/** Seeds missing defaults, then replaces every store's in-memory state with the DB contents. */
export async function reloadStores(): Promise<void> {
  await ensureSeeded(db)
  await Promise.all([loadSettings(), loadTiles(), loadEntries(), loadWater()])
}
