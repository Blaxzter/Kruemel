import type { App } from 'vue'
import { i18n } from '@/i18n'
import { useToast } from './useToast'

/**
 * Friendly toast for a failed action, almost always a storage write (quota full, storage
 * evicted, private mode). The stores have already rolled memory back, so the tap simply
 * did not happen; this tells the user instead of letting it vanish silently.
 */
export function showErrorToast(err: unknown): void {
  console.error(err)
  useToast().show(i18n.global.t('common.error.failed'))
}

/** Wraps a promise so a rejection shows the error toast instead of going unhandled. */
export function withErrorToast(task: Promise<unknown>): void {
  task.catch(showErrorToast)
}

/** Last-resort fallback for errors no caller handled (Vue handlers and floating promises). */
export function installErrorToasts(app: App): void {
  app.config.errorHandler = (err) => showErrorToast(err)
  window.addEventListener('unhandledrejection', (event) => showErrorToast(event.reason))
}
