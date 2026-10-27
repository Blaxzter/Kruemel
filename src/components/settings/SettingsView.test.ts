import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import { backupFileName, useSettings } from '@/stores'
import SettingsView from '@/views/SettingsView.vue'
import { inBody, mountView, resetSettings, settle } from '@/components/week/__tests__/testkit'

beforeEach(async () => {
  await resetSettings()
})

enableAutoUnmount(afterEach)

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

describe('SettingsView', () => {
  it('flips the toggles and keeps them in the settings store', async () => {
    const { wrapper } = await mountView(SettingsView, '/einstellungen')
    const switches = wrapper.findAll('[role="switch"]')
    expect(switches).toHaveLength(3)
    expect(switches.map((s) => s.attributes('aria-checked'))).toEqual(['true', 'true', 'true'])

    await switches[0]!.trigger('click')
    await switches[2]!.trigger('click')
    await settle()

    const { settings } = useSettings()
    expect(settings.value.showWater).toBe(false)
    expect(settings.value.showTree).toBe(true)
    expect(settings.value.showColors).toBe(false)
    wrapper.unmount()

    // A fresh mount reads the stored values back.
    const again = await mountView(SettingsView, '/einstellungen')
    expect(again.wrapper.findAll('[role="switch"]').map((s) => s.attributes('aria-checked'))).toEqual(['false', 'true', 'false'])
  })

  it('stores the logging mode, day start and theme', async () => {
    const { wrapper } = await mountView(SettingsView, '/einstellungen')
    await wrapper.find('input[name="log-mode"][value="describe"]').setValue(true)
    await wrapper.find('#settings-day-start').setValue('6')
    const dark = wrapper.find('[role="radio"][value="dark"]')
    expect(dark.attributes('aria-checked')).toBe('false')
    await dark.trigger('click')
    await settle()

    const { settings } = useSettings()
    expect(settings.value.logMode).toBe('describe')
    expect(settings.value.dayStartHour).toBe(6)
    expect(settings.value.theme).toBe('dark')
  })

  it('switches the language live and saves it', async () => {
    const { wrapper } = await mountView(SettingsView, '/einstellungen')
    expect(wrapper.find('h1').text()).toBe('Einstellungen')

    const english = wrapper.find('[role="radio"][value="en"]')
    await english.trigger('click')
    await settle()

    expect(i18n.global.locale.value).toBe('en')
    expect(useSettings().settings.value.locale).toBe('en')
    expect(wrapper.find('h1').text()).toBe('Settings')
    expect(document.documentElement.lang).toBe('en')
    expect(english.attributes('aria-checked')).toBe('true')
  })

  it('labels the segmented controls as radio groups with one tab stop', async () => {
    const { wrapper } = await mountView(SettingsView, '/einstellungen')
    const groups = wrapper.findAll('[role="radiogroup"]')
    const names = groups.map((g) => wrapper.find(`#${CSS.escape(g.attributes('aria-labelledby')!)}`).text())
    expect(names).toEqual(expect.arrayContaining(['Aussehen', 'Sprache']))
    const theme = groups.find((g) => g.find('[value="dark"]').exists())!
    // Roving focus: the group is one tab stop and hands focus to the selected radio.
    expect(theme.attributes('tabindex')).toBe('0')
    expect(theme.findAll('[role="radio"]').map((r) => r.attributes('tabindex'))).toEqual(['-1', '-1', '-1'])
    expect(theme.find('[data-active]').attributes('aria-checked')).toBe('true')
  })

  it('exports the diary as a valid JSON download', async () => {
    let exported: Blob | null = null
    let downloadName = ''
    URL.createObjectURL = vi.fn((blob: Blob) => {
      exported = blob
      return 'blob:kruemel-test'
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download
    })

    const { wrapper } = await mountView(SettingsView, '/einstellungen')
    const backupButton = wrapper.findAll('button').find((b) => b.text().includes('Tagebuch sichern'))
    await backupButton!.trigger('click')
    await settle()

    const dialog = inBody('[role="dialog"]')
    expect(dialog?.textContent).toContain('Tagebuch sichern')
    inBody<HTMLButtonElement>('[data-testid="backup-export"]')!.click()
    await settle()

    expect(downloadName).toBe(backupFileName())
    expect(downloadName).toMatch(/^kruemel-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(exported).not.toBeNull()
    const data = JSON.parse(await readBlob(exported!))
    expect(data.version).toBe(1)
    expect(data.settings.onboardingDone).toBe(true)
    expect(Array.isArray(data.tiles)).toBe(true)
    expect(data.tiles.length).toBeGreaterThanOrEqual(8)
    expect(Array.isArray(data.entries)).toBe(true)
    expect(Array.isArray(data.water)).toBe(true)
  })

  it('links to the tiles manager and replays the intro', async () => {
    const { wrapper, router } = await mountView(SettingsView, '/einstellungen')
    expect(wrapper.find('a[href="/kacheln"]').exists()).toBe(true)
    const intro = wrapper.findAll('button').find((b) => b.text().includes('Einführung'))
    await intro!.trigger('click')
    await settle()
    expect(router.currentRoute.value.path).toBe('/willkommen')
  })
})
