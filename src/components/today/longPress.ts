// Long press detection for the Today tiles. Plain TS (no Vue), so timing is easy to unit test.

/** How long a finger has to rest on a tile before edit mode starts. */
export const LONG_PRESS_MS = 500
/** Moving further than this (px) before the timer fires counts as a scroll or swipe, not a press. */
export const LONG_PRESS_SLOP = 10

export interface LongPress {
  /** A pointer went down at (x, y). Starts the timer. */
  down(x: number, y: number): void
  /** The pointer moved. Cancels a pending press once it moved more than the slop. */
  move(x: number, y: number): void
  /** The pointer went up or was cancelled. Cancels a pending press (released too early). */
  up(): void
  /** Stops a pending timer without firing. */
  cancel(): void
  /** True between a fired press and the next `down`: the click that follows must not log an entry. */
  readonly fired: boolean
  /** Returns true (and forgets it) when the next click belongs to a fired long press. */
  consumeClick(): boolean
}

export function createLongPress(onFire: () => void, delay = LONG_PRESS_MS, slop = LONG_PRESS_SLOP): LongPress {
  let timer: ReturnType<typeof setTimeout> | null = null
  let startX = 0
  let startY = 0
  let fired = false

  function cancel(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  return {
    down(x, y) {
      cancel()
      fired = false
      startX = x
      startY = y
      timer = setTimeout(() => {
        timer = null
        fired = true
        onFire()
      }, delay)
    },
    move(x, y) {
      if (timer === null) return
      if (Math.hypot(x - startX, y - startY) > slop) cancel()
    },
    up: cancel,
    cancel,
    get fired() {
      return fired
    },
    consumeClick() {
      const was = fired
      fired = false
      return was
    },
  }
}
