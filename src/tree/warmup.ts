/**
 * Builds the tree skeleton for `seed` while the browser is idle after boot, so the first visit
 * to /baum or /woche only lays out and draws the tree (SPEC: tree computation off the critical
 * path). colonize() is memoized, and the module is loaded lazily to keep it out of the entry chunk.
 */
export function warmTreeCache(seed: number, whenIdle: (run: () => void) => void = scheduleIdle): Promise<void> {
  return new Promise((resolve) => {
    whenIdle(() => {
      import('./colonize')
        .then(({ colonize }) => {
          colonize(seed)
        })
        // A missing chunk (offline update) is not worth an error here: the tree page retries it.
        .catch(() => undefined)
        .finally(resolve)
    })
  })
}

function scheduleIdle(run: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 5000 })
  else setTimeout(run, 1000)
}
