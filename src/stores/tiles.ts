import { computed, shallowRef, type ComputedRef, type Ref } from 'vue'
import { db } from '@/db/db'
import { i18n } from '@/i18n'
import { newId } from '@/domain/id'
import type { Tile } from '@/domain/types'
import { entriesState } from './entries'

/** All tiles including hidden ones, always sorted by `order`. */
const tiles = shallowRef<Tile[]>([])

const visibleTiles = computed(() => tiles.value.filter((t) => !t.hidden))

export interface TilesStore {
  tiles: Readonly<Ref<Tile[]>>
  visibleTiles: ComputedRef<Tile[]>
  addTile(t: Omit<Tile, 'id' | 'order'>): Promise<Tile>
  updateTile(id: string, patch: Partial<Tile>): Promise<void>
  moveTile(id: string, dir: -1 | 1): Promise<void>
  deleteTile(id: string): Promise<void>
  /** Display name: custom `name` wins, else the i18n builtin name. */
  tileLabel(t: Tile): string
}

const byOrder = (a: Tile, b: Tile): number => a.order - b.order

/** Sets memory, runs the DB write, and restores the previous list if the write fails. */
async function commit(next: Tile[], write: () => Promise<unknown>): Promise<void> {
  const prev = tiles.value
  tiles.value = next
  try {
    await write()
  } catch (err) {
    if (tiles.value === next) tiles.value = prev
    throw err
  }
}

async function addTile(t: Omit<Tile, 'id' | 'order'>): Promise<Tile> {
  const order = tiles.value.reduce((max, x) => Math.max(max, x.order), -1) + 1
  const tile: Tile = {
    id: newId(),
    builtinKey: t.builtinKey,
    name: t.name?.trim() || null,
    icon: t.icon,
    color: t.color,
    order,
    hidden: t.hidden,
  }
  await commit([...tiles.value, tile], () => db.tiles.add({ ...tile }))
  return tile
}

async function updateTile(id: string, patch: Partial<Tile>): Promise<void> {
  const current = tiles.value.find((t) => t.id === id)
  if (!current) return
  const updated: Tile = { ...current, ...patch, id }
  // An empty rename falls back to the builtin name.
  if ('name' in patch) updated.name = patch.name?.trim() || null
  const next = tiles.value.map((t) => (t.id === id ? updated : t)).sort(byOrder)
  await commit(next, () => db.tiles.put({ ...updated }))
}

/** Swaps a tile with its neighbour in the full (hidden included) order, then renumbers 0..n-1. */
async function moveTile(id: string, dir: -1 | 1): Promise<void> {
  const list = [...tiles.value]
  const i = list.findIndex((t) => t.id === id)
  const j = i + dir
  const a = list[i]
  const b = list[j]
  if (i < 0 || !a || !b) return
  list[i] = b
  list[j] = a
  const next = list.map((t, order) => (t.order === order ? t : { ...t, order }))
  const changed = next.filter((t, k) => t !== list[k])
  await commit(next, () => db.tiles.bulkPut(changed.map((t) => ({ ...t }))))
}

/**
 * Tiles with history are hidden instead of deleted so past colours stay. Builtin tiles are
 * always hidden too (they can be shown again and are never re-seeded). Only custom tiles
 * without any entries are removed for good.
 *
 * The entry check runs against the DB inside the delete transaction, not against memory:
 * another open tab may have logged this tile since this one loaded, and deleting it then
 * would orphan that entry.
 */
async function deleteTile(id: string): Promise<void> {
  const tile = tiles.value.find((t) => t.id === id)
  if (!tile) return
  if (tile.builtinKey !== null || entriesState.value.some((e) => e.tileId === id)) {
    await updateTile(id, { hidden: true })
    return
  }
  const deleted = await db.transaction('rw', db.tiles, db.entries, async () => {
    if ((await db.entries.where('tileId').equals(id).count()) > 0) return false
    await db.tiles.delete(id)
    return true
  })
  if (deleted) tiles.value = tiles.value.filter((t) => t.id !== id)
  else await updateTile(id, { hidden: true })
}

function tileLabel(t: Tile): string {
  if (t.name) return t.name
  return t.builtinKey ? i18n.global.t(t.builtinKey) : ''
}

export function useTiles(): TilesStore {
  return { tiles, visibleTiles, addTile, updateTile, moveTile, deleteTile, tileLabel }
}

/** Internal: called by initStores() and after a backup import. */
export async function loadTiles(): Promise<void> {
  tiles.value = (await db.tiles.toArray()).sort(byOrder)
}
