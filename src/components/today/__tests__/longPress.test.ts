import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLongPress, LONG_PRESS_MS, LONG_PRESS_SLOP } from '../longPress'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createLongPress', () => {
  it('fires after the delay while the finger rests', () => {
    const onFire = vi.fn()
    const lp = createLongPress(onFire)
    lp.down(100, 100)
    vi.advanceTimersByTime(LONG_PRESS_MS - 1)
    expect(onFire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onFire).toHaveBeenCalledTimes(1)
    expect(lp.fired).toBe(true)
  })

  it('a release before the delay cancels it', () => {
    const onFire = vi.fn()
    const lp = createLongPress(onFire)
    lp.down(0, 0)
    vi.advanceTimersByTime(300)
    lp.up()
    vi.advanceTimersByTime(1000)
    expect(onFire).not.toHaveBeenCalled()
    expect(lp.consumeClick()).toBe(false)
  })

  it('small jitter is fine, moving more than the slop cancels', () => {
    const onFire = vi.fn()
    const lp = createLongPress(onFire)
    lp.down(50, 50)
    lp.move(50 + LONG_PRESS_SLOP - 2, 50)
    vi.advanceTimersByTime(LONG_PRESS_MS)
    expect(onFire).toHaveBeenCalledTimes(1)

    const onFire2 = vi.fn()
    const lp2 = createLongPress(onFire2)
    lp2.down(50, 50)
    lp2.move(50, 50 + LONG_PRESS_SLOP + 1)
    vi.advanceTimersByTime(LONG_PRESS_MS * 2)
    expect(onFire2).not.toHaveBeenCalled()
  })

  it('the click after a fired press is consumed once', () => {
    const lp = createLongPress(() => {})
    lp.down(0, 0)
    vi.advanceTimersByTime(LONG_PRESS_MS)
    lp.up()
    expect(lp.consumeClick()).toBe(true)
    expect(lp.consumeClick()).toBe(false)
  })

  it('a new press starts fresh', () => {
    const onFire = vi.fn()
    const lp = createLongPress(onFire)
    lp.down(0, 0)
    vi.advanceTimersByTime(LONG_PRESS_MS)
    lp.down(0, 0)
    expect(lp.fired).toBe(false)
    lp.cancel()
    vi.advanceTimersByTime(LONG_PRESS_MS)
    expect(onFire).toHaveBeenCalledTimes(1)
  })
})
