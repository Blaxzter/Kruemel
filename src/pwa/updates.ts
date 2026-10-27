import type { Router } from 'vue-router'

/** How often an open app looks for a new version (besides each return to the foreground). */
const UPDATE_INTERVAL_MS = 60 * 60 * 1000

/** The parts of a ServiceWorkerRegistration the update check needs. */
export type UpdatableRegistration = Pick<ServiceWorkerRegistration, 'installing' | 'waiting' | 'update'>

/**
 * An installed app that is resumed from the background does not navigate, so the browser
 * never checks for a new service worker. Check when the page becomes visible again and
 * once an hour. If a new version is already waiting, offer it again instead.
 * Returns a function that stops watching.
 */
export function watchForUpdates(
  registration: UpdatableRegistration,
  onWaiting: () => void,
  intervalMs = UPDATE_INTERVAL_MS,
): () => void {
  function check(): void {
    if (registration.waiting) {
      onWaiting()
      return
    }
    if (registration.installing || !navigator.onLine) return
    registration.update().catch(() => {
      // Offline or the server is unreachable: try again next time.
    })
  }
  function onVisibility(): void {
    if (document.visibilityState === 'visible') check()
  }
  document.addEventListener('visibilitychange', onVisibility)
  const timer = setInterval(check, intervalMs)
  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    clearInterval(timer)
  }
}

const RELOAD_FLAG = 'kruemel:chunk-reload'

/** True for the errors a failed dynamic import (lazy route chunk) produces. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(message)
}

function readFlag(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_FLAG) !== null
  } catch {
    return false
  }
}

function writeFlag(): boolean {
  try {
    sessionStorage.setItem(RELOAD_FLAG, '1')
    return true
  } catch {
    return false
  }
}

/** Forget the guard once a navigation worked, so a later failure may reload again. */
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG)
  } catch {
    // Storage blocked: nothing to clear.
  }
}

/**
 * A lazy page chunk could not be loaded (offline before the service worker controls the
 * page, or old hashed files removed after an update in another tab). Reload once, so the
 * page comes from the service worker or the new version; a second failure in the same
 * session does not loop. Returns true when a reload was started.
 */
export function reloadOnceForChunkError(target?: string, reload: (url?: string) => void = defaultReload): boolean {
  if (readFlag() || !writeFlag()) return false
  reload(target)
  return true
}

function defaultReload(url?: string): void {
  if (url) window.location.assign(url)
  else window.location.reload()
}

/** Wires the reload-once handling to the router and to Vite's preload errors. */
export function installChunkErrorReload(router: Router, reload?: (url?: string) => void): void {
  router.onError((error, to) => {
    if (isChunkLoadError(error)) reloadOnceForChunkError(to.fullPath, reload)
  })
  router.afterEach((_to, _from, failure) => {
    if (!failure) clearChunkReloadFlag()
  })
  // Fires for every failed preload. Route chunks are handled above with the target URL;
  // the timeout lets router.onError run first, so this only reloads for other imports.
  window.addEventListener('vite:preloadError', () => {
    setTimeout(() => reloadOnceForChunkError(undefined, reload), 0)
  })
}
