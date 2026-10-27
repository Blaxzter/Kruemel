import { describe, expect, it } from 'vitest'
import { nearestCell } from '../useTileGestures'

describe('nearestCell', () => {
  const cells = [
    { x: 50, y: 50 },
    { x: 150, y: 50 },
    { x: 250, y: 50 },
    { x: 50, y: 150 },
  ]

  it('picks the cell whose centre is closest', () => {
    expect(nearestCell(cells, { x: 60, y: 55 })).toBe(0)
    expect(nearestCell(cells, { x: 240, y: 90 })).toBe(2)
    expect(nearestCell(cells, { x: 40, y: 130 })).toBe(3)
  })

  it('keeps the first of two equally close cells, and falls back to 0 without cells', () => {
    expect(nearestCell(cells, { x: 100, y: 50 })).toBe(0)
    expect(nearestCell([], { x: 10, y: 10 })).toBe(0)
  })

  it('still finds a cell when the point is far outside the grid', () => {
    expect(nearestCell(cells, { x: 1000, y: -500 })).toBe(2)
  })
})
