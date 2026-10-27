/* eslint-disable vue/one-component-per-file -- small inline host and route components for the test */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { i18n } from '@/i18n'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useToast } from '@/composables/useToast'
import { db } from '@/db/db'
import { initStores, useEntries, useSettings, useToday, useWater } from '@/stores'
import { stopToday } from '@/stores/today'
import TodayView from '@/views/TodayView.vue'
import { dayKey, partOfDay } from '@/domain'

const Blank = defineComponent({ render: () => h('div') })

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: TodayView },
      { path: '/baum', component: Blank },
      { path: '/einstellungen', component: Blank },
      { path: '/kacheln', component: Blank },
    ],
  })
}

const mounted: VueWrapper[] = []

/** Store writes go through fake-indexeddb, which resolves on later macrotasks. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await flushPromises()
  }
}

async function mountToday() {
  const router = makeRouter()
  await router.push('/')
  await router.isReady()
  const Host = defineComponent({ setup: () => () => [h(TodayView), h(ToastHost)] })
  const wrapper = mount(Host, { attachTo: document.body, global: { plugins: [i18n, router] } })
  mounted.push(wrapper)
  await settle()
  return { wrapper, router }
}

const body = () => document.body
const tileButton = (id: string) => body().querySelector<HTMLButtonElement>(`[data-tile="${id}"]`)!
const badge = (id: string) => tileButton(id).querySelector('[data-testid="tile-badge"]')
const toastText = () => body().querySelector('.toast__text')?.textContent?.trim()
const todayEntries = () => useEntries().entries.value.filter((e) => e.dayKey === useToday().todayKey.value)

async function click(el: Element | null | undefined): Promise<void> {
  expect(el).toBeTruthy()
  ;(el as HTMLElement).click()
  await settle()
}

beforeAll(async () => {
  await initStores()
})

beforeEach(async () => {
  const { entries, removeEntry } = useEntries()
  for (const e of [...entries.value]) await removeEntry(e.id)
  await useSettings().update({ logMode: 'quick', showWater: true, showTree: true, name: 'Mia', onboardingDone: true })
  await useWater().setGlasses(useToday().todayKey.value, 0)
  i18n.global.locale.value = 'de'
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  for (const w of mounted.splice(0)) w.unmount()
  useToast().dismiss()
  document.body.innerHTML = ''
})

describe('TodayView', () => {
  it('shows the empty first day state', async () => {
    const { wrapper } = await mountToday()
    expect(wrapper.text()).toContain('Was gab es heute?')
    expect(wrapper.text()).toContain('Tipp unten auf eine Kachel')
    expect(wrapper.find('h1').text()).toMatch(/, Mia$/)
    const pill = wrapper.find('[data-testid="tree-pill"]')
    expect(pill.attributes('href')).toBe('/baum')
    expect(pill.attributes('aria-label')).toBe('Mein Baum, noch keine Blätter')
    expect(wrapper.find('[data-testid="settings-link"]').attributes('href')).toBe('/einstellungen')
    expect(wrapper.find('[data-testid="custom-tile"]').attributes('href')).toBe('/kacheln?neu=1')
    expect(wrapper.findAll('[data-tile]')).toHaveLength(8)
    expect(wrapper.findAll('[data-testid="tile-badge"]')).toHaveLength(0)
  })

  it('quick mode: tapping a tile adds an entry and shows the toast', async () => {
    const { wrapper } = await mountToday()
    await click(tileButton('fruit'))
    expect(todayEntries().map((e) => e.tileId)).toEqual(['fruit'])
    expect(toastText()).toBe('Obst eingetragen')
    expect(wrapper.text()).toContain('1 Sache heute')
    expect(wrapper.find('[data-testid="tree-pill"]').attributes('aria-label')).toBe('Mein Baum, 1 Blatt')
  })

  it('undo in the toast removes the entry again', async () => {
    await mountToday()
    await click(tileButton('veg'))
    expect(todayEntries()).toHaveLength(1)
    const undo = body().querySelector('.toast__action')
    expect(undo?.textContent?.trim()).toBe('Rückgängig')
    await click(undo)
    expect(todayEntries()).toHaveLength(0)
    expect(toastText()).toBeUndefined()
    expect(badge('veg')).toBeNull()
  })

  it('shows per-tile counts as badges', async () => {
    await mountToday()
    await click(tileButton('bread'))
    await click(tileButton('bread'))
    await click(tileButton('drink'))
    expect(badge('bread')?.textContent).toBe('2')
    expect(badge('drink')?.textContent).toBe('1')
    expect(badge('fruit')).toBeNull()
    expect(tileButton('bread').getAttribute('aria-label')).toBe('Brot, heute 2-mal')
    expect(tileButton('fruit').getAttribute('aria-label')).toBe('Obst')
  })

  it('describe mode opens the sheet; "Speichern" saves note and mood', async () => {
    await useSettings().update({ logMode: 'describe' })
    await mountToday()
    await click(tileButton('meal'))
    expect(todayEntries()).toHaveLength(0)

    const dialog = body().querySelector('[role="dialog"]')!
    expect(dialog).toBeTruthy()
    expect(dialog.querySelector('h2')?.textContent).toBe('Warmes Essen')
    expect(dialog.textContent).toContain('Gerade eben')

    const textarea = dialog.querySelector('textarea')!
    textarea.value = 'Nudeln mit Pesto'
    textarea.dispatchEvent(new Event('input'))
    await click(dialog.querySelector('[data-mood="yum"]'))
    expect(dialog.querySelector('[data-mood="yum"]')?.getAttribute('aria-pressed')).toBe('true')
    await click(dialog.querySelector('[data-testid="describe-save"]'))

    const [saved] = todayEntries()
    expect(saved).toMatchObject({ tileId: 'meal', note: 'Nudeln mit Pesto', mood: 'yum' })
    expect(toastText()).toBe('Warmes Essen eingetragen')
  })

  it('describe mode: a double tap on "Speichern" logs only once', async () => {
    await useSettings().update({ logMode: 'describe' })
    await mountToday()
    await click(tileButton('fruit'))
    const save = body().querySelector<HTMLButtonElement>('[data-testid="describe-save"]')!
    save.click()
    save.click()
    await settle()
    expect(todayEntries()).toHaveLength(1)
  })

  it('a failed save shows a friendly message instead of vanishing silently', async () => {
    vi.spyOn(db.entries, 'add').mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await mountToday()
    await click(tileButton('fruit'))
    expect(todayEntries()).toHaveLength(0)
    expect(badge('fruit')).toBeNull()
    expect(toastText()).toBe('Das hat gerade nicht geklappt und wurde nicht gespeichert. Bitte versuch es noch einmal.')
  })

  it('before the day start the header shows the diary day, not the calendar date', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 28, 0, 30))
    stopToday()
    const { wrapper } = await mountToday()
    expect(useToday().todayKey.value).toBe('2026-10-27')
    expect(wrapper.text()).toContain('Dienstag, 27. Oktober')
    expect(wrapper.text()).not.toContain('28. Oktober')
    stopToday()
  })

  it('describe mode: "Nur eintragen" adds without note, and recent notes appear as chips', async () => {
    await useSettings().update({ logMode: 'describe' })
    await useEntries().addEntry('meal', { note: 'Tomatensuppe' })
    await mountToday()
    await click(tileButton('meal'))

    const dialog = body().querySelector('[role="dialog"]')!
    // The note is optional: opening must not focus the textarea (and pop up the keyboard).
    expect(document.activeElement?.tagName).not.toBe('TEXTAREA')
    expect(document.activeElement).toBe(dialog.querySelector('[data-testid="describe-close"]'))
    const chip = Array.from(dialog.querySelectorAll('.chip')).find((c) => c.textContent?.trim() === 'Tomatensuppe')
    expect(chip).toBeTruthy()
    await click(dialog.querySelector('[data-testid="describe-just-log"]'))

    const entries = todayEntries()
    expect(entries).toHaveLength(2)
    expect(entries[1]?.note).toBeUndefined()
    expect(entries[1]?.mood).toBeUndefined()
  })

  it('a part column opens a sheet listing entries, and delete removes one', async () => {
    const { wrapper } = await mountToday()
    await click(tileButton('fruit'))
    await click(tileButton('sweets'))
    useToast().dismiss()

    const nowAt = new Date()
    const part = partOfDay({ at: nowAt.getTime(), dayKey: dayKey(nowAt, useSettings().settings.value.dayStartHour) })
    const column = wrapper.find(`[data-part="${part}"]`)
    // Named by its content plus a hidden hint, so the name contains the visible text (WCAG 2.5.3).
    expect(column.attributes('aria-label')).toBeUndefined()
    expect(column.text()).toMatch(/, 2 Einträge, öffnen$/)
    expect(column.text()).toContain('Obst')
    await click(column.element)

    const dialog = body().querySelector('[role="dialog"]')!
    // Initial focus is on "Fertig", never on a delete button (Enter twice must not delete).
    expect(document.activeElement?.textContent?.trim()).toBe('Fertig')
    expect(document.activeElement?.classList.contains('entry__delete')).toBe(false)
    const rows = dialog.querySelectorAll('.entry')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.textContent).toContain('Obst')
    expect(rows[0]?.querySelector('.entry__time')?.textContent).toMatch(/^\d{1,2}:\d{2}$/)

    const del = rows[0]!.querySelector<HTMLButtonElement>('.entry__delete')!
    expect(del.getAttribute('aria-label')).toMatch(/^Obst um \d{1,2}:\d{2} löschen$/)
    del.focus()
    await click(del)

    expect(todayEntries().map((e) => e.tileId)).toEqual(['sweets'])
    expect(dialog.querySelectorAll('.entry')).toHaveLength(1)
    // Focus stays in the sheet, on the row that moved up.
    expect(document.activeElement?.classList.contains('entry__delete')).toBe(true)

    await click(dialog.querySelector('.entry__delete'))
    expect(dialog.textContent).toContain('Hier ist noch nichts eingetragen.')
    expect(document.activeElement?.textContent?.trim()).toBe('Fertig')
  })

  it('deleting from a part sheet can be undone from the toast', async () => {
    const { wrapper } = await mountToday()
    await click(tileButton('bread'))
    useToast().dismiss()
    const before = todayEntries()
    const nowAt = new Date()
    const part = partOfDay({ at: nowAt.getTime(), dayKey: dayKey(nowAt, useSettings().settings.value.dayStartHour) })
    await click(wrapper.find(`[data-part="${part}"]`).element)

    await click(body().querySelector('[role="dialog"] .entry__delete'))
    expect(todayEntries()).toHaveLength(0)
    expect(toastText()).toBe('Brot gelöscht')

    await click(body().querySelector('.toast__action'))
    expect(todayEntries()).toEqual(before)
    expect(body().querySelectorAll('[role="dialog"] .entry')).toHaveLength(1)
  })

  it('water: tap to fill, tap the last filled glass to unset', async () => {
    const { wrapper } = await mountToday()
    await click(wrapper.find('[data-glass="3"]').element)
    expect(useWater().glassesFor(useToday().todayKey.value)).toBe(3)
    expect(wrapper.text()).toContain('3 von 8 Gläsern')
    expect(wrapper.find('[data-glass="3"]').attributes('aria-pressed')).toBe('true')
    await click(wrapper.find('[data-glass="3"]').element)
    expect(useWater().glassesFor(useToday().todayKey.value)).toBe(2)
  })

  it('hides water and tree pill when switched off', async () => {
    await useSettings().update({ showWater: false, showTree: false })
    const { wrapper } = await mountToday()
    expect(wrapper.find('[data-glass="1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tree-pill"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="settings-link"]').exists()).toBe(true)
  })

  it('collapses a column with more than 3 entries to 2 + "+N mehr"', async () => {
    const { wrapper } = await mountToday()
    for (const id of ['fruit', 'veg', 'bread', 'meal', 'snack']) await click(tileButton(id))
    const nowAt = new Date()
    const part = partOfDay({ at: nowAt.getTime(), dayKey: dayKey(nowAt, useSettings().settings.value.dayStartHour) })
    const column = wrapper.find(`[data-part="${part}"]`)
    expect(column.findAll('.column__item')).toHaveLength(2)
    expect(column.find('.column__more').text()).toBe('+3 mehr')
    expect(wrapper.text()).toContain('5 Sachen heute')
    expect(wrapper.text()).toContain('Läuft')
  })
})
