// Finger and mouse handling of the Today tile grid: long press to start edit mode, and in edit
// mode drag to reorder. Kept out of TileGrid.vue so the component stays about rendering.
import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import type { Tile } from '@/domain/types'
import { reorderIds } from '@/components/tiles/reorder'
import { createLongPress } from './longPress'

/** Edit mode, touch: a finger has to rest this long (ms) on a tile before moving it drags. */
export const DRAG_HOLD_MS = 200
/** Moving further than this (px) during the hold is a scroll, not a drag. */
const DRAG_HOLD_SLOP = 10
/** Once a drag may start, moving this far (px) starts it. */
const DRAG_START = 8

export interface Point {
  x: number
  y: number
}

/** Index of the cell centre closest to `p` (0 when there are no cells). */
export function nearestCell(cells: readonly Point[], p: Point): number {
  let best = 0
  let bestDist = Infinity
  cells.forEach((cell, i) => {
    const d = Math.hypot(cell.x - p.x, cell.y - p.y)
    if (d < bestDist) {
      best = i
      bestDist = d
    }
  })
  return best
}

interface Gesture {
  pointerId: number
  id: string
  startX: number
  startY: number
  /** Pointer offset inside the tile, so the ghost stays under the finger where it was grabbed. */
  offsetX: number
  offsetY: number
  width: number
  height: number
  /** Moving may drag now: a mouse, a finger that rested for DRAG_HOLD_MS, or one that just long pressed. */
  armed: boolean
  /** Cell centres relative to the grid, measured when the drag starts. */
  cells: Point[]
}

export interface TileGesturesOptions {
  /** The element holding the bar and the grid (touchmove is blocked here while dragging). */
  section: Ref<HTMLElement | null>
  tiles: () => readonly Tile[]
  editing: () => boolean
  /** A long press or the context menu asks for edit mode. */
  enterEdit: (haptic: boolean) => void
  /** A tile was dropped at a new visible index. The dropped order stays on screen until this settles. */
  drop: (id: string, to: number) => Promise<void>
}

export function useTileGestures(opts: TileGesturesOptions) {
  const longPress = createLongPress(() => {
    opts.enterEdit(true)
    // The finger is still down after a long press: moving it now drags right away.
    if (gesture) gesture.armed = true
  })

  /** A drag or long press just ended: the click the browser sends after it is not a tap. */
  let suppressClick = false
  let suppressTimer: ReturnType<typeof setTimeout> | null = null
  let holdTimer: ReturnType<typeof setTimeout> | null = null
  let gesture: Gesture | null = null

  const dragId = ref<string | null>(null)
  const preview = ref<string[] | null>(null)
  /** A dropped order is being written. */
  const saving = ref(false)
  const ghost = ref<{ x: number; y: number; width: number; height: number } | null>(null)

  const byId = computed(() => new Map(opts.tiles().map((tile) => [tile.id, tile])))
  /** Tiles in the order shown: the live preview while dragging, else the store order. */
  const shown = computed<Tile[]>(() => {
    const tiles = opts.tiles()
    if (!preview.value) return [...tiles]
    const list = preview.value.map((id) => byId.value.get(id)).filter((x): x is Tile => !!x)
    return list.length === tiles.length ? list : [...tiles]
  })
  const ghostTile = computed(() => (dragId.value ? (byId.value.get(dragId.value) ?? null) : null))

  const grid = () => opts.section.value?.querySelector<HTMLElement>('.tile-grid') ?? null

  function clearHold(): void {
    if (holdTimer !== null) clearTimeout(holdTimer)
    holdTimer = null
  }

  /** True (once) when the click that just came belongs to a long press or drag, not a tap. */
  function consumeClick(): boolean {
    const fromLongPress = longPress.consumeClick()
    const was = suppressClick || fromLongPress
    suppressClick = false
    return was
  }

  function onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-tile]')
    if (suppressTimer !== null) clearTimeout(suppressTimer)
    // A new touch: whatever the last gesture was, its click (if the browser sent one) is past.
    suppressClick = false
    longPress.cancel()
    longPress.consumeClick()
    // A second finger never takes over a running drag.
    if (!el || (gesture && dragId.value)) return
    clearHold()
    const rect = el.getBoundingClientRect()
    const editing = opts.editing()
    const g: Gesture = {
      pointerId: e.pointerId,
      id: el.dataset.tile ?? '',
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      armed: editing && e.pointerType === 'mouse',
      cells: [],
    }
    gesture = g
    if (!editing) longPress.down(e.clientX, e.clientY)
    else if (!g.armed)
      holdTimer = setTimeout(() => {
        holdTimer = null
        if (gesture === g) g.armed = true
      }, DRAG_HOLD_MS)
  }

  function onPointerMove(e: PointerEvent): void {
    const g = gesture
    if (!g || e.pointerId !== g.pointerId) return
    if (!opts.editing()) {
      longPress.move(e.clientX, e.clientY)
      return
    }
    if (!dragId.value) {
      const dist = Math.hypot(e.clientX - g.startX, e.clientY - g.startY)
      if (!g.armed) {
        // Moved before the hold was over: a swipe to scroll. Let the page have it.
        if (dist > DRAG_HOLD_SLOP) {
          clearHold()
          gesture = null
        }
        return
      }
      if (dist <= DRAG_START) return
      startDrag(g)
    }
    moveDrag(g, e.clientX, e.clientY)
  }

  function startDrag(g: Gesture): void {
    const el = grid()
    if (!el) return
    const origin = el.getBoundingClientRect()
    g.cells = Array.from(el.querySelectorAll<HTMLElement>('[data-tile]')).map((tile) => {
      const r = tile.getBoundingClientRect()
      return { x: r.left - origin.left + r.width / 2, y: r.top - origin.top + r.height / 2 }
    })
    try {
      el.setPointerCapture(g.pointerId)
    } catch {
      // The pointer may already be gone; the drag still follows move events that reach the grid.
    }
    dragId.value = g.id
    preview.value = opts.tiles().map((tile) => tile.id)
    longPress.cancel()
  }

  function moveDrag(g: Gesture, x: number, y: number): void {
    const el = grid()
    if (!el || !preview.value) return
    ghost.value = { x: x - g.offsetX, y: y - g.offsetY, width: g.width, height: g.height }
    const origin = el.getBoundingClientRect()
    const best = nearestCell(g.cells, { x: x - g.offsetX + g.width / 2 - origin.left, y: y - g.offsetY + g.height / 2 - origin.top })
    if (preview.value.indexOf(g.id) !== best) preview.value = reorderIds(preview.value, g.id, best)
  }

  async function onPointerUp(e: PointerEvent): Promise<void> {
    const g = gesture
    if (!g || e.pointerId !== g.pointerId) return
    longPress.up()
    clearHold()
    gesture = null
    if (longPress.fired) suppressClickBriefly()
    if (!dragId.value) return
    suppressClickBriefly()
    const to = preview.value?.indexOf(g.id) ?? -1
    const from = opts.tiles().findIndex((tile) => tile.id === g.id)
    dragId.value = null
    ghost.value = null
    if (to < 0 || to === from) {
      preview.value = null
      return
    }
    saving.value = true
    try {
      await opts.drop(g.id, to)
    } finally {
      saving.value = false
      if (!dragId.value) preview.value = null
    }
  }

  function onPointerCancel(e: PointerEvent): void {
    if (!gesture || e.pointerId !== gesture.pointerId) return
    longPress.cancel()
    cancelDrag()
  }

  function cancelDrag(): void {
    clearHold()
    gesture = null
    dragId.value = null
    ghost.value = null
    preview.value = null
  }

  function suppressClickBriefly(): void {
    suppressClick = true
    if (suppressTimer !== null) clearTimeout(suppressTimer)
    // Some browsers send no click after a long press; never swallow a later, unrelated tap.
    suppressTimer = setTimeout(() => {
      suppressClick = false
      longPress.consumeClick()
    }, 400)
  }

  function onContextMenu(e: MouseEvent): void {
    const el = (e.target as Element | null)?.closest('[data-tile]')
    if (!el) return
    // No browser menu on a tile; a right click or the menu key starts edit mode instead.
    e.preventDefault()
    if (!opts.editing()) {
      // From a finger (Android sends contextmenu on a long press): buzz like the timer would.
      opts.enterEdit(gesture !== null && e.button === 0)
      if (gesture) gesture.armed = true
      if (e.button !== 0 || gesture) suppressClickBriefly()
    }
  }

  /**
   * The page must not scroll while a tile is dragged, or once a finger has rested on it (long
   * press, or the edit mode hold). A swipe that starts moving right away stays a scroll.
   */
  function onTouchMove(e: TouchEvent): void {
    if (gesture && (dragId.value || gesture.armed || longPress.fired) && e.cancelable) e.preventDefault()
  }

  onMounted(() => opts.section.value?.addEventListener('touchmove', onTouchMove, { passive: false }))
  onBeforeUnmount(() => {
    opts.section.value?.removeEventListener('touchmove', onTouchMove)
    longPress.cancel()
    clearHold()
    if (suppressTimer !== null) clearTimeout(suppressTimer)
  })

  return {
    dragId,
    saving,
    ghost,
    ghostTile,
    shown,
    consumeClick,
    cancelDrag,
    onContextMenu,
    pointerHandlers: { pointerdown: onPointerDown, pointermove: onPointerMove, pointerup: onPointerUp, pointercancel: onPointerCancel },
  }
}
