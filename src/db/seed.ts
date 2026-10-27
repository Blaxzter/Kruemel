import { DEFAULT_SETTINGS } from '@/domain/settings'
import { BUILTIN_TILES } from '@/domain/tiles'
import { SETTINGS_ROW_ID, type KruemelDB } from './db'

/**
 * Makes sure the settings row and every builtin tile exist. Idempotent and safe to run on
 * every start: existing rows are never touched, so renames, colours, order and hidden flags
 * survive. Builtins are only ever hidden (never deleted), so a missing one means a fresh
 * database, an older backup, or a builtin added in a later app version; it is appended.
 */
export async function ensureSeeded(db: KruemelDB): Promise<void> {
  await db.transaction('rw', db.settings, db.tiles, async () => {
    if (!(await db.settings.get(SETTINGS_ROW_ID))) {
      await db.settings.add({ id: SETTINGS_ROW_ID, value: { ...DEFAULT_SETTINGS } })
    }
    const existing = await db.tiles.toArray()
    const ids = new Set(existing.map((t) => t.id))
    const missing = BUILTIN_TILES.filter((t) => !ids.has(t.id))
    if (missing.length === 0) return
    const fresh = existing.length === 0
    let order = existing.reduce((max, t) => Math.max(max, t.order), -1) + 1
    await db.tiles.bulkAdd(missing.map((t) => ({ ...t, order: fresh ? t.order : order++ })))
  })
}
