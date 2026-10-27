import { beforeEach, describe, expect, it } from 'vitest'
import type { Tile } from '@/domain/types'
import { db } from '@/db/db'
import { useTiles } from '@/stores'
import { resetSettings } from '@/components/week/__tests__/testkit'
import { moveTileToVisibleIndex, moveTileVisible, reorderIds, targetFullIndex } from './reorder'

const tile = (id: string, order: number, hidden = false): Tile => ({ id, builtinKey: null, name: id, icon: 'apple', color: 'coral', order, hidden })

describe('reorderIds', () => {
  it('moves an id to a new place', () => {
    expect(reorderIds(['a', 'b', 'c', 'd'], 'a', 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(reorderIds(['a', 'b', 'c', 'd'], 'd', 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(reorderIds(['a', 'b'], 'a', 9)).toEqual(['b', 'a'])
    expect(reorderIds(['a', 'b'], 'x', 0)).toEqual(['a', 'b'])
  })
})

describe('targetFullIndex', () => {
  // Visible: a c e; hidden: b d.
  const sorted = [tile('a', 0), tile('b', 1, true), tile('c', 2), tile('d', 3, true), tile('e', 4)]

  it('places the tile before the visible tile that is at the target place', () => {
    // a to visible place 1 (after c): rest = b c d e, before e -> index of e = 3.
    expect(targetFullIndex(sorted, 'a', 1)).toBe(3)
    // e to the front: before a.
    expect(targetFullIndex(sorted, 'e', 0)).toBe(0)
  })

  it('at the end it goes right after the last visible tile', () => {
    expect(targetFullIndex(sorted, 'a', 2)).toBe(4)
    expect(targetFullIndex(sorted, 'a', 99)).toBe(4)
  })

  it('unknown ids give -1', () => {
    expect(targetFullIndex(sorted, 'zz', 0)).toBe(-1)
  })
})

describe('moveTileToVisibleIndex', () => {
  beforeEach(async () => {
    await resetSettings()
    // Back to the seeded order with every tile shown.
    const { tiles, updateTile } = useTiles()
    for (const t of tiles.value) if (t.hidden) await updateTile(t.id, { hidden: false })
    const builtin = ['fruit', 'veg', 'bread', 'meal', 'snack', 'sweets', 'dairy', 'drink']
    for (const [i, id] of builtin.entries()) await moveTileToVisibleIndex(id, i)
  })

  const visibleIds = () => useTiles().visibleTiles.value.map((t) => t.id)

  it('persists the new order in the store and the database', async () => {
    await moveTileToVisibleIndex('fruit', 3)
    expect(visibleIds().slice(0, 5)).toEqual(['veg', 'bread', 'meal', 'fruit', 'snack'])
    const stored = (await db.tiles.toArray()).sort((a, b) => a.order - b.order).map((t) => t.id)
    expect(stored.filter((id) => visibleIds().includes(id))).toEqual(visibleIds())
  })

  it('skips hidden tiles when counting places', async () => {
    await useTiles().updateTile('veg', { hidden: true })
    await moveTileToVisibleIndex('fruit', 1)
    expect(visibleIds().slice(0, 3)).toEqual(['bread', 'fruit', 'meal'])
    await moveTileVisible('fruit', -1)
    expect(visibleIds().slice(0, 2)).toEqual(['fruit', 'bread'])
    await moveTileVisible('fruit', -1)
    expect(visibleIds()[0]).toBe('fruit')
  })
})
