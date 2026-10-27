import { readonly, ref } from 'vue'

interface ToastOptions {
  /** Label of the optional action button, e.g. t('common.actions.undo'). */
  actionLabel?: string
  /** Called when the action button is pressed; the toast closes afterwards. */
  onAction?: () => void
  /** Milliseconds until the toast hides. Default 3500 (design). */
  duration?: number
}

export interface Toast {
  id: number
  text: string
  actionLabel?: string
  onAction?: () => void
}

const DEFAULT_TOAST_DURATION = 3500

/** Why the dismiss timer is paused: the toast has keyboard focus or the pointer is over it. */
type ToastHold = 'focus' | 'hover'

// Single app-wide queue. Only one toast is visible at a time: a new one replaces the old.
const current = ref<Toast | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let duration = DEFAULT_TOAST_DURATION
// While the toast is focused or hovered it stays (WCAG 2.2.1); the timer restarts afterwards.
const holds = new Set<ToastHold>()
// Element that had focus when the toast appeared; focus goes back there if the toast hides while focused.
let returnFocusTo: HTMLElement | null = null
let nextId = 1

function startTimer(id: number): void {
  clearTimeout(timer)
  timer = setTimeout(() => dismiss(id), duration)
}

/** Moves focus out of a toast that is about to disappear, so it does not fall to <body>. */
function rescueFocus(): void {
  if (typeof document === 'undefined') return
  const active = document.activeElement
  // Reka may already have moved focus from the action button to the (empty) toast region.
  if (!(active instanceof HTMLElement) || !active.closest('.toast-layer')) return
  // While a sheet is open, focus must stay inside the topmost one (it traps focus anyway).
  const sheets = document.querySelectorAll<HTMLElement>('[role="dialog"][data-state="open"]')
  const sheet = sheets[sheets.length - 1]
  const target = returnFocusTo
  if (target?.isConnected && (!sheet || sheet.contains(target)) && !target.closest('.toast-layer')) {
    target.focus()
    return
  }
  // The trigger is gone (e.g. a deleted entry's button): fall back to the open sheet, if any.
  sheet?.focus()
}

function dismiss(id?: number): void {
  if (id !== undefined && current.value?.id !== id) return
  clearTimeout(timer)
  rescueFocus()
  holds.clear()
  returnFocusTo = null
  current.value = null
}

function show(text: string, options: ToastOptions = {}): number {
  const active = typeof document === 'undefined' ? null : document.activeElement
  // A toast replacing a focused toast keeps the original trigger.
  if (!(active instanceof HTMLElement && active.closest('.toast-layer'))) {
    returnFocusTo = active instanceof HTMLElement && active !== document.body ? active : null
  }
  const id = nextId++
  holds.clear()
  duration = options.duration ?? DEFAULT_TOAST_DURATION
  current.value = { id, text, actionLabel: options.actionLabel, onAction: options.onAction }
  startTimer(id)
  return id
}

/** Pauses the dismiss timer (focus entered or pointer is over the toast). */
function hold(reason: ToastHold): void {
  if (!current.value) return
  holds.add(reason)
  clearTimeout(timer)
}

/** Ends a pause; once neither focus nor pointer is on the toast, it gets a fresh full duration. */
function release(reason: ToastHold): void {
  if (!holds.delete(reason) || holds.size > 0 || !current.value) return
  startTimer(current.value.id)
}

function runAction(): void {
  const toast = current.value
  if (!toast) return
  dismiss(toast.id)
  toast.onAction?.()
}

export function useToast() {
  return {
    /** The visible toast, or null. Rendered by ToastHost. */
    current: readonly(current),
    /** Shows a toast and returns its id. */
    show,
    /** Hides the toast (only if `id` matches, when given). */
    dismiss,
    /** Runs the visible toast's action and hides it. Used by ToastHost. */
    runAction,
    /** Pauses / resumes auto-hide while the toast is focused or hovered. Used by ToastHost. */
    hold,
    release,
  }
}
