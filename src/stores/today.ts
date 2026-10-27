import { shallowRef, watchEffect, type Ref } from 'vue'
import { dayKey } from '@/domain/day'
import { useSettings } from './settings'

export interface TodayStore {
  /** Current diary day; follows the clock and settings.dayStartHour. Treat as read-only. */
  todayKey: Ref<string>
  now: Ref<Date>
}

const now = shallowRef(new Date())
const todayKey = shallowRef('')

// Sync flush so todayKey is correct right after a tick or a dayStartHour change.
watchEffect(
  () => {
    const key = dayKey(now.value, useSettings().settings.value.dayStartHour)
    if (key !== todayKey.value) todayKey.value = key
  },
  { flush: 'sync' },
)

let timer: ReturnType<typeof setTimeout> | undefined
let started = false

function tick(): void {
  now.value = new Date()
}

/** Fires just after each full minute; re-armed every time so sleep or drift cannot skew it. */
function schedule(): void {
  clearTimeout(timer)
  const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50
  timer = setTimeout(() => {
    tick()
    schedule()
  }, msToNextMinute)
}

function onVisibility(): void {
  if (document.visibilityState !== 'visible') return
  tick()
  schedule()
}

function start(): void {
  if (started || typeof window === 'undefined') return
  started = true
  tick()
  schedule()
  document.addEventListener('visibilitychange', onVisibility)
}

export function useToday(): TodayStore {
  start()
  return { todayKey, now }
}

/** Test helper: stop the clock so the next useToday() starts fresh (e.g. under fake timers). */
export function stopToday(): void {
  clearTimeout(timer)
  timer = undefined
  started = false
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
}
