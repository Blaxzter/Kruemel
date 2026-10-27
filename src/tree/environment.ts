import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Tracks the user's reduced-motion preference. The CSS media query already stops
 * the animations; this lets the component also drop the animation classes, so the
 * fresh leaf is never rendered at scale(0) and tests can assert the behaviour.
 */
export function usePrefersReducedMotion(): Ref<boolean> {
  const media = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION_QUERY) : null
  const reduced = ref(media?.matches ?? false)
  const onChange = (event: MediaQueryListEvent): void => {
    reduced.value = event.matches
  }
  onMounted(() => media?.addEventListener?.('change', onChange))
  onBeforeUnmount(() => media?.removeEventListener?.('change', onChange))
  return reduced
}

/**
 * A clock that refreshes every minute and when the page becomes visible again,
 * so 'auto' season and time of day follow the real clock.
 */
export function useMinuteClock(): Ref<Date> {
  const now = ref(new Date())
  const tick = (): void => {
    now.value = new Date()
  }
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') tick()
  }
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    timer = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', onVisibility)
  })
  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  })
  return now
}
