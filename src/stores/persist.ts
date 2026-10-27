let requested = false

/**
 * Asks the browser to keep our IndexedDB data even under storage pressure (best effort,
 * at most once per session). Resolves to whether storage is persisted.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (requested) return false
  requested = true
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage
  if (!storage || typeof storage.persist !== 'function') return false
  try {
    if (typeof storage.persisted === 'function' && (await storage.persisted())) return true
    return await storage.persist()
  } catch {
    return false
  }
}

/** Test helper: allow another request. */
export function resetPersistRequest(): void {
  requested = false
}
