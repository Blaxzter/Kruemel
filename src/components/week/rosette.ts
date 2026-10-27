// Geometry of the "Deine Vielfalt" rosette on the Week screen. The data (one petal per tile)
// comes from varietyPetals in src/domain/variety.ts, shared with the Vielfalt page.
/** An ellipse in a 100x100 viewBox, rotated about the centre (50, 50). */
export interface PetalShape {
  cx: number
  cy: number
  rx: number
  ry: number
  /** Degrees clockwise from 12 o'clock. */
  angle: number
}

/** Distance of a petal's centre from the rosette centre, and its radial half-length. */
const PETAL_DISTANCE = 31
const PETAL_HALF_LENGTH = 16
/** Widest petal (few tiles) and narrowest (many tiles), as half-widths. */
const PETAL_MAX_HALF_WIDTH = 14
const PETAL_MIN_HALF_WIDTH = 3.5

/**
 * Petals evenly spread around the centre, the first at the top, going clockwise. Their width
 * shrinks with the count so neighbours just do not touch.
 */
export function petalShapes(count: number): PetalShape[] {
  if (count <= 0) return []
  const arc = (2 * Math.PI * PETAL_DISTANCE) / count
  const rx = Math.max(PETAL_MIN_HALF_WIDTH, Math.min(PETAL_MAX_HALF_WIDTH, arc * 0.42))
  return Array.from({ length: count }, (_, i) => ({
    cx: 50,
    cy: 50 - PETAL_DISTANCE,
    rx: round(rx),
    ry: PETAL_HALF_LENGTH,
    angle: round((360 / count) * i),
  }))
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
