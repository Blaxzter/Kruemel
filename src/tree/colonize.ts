import { createRng } from './rng'

/** World is 360x440 (viewBox units); the root sits at (TREE_CX, TREE_GROUND). */
export const WORLD_WIDTH = 360
export const WORLD_HEIGHT = 440
export const TREE_CX = 180
export const TREE_GROUND = 424

/** Crown blobs [cx, cy, radius]; jittered per seed. */
const CROWN: readonly (readonly [number, number, number])[] = [
  [180, 165, 104],
  [112, 200, 66],
  [248, 195, 68],
  [146, 110, 62],
  [216, 112, 64],
]
const ATTRACTOR_COUNT = 420
const MAX_ITERATIONS = 260
/** Influence distance: attractors only pull nodes closer than this (also the grid cell size). */
const DI = 46
/** Kill distance: an attractor is used up once a node gets this close. */
const DK = 9
/** Growth step per iteration. */
const D = 6.5

export interface TreeNode {
  readonly x: number
  readonly y: number
  /** Parent node index; -1 for the root. */
  readonly p: number
}

export interface TreeSkeleton {
  /** Root first, then the trunk, then crown twigs in growth order (older twigs first). */
  readonly nodes: readonly TreeNode[]
  /** Number of root + trunk nodes; crown twigs start at this index. */
  readonly trunk: number
}

/** Numeric grid key; cell coordinates stay well within +-512 for this world. */
function cellKey(gx: number, gy: number): number {
  return (gx + 512) * 1024 + (gy + 512)
}

/**
 * Space colonization (Runions et al. 2007): twigs grow toward attraction points
 * inside the crown; a point is used up once a twig reaches it.
 * A uniform grid with cell size DI turns the nearest-node search into a 3x3 cell lookup.
 *
 * With `reachCrown`, the trunk keeps growing past its usual top until an attraction point is
 * within reach. Only used for the few seeds whose jittered crown sits too high for the normal
 * trunk (see colonize); it takes no extra random numbers, so the crown is the same.
 */
function buildSkeleton(seed: number, reachCrown = false): TreeSkeleton {
  const rand = createRng(seed * 9973 + 1)
  const crown = CROWN.map(
    ([cx, cy, r]) => [cx + (rand() - 0.5) * 34, cy + (rand() - 0.5) * 30, r * (0.85 + rand() * 0.3)] as const,
  )

  let attractors: [number, number][] = []
  while (attractors.length < ATTRACTOR_COUNT) {
    const ax = 30 + rand() * 300
    const ay = 30 + rand() * 250
    for (const [cx, cy, r] of crown) {
      const dx = ax - cx
      const dy = ay - cy
      if (dx * dx + dy * dy < r * r) {
        attractors.push([ax, ay])
        break
      }
    }
  }

  const nodes: TreeNode[] = []
  const grid = new Map<number, number[]>()
  const add = (x: number, y: number, p: number): void => {
    const key = cellKey(Math.floor(x / DI), Math.floor(y / DI))
    let cell = grid.get(key)
    if (!cell) grid.set(key, (cell = []))
    cell.push(nodes.length)
    nodes.push({ x, y, p })
  }

  // Forced trunk: a slightly leaning, gently wavy line up to the crown base.
  add(TREE_CX, TREE_GROUND, -1)
  const top = 262 + rand() * 34
  const lean = (rand() - 0.5) * 0.25
  let y = TREE_GROUND
  const reach2 = (DI * 0.8) ** 2
  const crownInReach = (): boolean => {
    const tip = nodes[nodes.length - 1]!
    return attractors.some(([ax, ay]) => (ax - tip.x) ** 2 + (ay - tip.y) ** 2 < reach2)
  }
  while (y > top || (reachCrown && y > 60 && !crownInReach())) {
    y -= 7
    add(TREE_CX + (TREE_GROUND - y) * lean + Math.sin(y / 30) * 2.5, y, nodes.length - 1)
  }
  const trunk = nodes.length

  for (let it = 0; it < MAX_ITERATIONS && attractors.length > 0; it++) {
    // Indexed by node; iterated in ascending node order so the rand() sequence is stable.
    const pull = new Map<number, [number, number]>()
    const keep: [number, number][] = []
    for (const attractor of attractors) {
      const [ax, ay] = attractor
      const gx = Math.floor(ax / DI)
      const gy = Math.floor(ay / DI)
      let best = -1
      let bestD2 = DI * DI
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const cell = grid.get(cellKey(gx + ox, gy + oy))
          if (!cell) continue
          for (const index of cell) {
            const node = nodes[index]!
            const dx = ax - node.x
            const dy = ay - node.y
            const d2 = dx * dx + dy * dy
            if (d2 < bestD2) {
              bestD2 = d2
              best = index
            }
          }
        }
      }
      if (best >= 0 && bestD2 < DK * DK) continue
      keep.push(attractor)
      if (best < 0) continue
      const dist = Math.sqrt(bestD2)
      const target = nodes[best]!
      let v = pull.get(best)
      if (!v) pull.set(best, (v = [0, 0]))
      v[0] += (ax - target.x) / dist
      v[1] += (ay - target.y) / dist
    }
    attractors = keep
    if (pull.size === 0) break

    const grown = [...pull.keys()].sort((a, b) => a - b)
    for (const index of grown) {
      const from = nodes[index]!
      const [px, py] = pull.get(index)!
      // Small random wobble plus a slight upward bias.
      const vx = px + (rand() - 0.5) * 0.4
      const vy = py - 0.12 + (rand() - 0.5) * 0.4
      const len = Math.sqrt(vx * vx + vy * vy) || 1
      add(from.x + (D * vx) / len, from.y + (D * vy) / len, index)
    }
  }

  return { nodes, trunk }
}

/** layoutTree shows at least 3 crown twigs. */
const MIN_CROWN_NODES = 3

const cache = new Map<number, TreeSkeleton>()

/** Memoized per seed: the skeleton never changes for a seed, only how much of it is shown. */
export function colonize(seed: number): TreeSkeleton {
  let skeleton = cache.get(seed)
  if (!skeleton) {
    skeleton = buildSkeleton(seed)
    // For a few seeds (e.g. 198, 302) no attraction point is within reach of the trunk top
    // (the design's TreeArt has the same gap), nothing grows and the tree cannot be drawn.
    // Grow the trunk up into the crown for those.
    if (skeleton.nodes.length - skeleton.trunk < MIN_CROWN_NODES) skeleton = buildSkeleton(seed, true)
    cache.set(seed, skeleton)
  }
  return skeleton
}

/** Test helper: forget memoized skeletons. */
export function clearColonizeCache(): void {
  cache.clear()
}

/** Whether the skeleton for `seed` is already memoized. */
export function isColonized(seed: number): boolean {
  return cache.has(seed)
}
