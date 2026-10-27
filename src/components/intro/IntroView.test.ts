import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, type VueWrapper } from '@vue/test-utils'
import { useSettings } from '@/stores'
import IntroView from '@/views/IntroView.vue'
import { detectInstallGuide, resetInstallPrompt } from '@/pwa/useInstallPrompt'
import { mountView, resetSettings, settle } from '@/components/week/__tests__/testkit'

beforeEach(async () => {
  await resetSettings({ onboardingDone: false, treeSeed: 1 })
  resetInstallPrompt()
})

enableAutoUnmount(afterEach)

function fakeInstallPrompt(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  const prompt = vi.fn(async () => {})
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome, platform: 'web' }) })
  return { event, prompt }
}

async function clickFinish(wrapper: VueWrapper): Promise<void> {
  const later = wrapper.find('[data-testid="intro-finish"]')
  expect(later.text()).toBe('Später, erst mal ausprobieren')
  await later.trigger('click')
  await settle()
}

function mockUserAgent(ua: string): void {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
}

const UA = {
  androidChrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
  webView: 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  instagram: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0 Android',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneWhatsApp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/24.20',
  desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  edgeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 EdgA/130.0.0.0',
}

async function clickPrimary(wrapper: VueWrapper): Promise<void> {
  await wrapper.find('[data-testid="intro-next"]').trigger('click')
  await settle()
}

describe('IntroView', () => {
  it('walks through the steps and finishes onboarding', async () => {
    const { wrapper, router } = await mountView(IntroView, '/willkommen')
    expect(wrapper.find('h1').text()).toBe('Hallo!')
    expect(wrapper.find('[role="img"][aria-label="Schritt 1 von 4"]').exists()).toBe(true)

    await wrapper.find('#intro-name').setValue('  Mia ')
    await wrapper.find('#intro-day').setValue('5')
    await clickPrimary(wrapper)
    expect(wrapper.find('h1').text()).toBe('Tippen, fertig')
    expect(document.activeElement?.textContent).toBe('Tippen, fertig')

    await clickPrimary(wrapper)
    expect(wrapper.find('h1').text()).toBe('Dein Baum')
    await clickPrimary(wrapper)
    expect(wrapper.find('h1').text()).toBe('Hol dir die App aufs Handy')

    // No install prompt (yet): the manual steps and "Später", never a bare screen.
    expect(wrapper.find('[data-testid="install-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="install-guide"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="intro-next"]').exists()).toBe(false)
    await clickFinish(wrapper)

    const { settings } = useSettings()
    expect(settings.value.onboardingDone).toBe(true)
    expect(settings.value.name).toBe('Mia')
    expect(settings.value.dayStartHour).toBe(5)
    expect(settings.value.treeSeed).toBeGreaterThanOrEqual(1)
    expect(settings.value.treeSeed).toBeLessThanOrEqual(999)
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('"Überspringen" jumps to the install step', async () => {
    const { wrapper } = await mountView(IntroView, '/willkommen')
    const skip = wrapper.findAll('button').find((b) => b.text() === 'Überspringen')
    await skip!.trigger('click')
    await settle()
    expect(wrapper.find('h1').text()).toBe('Hol dir die App aufs Handy')
    expect(wrapper.findAll('button').some((b) => b.text() === 'Überspringen')).toBe(false)
  })

  it('shows the install button only once the browser offers a prompt', async () => {
    const { wrapper, router } = await mountView(IntroView, '/willkommen')
    for (let i = 0; i < 3; i++) await clickPrimary(wrapper)
    expect(wrapper.find('[data-testid="install-button"]').exists()).toBe(false)

    const { event, prompt } = fakeInstallPrompt('accepted')
    window.dispatchEvent(event)
    await settle()

    expect(event.defaultPrevented).toBe(true)
    const button = wrapper.find('[data-testid="install-button"]')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('App installieren')
    expect(wrapper.find('[data-testid="intro-finish"]').text()).toBe('Später, erst mal ausprobieren')

    await button.trigger('click')
    await settle()
    expect(prompt).toHaveBeenCalledOnce()
    expect(useSettings().settings.value.onboardingDone).toBe(true)
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('stays on the step when the install dialog is dismissed', async () => {
    const { wrapper, router } = await mountView(IntroView, '/willkommen')
    const { event } = fakeInstallPrompt('dismissed')
    window.dispatchEvent(event)
    for (let i = 0; i < 3; i++) await clickPrimary(wrapper)

    await wrapper.find('[data-testid="install-button"]').trigger('click')
    await settle()
    expect(router.currentRoute.value.path).toBe('/willkommen')
    // A prompt can be used once: the manual steps take its place, "Später" stays.
    expect(wrapper.find('[data-testid="install-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="install-guide"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="intro-finish"]').exists()).toBe(true)
  })

  it('shows the Chrome menu steps and "Später" on Android when no prompt fired (first 30 s)', async () => {
    mockUserAgent(UA.androidChrome)
    const { wrapper } = await mountView(IntroView, '/willkommen')
    for (let i = 0; i < 3; i++) await clickPrimary(wrapper)
    const guide = wrapper.find('[data-testid="install-guide"]')
    expect(guide.attributes('data-guide')).toBe('chrome')
    expect(guide.text()).toContain('Tipp oben rechts auf ⋮')
    expect(guide.text()).toContain('App installieren')
    expect(wrapper.find('[data-testid="intro-finish"]').exists()).toBe(true)

    // The prompt arrives while the step is open: the button replaces the steps.
    window.dispatchEvent(fakeInstallPrompt('accepted').event)
    await settle()
    expect(wrapper.find('[data-testid="install-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="install-guide"]').exists()).toBe(false)
  })

  it('tells in-app browsers to open the page in the real browser first', async () => {
    mockUserAgent(UA.instagram)
    const { wrapper } = await mountView(IntroView, '/willkommen')
    for (let i = 0; i < 3; i++) await clickPrimary(wrapper)
    const guide = wrapper.find('[data-testid="install-guide"]')
    expect(guide.attributes('data-guide')).toBe('inApp')
    expect(guide.text()).toContain('Im Browser öffnen')
  })

  it('says it is done when the app gets installed from the browser menu', async () => {
    const { wrapper } = await mountView(IntroView, '/willkommen')
    for (let i = 0; i < 3; i++) await clickPrimary(wrapper)
    window.dispatchEvent(new Event('appinstalled'))
    await settle()
    expect(wrapper.find('[data-testid="install-done"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="intro-finish"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="intro-next"]').text()).toBe("Los geht's")
  })

  it('shows the share-menu guide on iOS, also in Chrome for iOS', async () => {
    mockUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1',
    )
    const { wrapper } = await mountView(IntroView, '/willkommen')
    for (let i = 0; i < 3; i++) await clickPrimary(wrapper)
    const guide = wrapper.find('[data-testid="ios-guide"]')
    expect(guide.exists()).toBe(true)
    expect(guide.text()).toContain('Tipp in deinem Browser auf')
    expect(wrapper.find('[data-testid="intro-finish"]').exists()).toBe(true)
  })

  it('keeps the existing tree seed when the intro is replayed', async () => {
    await resetSettings({ onboardingDone: true, treeSeed: 321 })
    const { wrapper } = await mountView(IntroView, '/willkommen')
    for (let i = 0; i < 3; i++) await clickPrimary(wrapper)
    await clickFinish(wrapper)
    expect(useSettings().settings.value.treeSeed).toBe(321)
  })
})

describe('detectInstallGuide on iOS', () => {
  it('recognises every iOS browser, including iPadOS desktop mode', () => {
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
    const chromeIos = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1'
    const android = 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
    const firefoxIos = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15'
    expect(detectInstallGuide(iphone)).toBe('ios')
    expect(detectInstallGuide(ipad, 'MacIntel', 5)).toBe('ios')
    expect(detectInstallGuide(ipad, 'MacIntel', 0)).not.toBe('ios')
    // Since iOS 16.4 third-party browsers add to the home screen from the share menu too.
    expect(detectInstallGuide(chromeIos)).toBe('ios')
    expect(detectInstallGuide(firefoxIos)).toBe('ios')
    expect(detectInstallGuide(android)).not.toBe('ios')
  })
})

describe('detectInstallGuide', () => {
  it('picks the manual install steps per browser', () => {
    expect(detectInstallGuide(UA.androidChrome)).toBe('chrome')
    expect(detectInstallGuide(UA.samsung)).toBe('samsung')
    expect(detectInstallGuide(UA.firefoxAndroid)).toBe('firefox')
    expect(detectInstallGuide(UA.webView)).toBe('inApp')
    expect(detectInstallGuide(UA.instagram)).toBe('inApp')
    expect(detectInstallGuide(UA.iphoneWhatsApp)).toBe('inApp')
    expect(detectInstallGuide(UA.iphone)).toBe('ios')
    expect(detectInstallGuide(UA.edgeAndroid)).toBe('other')
    expect(detectInstallGuide(UA.desktopChrome)).toBe('other')
  })
})
