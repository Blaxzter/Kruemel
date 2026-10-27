// Reordering tiles by their place among the visible tiles (what Today shows), on top of the
// store's neighbour swap. Hidden tiles keep their place relative to the visible ones around them.
import type { Tile } from '@/domain/types'
import { useTiles } from '@/stores'

/**
 * Index in the full (hidden included, sorted) list where `id` has to end up so that it sits at
 * `toVisible` among the visible tiles. Returns -1 for an unknown id.
 */
export function targetFullIndex(sorted: readonly Tile[], id: string, toVisible: number): number {
  if (!sorted.some((t) => t.id === id)) return -1
  const rest = sorted.filter((t) => t.id !== id)
  const visibleRest = rest.filter((t) => !t.hidden)
  const to = Math.max(0, Math.min(toVisible, visibleRest.length))
  const before = visibleRest[to]
  if (before) return rest.indexOf(before)
  const last = visibleRest[visibleRest.length - 1]
  return last ? rest.indexOf(last) + 1 : rest.length
}

/** Pure: the visible order after moving `id` to `toVisible`. */
export function reorderIds(ids: readonly string[], id: string, toVisible: number): string[] {
  const rest = ids.filter((x) => x !== id)
  if (rest.length === ids.length) return [...ids]
  const to = Math.max(0, Math.min(toVisible, rest.length))
  return [...rest.slice(0, to), id, ...rest.slice(to)]
}

let queue: Promise<unknown> = Promise.resolve()

/**
 * Moves a tile to place `toVisible` (0-based) among the visible tiles and persists the order.
 * Runs one store swap per step; calls are queued so quick drags never interleave.
 */
export function moveTileToVisibleIndex(id: string, toVisible: number): Promise<void> {
  const run = async (): Promise<void> => {
    const { tiles, moveTile } = useTiles()
    const sorted = () => [...tiles.value].sort((a, b) => a.order - b.order)
    const target = targetFullIndex(sorted(), id, toVisible)
    if (target < 0) return
    // Bounded: each swap moves the tile one step towards the target.
    for (let guard = sorted().length; guard > 0; guard--) {
      const current = sorted().findIndex((t) => t.id === id)
      if (current < 0 || current === target) return
      await moveTile(id, current < target ? 1 : -1)
    }
  }
  const next = queue.then(run, run)
  queue = next.catch(() => undefined)
  return next
}

/** Moves a tile one place earlier (-1) or later (1) among the visible tiles. */
export function moveTileVisible(id: string, dir: -1 | 1): Promise<void> {
  const { visibleTiles } = useTiles()
  const index = visibleTiles.value.findIndex((t) => t.id === id)
  if (index < 0) return Promise.resolve()
  return moveTileToVisibleIndex(id, index + dir)
}
