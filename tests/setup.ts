// Gives every test an in-memory IndexedDB so Dexie works under jsdom.
import 'fake-indexeddb/auto'

// jsdom has no layout; the router's scrollBehavior calls window.scrollTo.
window.scrollTo = (() => {}) as typeof window.scrollTo
