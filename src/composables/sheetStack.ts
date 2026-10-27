import { computed, readonly, ref } from 'vue'

/**
 * App-wide record of the open bottom sheets, newest last.
 *
 * Reka's modal Drawer hides everything outside the open sheet from assistive tech
 * (aria-hidden), traps focus in it and blocks outside pointer events. A toast must stay
 * usable while a sheet is open (e.g. "Undo" after deleting an entry), so every open sheet
 * registers a toast anchor: ToastHost teleports its viewport into the topmost sheet's anchor,
 * which puts the toast inside the dialog (focus cycle, accessibility tree, pointer layer).
 */
interface OpenSheet {
  id: number
  toastAnchor: HTMLElement | null
}

const stack = ref<OpenSheet[]>([])
let nextId = 1

/** Registers a newly opened sheet and returns its id. */
export function pushSheet(): number {
  const id = nextId++
  stack.value = [...stack.value, { id, toastAnchor: null }]
  return id
}

/** Unregisters a sheet (no-op for an unknown id). */
export function popSheet(id: number): void {
  if (!stack.value.some((s) => s.id === id)) return
  stack.value = stack.value.filter((s) => s.id !== id)
}

/** Sets (or clears) the element inside sheet `id` that hosts the toast while it is on top. */
export function setSheetToastAnchor(id: number, el: HTMLElement | null): void {
  const sheet = stack.value.find((s) => s.id === id)
  if (!sheet || sheet.toastAnchor === el) return
  stack.value = stack.value.map((s) => (s.id === id ? { id, toastAnchor: el } : s))
}

export function useSheetStack() {
  return {
    openSheets: readonly(stack),
    anySheetOpen: computed(() => stack.value.length > 0),
    /** Where the toast lives right now: the topmost sheet's anchor, or null for <body>. */
    toastAnchor: computed(() => stack.value[stack.value.length - 1]?.toastAnchor ?? null),
  }
}
