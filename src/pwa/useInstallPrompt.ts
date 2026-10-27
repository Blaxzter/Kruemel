import { computed, readonly, ref, type ComputedRef, type Ref } from 'vue'

/** Chromium's install prompt event (not in lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>
}

type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

/**
 * Which manual steps to show when there is no install prompt to trigger:
 * - `ios`: Share > "Zum Home-Bildschirm" (every iOS browser).
 * - `chrome`: Chrome on Android, menu ⋮ > "App installieren".
 * - `samsung`: Samsung Internet, menu ≡ > "Seite hinzufügen zu" > "Startbildschirm".
 * - `firefox`: Firefox on Android, menu ⋮ > "Installieren".
 * - `inApp`: a browser inside another app (WhatsApp, Instagram, Android WebView, ...),
 *   which cannot install apps: open the page in the real browser first.
 * - `other`: any other browser, generic menu hint.
 */
export type InstallGuide = 'ios' | 'chrome' | 'samsung' | 'firefox' | 'inApp' | 'other'

/** What the install UI shows: the prompt button, a manual guide, or nothing left to do. */
export type InstallMode = 'prompt' | 'installed' | InstallGuide

/**
 * iOS detection. iPadOS reports itself as a Mac, so touch support decides there.
 * Since iOS 16.4 every iOS browser (Safari, Chrome, Firefox, Edge) offers
 * "Zum Home-Bildschirm" in its share menu, and none fires `beforeinstallprompt`.
 */
function isIosDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

// Android WebView ("; wv)") and the in-app browsers of social and messaging apps.
const IN_APP = /; wv\)|\bFBAN\/|\bFBAV\/|\bFB_IAB\/|\bInstagram\b|\bWhatsApp\b|\bLine\/|\bGSA\/|\bSnapchat\b|\bmusical_ly\b|\bBytedanceWebview\b|\bTwitter\b/

/** Picks the manual install steps for a browser from its user agent. */
export function detectInstallGuide(userAgent: string, platform = '', maxTouchPoints = 0): InstallGuide {
  if (IN_APP.test(userAgent)) return 'inApp'
  if (isIosDevice(userAgent, platform, maxTouchPoints)) return 'ios'
  if (/SamsungBrowser\//.test(userAgent)) return 'samsung'
  const android = /Android/.test(userAgent)
  if (android && /Firefox\//.test(userAgent)) return 'firefox'
  if (android && /Chrome\//.test(userAgent) && !/EdgA\/|OPR\/|YaBrowser\/|UCBrowser\/|Mi(ui)?Browser\//.test(userAgent)) return 'chrome'
  return 'other'
}

const STANDALONE_QUERY = '(display-mode: standalone)'

/** True when the app already runs installed (home screen / standalone window). */
function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia?.(STANDALONE_QUERY).matches === true || nav.standalone === true
}

const deferred = ref<BeforeInstallPromptEvent | null>(null) as Ref<BeforeInstallPromptEvent | null>
const installed = ref(false)
const standalone = ref(false)
let listening = false
let standaloneMedia: MediaQueryList | null = null

function onBeforeInstallPrompt(event: Event): void {
  // Keep the browser's mini-infobar away; the app offers its own button (onboarding and settings).
  event.preventDefault()
  deferred.value = event as BeforeInstallPromptEvent
}

function onInstalled(): void {
  installed.value = true
  deferred.value = null
}

function onStandaloneChange(event: MediaQueryListEvent): void {
  standalone.value = event.matches || detectStandalone()
}

/**
 * Starts capturing `beforeinstallprompt`. Runs on import so the event is not missed;
 * importing this module early (e.g. from main.ts) catches events that fire before
 * the onboarding chunk loads. The event is kept for the whole session, so the
 * settings page can still offer it when Chrome fires it late (after some use).
 */
export function listenForInstallPrompt(): void {
  if (listening || typeof window === 'undefined') return
  listening = true
  standalone.value = detectStandalone()
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onInstalled)
  standaloneMedia = window.matchMedia?.(STANDALONE_QUERY) ?? null
  standaloneMedia?.addEventListener?.('change', onStandaloneChange)
}

listenForInstallPrompt()

/** Test helper: forget any captured prompt and listen again. */
export function resetInstallPrompt(): void {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onInstalled)
  }
  standaloneMedia?.removeEventListener?.('change', onStandaloneChange)
  standaloneMedia = null
  listening = false
  deferred.value = null
  installed.value = false
  listenForInstallPrompt()
}

export interface InstallPrompt {
  /** Shows the browser's install dialog. Resolves with the user's choice. */
  install(): Promise<InstallOutcome>
  /** What to show right now. Switches to `prompt` as soon as the browser offers one. */
  mode: ComputedRef<InstallMode>
  /** Already running as an installed app. */
  isStandalone: Readonly<Ref<boolean>>
}

export function useInstallPrompt(): InstallPrompt {
  listenForInstallPrompt()
  const nav = typeof navigator === 'undefined' ? null : navigator
  const ua = nav?.userAgent ?? ''
  const guide = detectInstallGuide(ua, nav?.platform ?? '', nav?.maxTouchPoints ?? 0)

  async function install(): Promise<InstallOutcome> {
    const event = deferred.value
    if (!event) return 'unavailable'
    // A prompt can only be used once. After a dismissal the manual guide shows instead;
    // Chrome may offer a new prompt later.
    deferred.value = null
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') installed.value = true
    return outcome
  }

  return {
    install,
    mode: computed<InstallMode>(() => {
      if (standalone.value || installed.value) return 'installed'
      if (deferred.value) return 'prompt'
      return guide
    }),
    isStandalone: readonly(standalone),
  }
}
