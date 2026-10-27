import { LEAVES_FOR_SWING, LEAVES_PER_APPLE, LEAVES_PER_FLOWER } from '@/domain/growth'
import { colonize, TREE_CX, TREE_GROUND, type TreeNode } from './colonize'

/** Leaves at which the crown has grown to its full set of twigs (roughly a year of logging). */
const FULL_CROWN_AT = 260
/** Leaves at which the drawing reaches full scale. */
const FULL_SCALE_AT = 200
const GOLDEN = 0.6180339887
const RAD_TO_DEG = 57.2958

/** Rounds to one decimal, like the design (keeps the SVG small and stable). */
function r1(v: number): number {
  return Math.round(v * 10) / 10
}

interface Segment {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly w: number
}

interface LeafSpot {
  /** Twig position in unscaled world coordinates; fixed for a leaf index forever. */
  readonly anchorX: number
  readonly anchorY: number
  /** Rendered position (after the growth scale). */
  readonly x: number
  readonly y: number
  /** Rotation in degrees; fixed for a leaf index forever. */
  readonly deg: number
  /** SVG transform for the leaf group. */
  readonly transform: string
}

export interface TreeLayout {
  /** 0 leaves: only a seed in the soil. */
  readonly isSeed: boolean
  /** Number of leaves drawn (0 in the seed state). */
  readonly leafCount: number
  /** Growth scale, 0.3 (tiny) to 1 (full size). */
  readonly scale: number
  /** SVG transform for the branch group. */
  readonly grow: string
  readonly segments: readonly Segment[]
  readonly leaves: readonly LeafSpot[]
  /** Flower transforms (one per 7 leaves). */
  readonly flowers: readonly string[]
  /** Apple transforms (one per 30 leaves). */
  readonly apples: readonly string[]
  /** Bird transform, on the highest visible twig right of the trunk. */
  readonly bird: string
  readonly swing: {
    readonly visible: boolean
    readonly x1: number
    readonly x2: number
    readonly rx: number
    readonly top: number
    readonly seat: number
  }
}

/**
 * Lays out the tree for a seed and a leaf count, ported from design/TreeArt.dc.html.
 * Pure and deterministic. Leaf i always sits on the same twig with the same angle;
 * only the overall growth scale changes until FULL_SCALE_AT leaves.
 */
export function layoutTree(seed: number, leaves: number): TreeLayout {
  const raw = Math.max(0, Math.round(Number.isFinite(leaves) ? leaves : 0))
  const isSeed = raw === 0
  const n = Math.max(1, raw)
  const { nodes, trunk } = colonize(Math.max(1, Math.round(Number.isFinite(seed) ? seed : 1)))
  const node = (i: number): TreeNode => nodes[i]!
  const crownN = nodes.length - trunk

  const visibleAt = (count: number): number =>
    Math.max(3, Math.min(crownN, Math.round(crownN * Math.pow(Math.min(1, count / FULL_CROWN_AT), 0.75))))
  const vis = trunk + visibleAt(n)
  const scale = 0.3 + 0.7 * Math.pow(Math.min(1, n / FULL_SCALE_AT), 0.7)
  const px = (x: number): number => TREE_CX + (x - TREE_CX) * scale
  const py = (y: number): number => TREE_GROUND + (y - TREE_GROUND) * scale

  // Leaf i gets a fixed twig the day it appears, biased toward the newest (outer) twigs.
  // Once every visible twig carries a leaf, a new layer starts at a different angle.
  const spots: LeafSpot[] = []
  let used = new Set<number>()
  let layer = 0
  for (let i = 0; i < n; i++) {
    const V = visibleAt(i + 1)
    if (used.size >= V) {
      used = new Set()
      layer++
    }
    const f = (i * GOLDEN + layer * 0.37) % 1
    let idx = Math.min(V - 1, Math.floor(Math.sqrt(f) * V))
    while (used.has(idx)) idx = (idx + 1) % V
    used.add(idx)
    const twig = node(trunk + idx)
    const parent = node(twig.p)
    const dir = Math.atan2(twig.y - parent.y, twig.x - parent.x) * RAD_TO_DEG
    const side = (i % 2 ? 1 : -1) * (40 + ((i * 13) % 25))
    const deg = dir + side + layer * 35
    const x = px(twig.x)
    const y = py(twig.y)
    const leafScale = 0.85 + ((i * 37) % 5) * 0.07
    spots.push({
      anchorX: twig.x,
      anchorY: twig.y,
      x,
      y,
      deg,
      transform: `translate(${r1(x)} ${r1(y)}) rotate(${r1(deg)}) scale(${r1(leafScale)})`,
    })
  }

  // Branch thickness follows how many twigs a branch carries (pipe model).
  const desc = new Array<number>(vis).fill(0)
  for (let k = vis - 1; k > 0; k--) desc[node(k).p]! += desc[k]! + 1
  const segments: Segment[] = []
  for (let m = 1; m < vis; m++) {
    const nd = node(m)
    const pp = node(nd.p)
    segments.push({
      x1: r1(pp.x),
      y1: r1(pp.y),
      x2: r1(nd.x),
      y2: r1(nd.y),
      w: r1(Math.min(22, 1.1 + 0.62 * Math.sqrt(desc[m]! + 1))),
    })
  }

  const flowers: string[] = []
  for (let q = 1; q * LEAVES_PER_FLOWER <= n; q++) {
    const spot = spots[q * LEAVES_PER_FLOWER - 4]!
    flowers.push(`translate(${r1(spot.x + 3)} ${r1(spot.y - 3)})`)
  }
  const apples: string[] = []
  for (let u = 1; u * LEAVES_PER_APPLE <= n; u++) {
    const spot = spots[u * LEAVES_PER_APPLE - 15]!
    apples.push(`translate(${r1(spot.x)} ${r1(spot.y + 9)})`)
  }

  // Bird perches on the highest visible twig right of the trunk; swing hangs from a low left branch.
  let perch: TreeNode | null = null
  let hook: TreeNode | null = null
  for (let b = trunk; b < vis; b++) {
    const bn = node(b)
    if (bn.x > TREE_CX + 25 && (!perch || bn.y < perch.y)) perch = bn
    if (bn.x < TREE_CX - 30 && bn.x > TREE_CX - 80 && (!hook || bn.y > hook.y)) hook = bn
  }
  perch ??= node(vis - 1)
  hook ??= node(trunk - 1)

  return {
    isSeed,
    leafCount: isSeed ? 0 : n,
    scale,
    grow: `translate(${TREE_CX} ${TREE_GROUND}) scale(${Math.round(scale * 100) / 100}) translate(-${TREE_CX} -${TREE_GROUND})`,
    segments: isSeed ? [] : segments,
    leaves: isSeed ? [] : spots,
    flowers: isSeed ? [] : flowers,
    apples: isSeed ? [] : apples,
    bird: `translate(${r1(px(perch.x))} ${r1(py(perch.y) - 16)})`,
    swing: {
      visible: n >= LEAVES_FOR_SWING,
      x1: r1(px(hook.x) - 13),
      x2: r1(px(hook.x) + 13),
      rx: r1(px(hook.x) - 15),
      top: r1(py(hook.y)),
      seat: TREE_GROUND - 28,
    },
  }
}
