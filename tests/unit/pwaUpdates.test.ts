import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  clearChunkReloadFlag,
  installChunkErrorReload,
  isChunkLoadError,
  reloadOnceForChunkError,
  watchForUpdates,
  type UpdatableRegistration,
} from '@/pwa/updates'

function fakeRegistration(patch: Partial<UpdatableRegistration> = {}) {
  const update = vi.fn(async () => undefined as never)
  return { installing: null, waiting: null, update, ...patch } as UpdatableRegistration & { update: typeof update }
}

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('watchForUpdates', () => {
  let stop: (() => void) | undefined
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    stop?.()
    stop = undefined
    vi.useRealTimers()
  })

  it('checks for a new version when the app comes back to the foreground and every hour', () => {
    const reg = fakeRegistration()
    const onWaiting = vi.fn()
    stop = watchForUpdates(reg, onWaiting)

    setVisibility('hidden')
    expect(reg.update).not.toHaveBeenCalled()
    setVisibility('visible')
    expect(reg.update).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(reg.update).toHaveBeenCalledTimes(2)
    expect(onWaiting).not.toHaveBeenCalled()
  })

  it('offers a version that is already waiting again instead of checking', () => {
    const reg = fakeRegistration({ waiting: {} as ServiceWorker })
    const onWaiting = vi.fn()
    stop = watchForUpdates(reg, onWaiting)
    setVisibility('visible')
    expect(onWaiting).toHaveBeenCalledOnce()
    expect(reg.update).not.toHaveBeenCalled()
  })

  it('stops listening', () => {
    const reg = fakeRegistration()
    watchForUpdates(reg, vi.fn())()
    setVisibility('visible')
    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(reg.update).not.toHaveBeenCalled()
  })
})

describe('chunk load errors', () => {
  beforeEach(() => clearChunkReloadFlag())

  it('recognises failed dynamic imports', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/WeekView-x.js'))).toBe(true)
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('Something else'))).toBe(false)
  })

  it('reloads only once per session', () => {
    const reload = vi.fn()
    expect(reloadOnceForChunkError('/woche', reload)).toBe(true)
    expect(reloadOnceForChunkError('/woche', reload)).toBe(false)
    expect(reload).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledWith('/woche')
  })

  it('reloads to the target page when a lazy route cannot be loaded', async () => {
    const reload = vi.fn()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { render: () => null } },
        { path: '/woche', component: () => Promise.reject(new TypeError('Failed to fetch dynamically imported module')) },
      ],
    })
    installChunkErrorReload(router, reload)
    await router.push('/')
    // A good navigation clears the guard.
    sessionStorage.setItem('kruemel:chunk-reload', '1')
    await router.push('/?x=1')
    await expect(router.push('/woche')).rejects.toThrow()
    expect(reload).toHaveBeenCalledWith('/woche')
  })
})
