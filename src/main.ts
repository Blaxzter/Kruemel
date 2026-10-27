import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import '@/styles/base.css'
import App from './App.vue'
import { i18n, isSupportedLocale, setLocale } from './i18n'
import { createAppRouter } from './router'
import { initStores, useSettings } from './stores'
import { useToast } from './composables/useToast'
import { installErrorToasts } from './composables/errorToast'
// Imported for its side effect: starts listening for `beforeinstallprompt` before the
// lazily loaded onboarding chunk exists, so the event is not missed.
import { listenForInstallPrompt } from './pwa/useInstallPrompt'
import { installChunkErrorReload, watchForUpdates } from './pwa/updates'
import { warmTreeCache } from './tree/warmup'

listenForInstallPrompt()

/** Plain DOM message for when storage cannot be opened (no Vue app to render it). */
function showStartError(): void {
  const { t } = i18n.global
  const root = document.getElementById('app')
  if (!root) return
  const box = document.createElement('div')
  box.className = 'start-error'
  box.setAttribute('role', 'alert')
  const title = document.createElement('h1')
  title.textContent = t('common.startError.title')
  const text = document.createElement('p')
  text.textContent = t('common.startError.text')
  box.append(title, text)
  root.replaceChildren(box)
}

async function bootstrap(): Promise<void> {
  // Settings decide the first route (onboarding) and locale, so load them before routing.
  try {
    await initStores()
  } catch (err) {
    console.error('Could not open the diary storage', err)
    const browserLocale = navigator.language.slice(0, 2)
    if (isSupportedLocale(browserLocale)) setLocale(browserLocale)
    showStartError()
    return
  }

  // Apply the saved locale before the first render so the first frame is not in German by mistake.
  setLocale(useSettings().settings.value.locale)

  const app = createApp(App)
  installErrorToasts(app)
  app.use(i18n)
  const router = createAppRouter()
  // A lazy page that cannot be loaded (offline, or removed by an update) reloads once.
  installChunkErrorReload(router)
  app.use(router)
  app.mount('#app')

  // The tree pages draw this seed; onboarding picks a new one, so only warm it once that is done.
  const { onboardingDone, treeSeed } = useSettings().settings.value
  if (onboardingDone) void warmTreeCache(treeSeed)

  // Offline support. When a new version is waiting, offer a gentle reload.
  function offerReload(): void {
    const { t } = i18n.global
    useToast().show(t('common.update.available'), {
      actionLabel: t('common.update.reload'),
      onAction: () => void updateSW(true),
      duration: 15_000,
    })
  }
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: offerReload,
    // Look for new versions while the app stays open or is resumed from the background.
    onRegisteredSW(_swUrl, registration) {
      if (registration) watchForUpdates(registration, offerReload)
    },
  })
}

void bootstrap()
