import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import SettingsView from '@/views/SettingsView.vue'
import { resetInstallPrompt } from '@/pwa/useInstallPrompt'
import { inBody, mountView, resetSettings, settle } from '@/components/week/__tests__/testkit'

beforeEach(async () => {
  await resetSettings()
  resetInstallPrompt()
})

enableAutoUnmount(afterEach)

const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'

function fakeInstallPrompt() {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  const prompt = vi.fn(async () => {})
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }) })
  return { event, prompt }
}

// Before, the onboarding was the only place to install, and only if Chrome had fired its
// prompt by then (it waits for some use). A prompt that came later was never shown.
describe('Settings: "App installieren"', () => {
  it('opens the manual steps when the browser has no prompt', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID_CHROME)
    const { wrapper } = await mountView(SettingsView, '/einstellungen')
    const row = wrapper.find('[data-testid="settings-install"]')
    expect(row.text()).toContain('App installieren')
    await row.trigger('click')
    await settle()
    const guide = inBody('[role="dialog"] [data-testid="install-guide"]')
    expect(guide?.getAttribute('data-guide')).toBe('chrome')
    expect(guide?.textContent).toContain('Tipp oben rechts auf ⋮')
  })

  it('uses a prompt that the browser fired after the intro', async () => {
    const { wrapper } = await mountView(SettingsView, '/einstellungen')
    const { event, prompt } = fakeInstallPrompt()
    window.dispatchEvent(event)
    await settle()
    await wrapper.find('[data-testid="settings-install"]').trigger('click')
    await settle()
    expect(prompt).toHaveBeenCalledOnce()
    // Installed: nothing left to offer.
    expect(wrapper.find('[data-testid="settings-install"]').exists()).toBe(false)
  })

  it('is hidden once the app is installed', async () => {
    const { wrapper } = await mountView(SettingsView, '/einstellungen')
    expect(wrapper.find('[data-testid="settings-install"]').exists()).toBe(true)
    window.dispatchEvent(new Event('appinstalled'))
    await settle()
    expect(wrapper.find('[data-testid="settings-install"]').exists()).toBe(false)
  })
})
