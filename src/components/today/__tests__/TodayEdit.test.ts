/* eslint-disable vue/one-component-per-file -- small inline host and route components for the test */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'
import { i18n } from '@/i18n'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useToast } from '@/composables/useToast'
import { initStores, useEntries, useSettings, useTiles, useToday } from '@/stores'
import { moveTileToVisibleIndex } from '@/components/tiles/reorder'
import TodayView from '@/views/TodayView.vue'
import { LONG_PRESS_MS } from '../longPress'
import { DRAG_HOLD_MS } from '../useTileGestures'

const Blank = defineComponent({ render: () => h('div', { 'data-testid': 'blank' }) })
const BUILTIN = ['fruit', 'veg', 'bread', 'meal', 'snack', 'sweets', 'dairy', 'drink']

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
  const Host = defineComponent({ setup: () => () => [h(RouterView), h(ToastHost)] })
  const wrapper = mount(Host, { attachTo: document.body, global: { plugins: [i18n, router] } })
  mounted.push(wrapper)
  await settle()
  return { wrapper, router }
}

const body = () => document.body
const tileEl = (id: string) => body().querySelector<HTMLButtonElement>(`[data-tile="${id}"]`)!
const grid = () => body().querySelector<HTMLElement>('[data-testid="tile-grid"]')!
const isEditing = () => grid().dataset.editing === 'true'
const todayEntries = () => useEntries().entries.value.filter((e) => e.dayKey === useToday().todayKey.value)
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function pointer(el: Element, type: string, x = 10, y = 10, extra: Record<string, unknown> = {}): void {
  const init = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, ...extra }
  const event = typeof PointerEvent === 'function' ? new PointerEvent(type, init) : new MouseEvent(type, init)
  for (const [key, value] of Object.entries({ pointerId: 1, pointerType: 'touch', ...extra })) {
    if (!(key in event) || (event as unknown as Record<string, unknown>)[key] !== value) Object.defineProperty(event, key, { value })
  }
  el.dispatchEvent(event)
}

/** Finger down, rest, finger up, then the click the browser sends after a touch. */
async function longPress(el: Element, ms = LONG_PRESS_MS + 60): Promise<void> {
  pointer(el, 'pointerdown')
  await wait(ms)
  pointer(el, 'pointerup')
  ;(el as HTMLElement).click()
  await settle()
}

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
  const { tiles, updateTile } = useTiles()
  // Builtin tiles shown with their own names; custom tiles from earlier tests stay out of the way.
  for (const t of tiles.value) {
    if (t.builtinKey && (t.hidden || t.name)) await updateTile(t.id, { hidden: false, name: null })
    else if (!t.builtinKey && !t.hidden) await updateTile(t.id, { hidden: true })
  }
  for (const [i, id] of BUILTIN.entries()) await moveTileToVisibleIndex(id, i)
  i18n.global.locale.value = 'de'
})

afterEach(() => {
  vi.restoreAllMocks()
  for (const w of mounted.splice(0)) w.unmount()
  useToast().dismiss()
  document.body.innerHTML = ''
})

describe('Today tile edit mode', () => {
  it('a long press enters edit mode and never logs an entry', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    await mountToday()
    await longPress(tileEl('fruit'))
    expect(isEditing()).toBe(true)
    expect(todayEntries()).toHaveLength(0)
    expect(vibrate).toHaveBeenCalledWith(10)
    expect(tileEl('fruit').getAttribute('aria-label')).toBe('Obst bearbeiten')
    expect(body().querySelectorAll('[data-testid="tile-pencil"]')).toHaveLength(8)
    expect(body().querySelector('[data-testid="edit-bar"]')?.textContent).toContain('Kacheln bearbeiten')
    expect(body().querySelector('[data-testid="custom-tile"]')?.textContent?.trim()).toBe('Neue Kachel')
    expect(body().querySelector('[data-testid="edit-announcer"]')?.textContent).toContain('Kacheln bearbeiten')
    Reflect.deleteProperty(navigator, 'vibrate')
  })

  it('without a click after the long press, the next tap still opens the editor', async () => {
    await mountToday()
    const el = tileEl('fruit')
    pointer(el, 'pointerdown')
    await wait(LONG_PRESS_MS + 60)
    pointer(el, 'pointerup')
    await settle()
    expect(isEditing()).toBe(true)
    pointer(el, 'pointerdown', 10, 10, { pointerType: 'mouse' })
    pointer(el, 'pointerup', 10, 10, { pointerType: 'mouse' })
    await click(el)
    expect(body().querySelector('[role="dialog"] h2')?.textContent).toBe('Kachel bearbeiten')
    expect(todayEntries()).toHaveLength(0)
  })

  it('releasing early is a normal tap and logs the tile', async () => {
    await mountToday()
    await longPress(tileEl('veg'), 200)
    expect(isEditing()).toBe(false)
    expect(todayEntries().map((e) => e.tileId)).toEqual(['veg'])
  })

  it('moving the finger more than 10px cancels the long press', async () => {
    await mountToday()
    const el = tileEl('bread')
    pointer(el, 'pointerdown', 10, 10)
    pointer(el, 'pointermove', 10, 30)
    await wait(LONG_PRESS_MS + 60)
    pointer(el, 'pointercancel', 10, 30)
    await settle()
    expect(isEditing()).toBe(false)
    expect(todayEntries()).toHaveLength(0)
  })

  it('the context menu is suppressed on tiles and the menu key enters edit mode', async () => {
    await mountToday()
    const el = tileEl('meal')
    el.focus()
    const ctx = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    el.dispatchEvent(ctx)
    await settle()
    expect(ctx.defaultPrevented).toBe(true)
    expect(isEditing()).toBe(true)

    await click(body().querySelector('[data-testid="edit-done"]'))
    expect(isEditing()).toBe(false)
    // Focus stays in the grid after "Fertig" disappears.
    expect(document.activeElement?.closest('[data-testid="tile-grid"]')).toBeTruthy()

    tileEl('meal').dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true }))
    await settle()
    expect(isEditing()).toBe(true)
    expect(todayEntries()).toHaveLength(0)
  })

  it('in edit mode a tap opens the editor; rename saves; Fertig ends edit mode', async () => {
    await mountToday()
    await longPress(tileEl('snack'))
    await click(tileEl('snack'))
    expect(todayEntries()).toHaveLength(0)
    const dialog = body().querySelector('[role="dialog"]')!
    expect(dialog.querySelector('h2')?.textContent).toBe('Kachel bearbeiten')
    expect(dialog.querySelector('[data-testid="editor-place-text"]')?.textContent).toBe('Platz 5 von 8')
    // Builtin tiles can be hidden, never deleted.
    expect(dialog.querySelector('[data-testid="editor-hide"]')).toBeTruthy()
    expect(dialog.querySelector('[data-testid="editor-delete"]')).toBeNull()

    const input = dialog.querySelector<HTMLInputElement>('#tile-editor-name')!
    input.value = 'Knabberzeug'
    input.dispatchEvent(new Event('input'))
    await click(dialog.querySelector('button[type="submit"]'))
    expect(useTiles().tiles.value.find((t) => t.id === 'snack')?.name).toBe('Knabberzeug')
    expect(body().querySelector('[role="dialog"]')).toBeNull()
    expect(isEditing()).toBe(true)
    expect(tileEl('snack').getAttribute('aria-label')).toBe('Knabberzeug bearbeiten')

    await click(body().querySelector('[data-testid="edit-done"]'))
    expect(isEditing()).toBe(false)
    await click(tileEl('snack'))
    expect(todayEntries().map((e) => e.tileId)).toEqual(['snack'])
  })

  it('Esc leaves edit mode, but Esc on an open editor only closes the editor', async () => {
    await mountToday()
    await longPress(tileEl('fruit'))
    await click(tileEl('fruit'))
    expect(body().querySelector('[role="dialog"]')).toBeTruthy()
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await settle()
    expect(body().querySelector('[role="dialog"]')).toBeNull()
    expect(isEditing()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle()
    expect(isEditing()).toBe(false)
  })

  it('leaving the route ends edit mode', async () => {
    const { router } = await mountToday()
    await longPress(tileEl('fruit'))
    expect(isEditing()).toBe(true)
    await router.push('/baum')
    await settle()
    await router.push('/')
    await settle()
    expect(isEditing()).toBe(false)
  })

  it('the editor moves a tile earlier and later, and the order persists', async () => {
    await mountToday()
    await longPress(tileEl('veg'))
    await click(tileEl('veg'))
    const dialog = body().querySelector('[role="dialog"]')!
    await click(dialog.querySelector('[data-place="earlier"]'))
    expect(useTiles().visibleTiles.value.map((t) => t.id).slice(0, 2)).toEqual(['veg', 'fruit'])
    expect(dialog.querySelector('[data-testid="editor-place-text"]')?.textContent).toBe('Platz 1 von 8')
    expect(dialog.querySelector<HTMLButtonElement>('[data-place="earlier"]')?.disabled).toBe(true)
    await click(dialog.querySelector('[data-place="later"]'))
    await click(dialog.querySelector('[data-place="later"]'))
    expect(useTiles().visibleTiles.value.map((t) => t.id).slice(0, 3)).toEqual(['fruit', 'bread', 'veg'])
    const stored = (await import('@/db/db')).db.tiles
    expect((await stored.get('veg'))?.order).toBeGreaterThan((await stored.get('bread'))!.order)
  })

  it('hide from the editor removes the tile from Today, with undo', async () => {
    await mountToday()
    await longPress(tileEl('dairy'))
    await click(tileEl('dairy'))
    await click(body().querySelector('[data-testid="editor-hide"]'))
    expect(body().querySelector('[data-tile="dairy"]')).toBeNull()
    expect(body().querySelector('.toast__text')?.textContent).toBe('Milch & Co ist ausgeblendet')
    await click(body().querySelector('.toast__action'))
    expect(tileEl('dairy')).toBeTruthy()
  })

  it('a custom tile without entries can be deleted, with entries only hidden', async () => {
    const { addTile } = useTiles()
    const fresh = await addTile({ builtinKey: null, name: 'Suppe', icon: 'noodles', color: 'lemon', hidden: false })
    const used = await addTile({ builtinKey: null, name: 'Müsli', icon: 'bowl', color: 'mint', hidden: false })
    await useEntries().addEntry(used.id)
    await mountToday()
    await longPress(tileEl(fresh.id))
    await click(tileEl(fresh.id))
    expect(body().querySelector('[data-testid="editor-delete"]')).toBeTruthy()
    await click(body().querySelector('[data-testid="editor-delete"]'))
    expect(useTiles().tiles.value.some((t) => t.id === fresh.id)).toBe(false)

    await click(tileEl(used.id))
    expect(body().querySelector('[data-testid="editor-delete"]')).toBeNull()
    expect(body().querySelector('[data-testid="editor-hide"]')).toBeTruthy()
    await useTiles().deleteTile(used.id)
  })

  it('"Neue Kachel" in edit mode opens the new tile sheet right on Today', async () => {
    await mountToday()
    await longPress(tileEl('fruit'))
    await click(body().querySelector('[data-testid="custom-tile"]'))
    expect(body().querySelector('[role="dialog"] h2')?.textContent).toBe('Neue Kachel')
  })

  it('dragging a tile in edit mode moves it and persists the order', async () => {
    // jsdom has no layout: give tiles a 3 column grid of 100px cells.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.tile) {
        const i = Array.from(this.parentElement!.children).indexOf(this)
        const x = (i % 3) * 100
        const y = Math.floor(i / 3) * 100
        return { left: x, top: y, right: x + 100, bottom: y + 100, width: 100, height: 100, x, y, toJSON: () => ({}) } as DOMRect
      }
      return { left: 0, top: 0, right: 300, bottom: 300, width: 300, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    })
    await mountToday()
    await longPress(tileEl('fruit'))
    const el = tileEl('fruit')
    pointer(el, 'pointerdown', 50, 50, { pointerId: 2 })
    // A finger rests on the tile first; moving right away would be a scroll.
    await wait(DRAG_HOLD_MS + 40)
    // To the centre of the third cell in the second row (place 6).
    for (const [x, y] of [[60, 60], [120, 100], [200, 140], [250, 150]] as const) pointer(el, 'pointermove', x, y, { pointerId: 2 })
    await settle()
    expect(body().querySelector('[data-testid="tile-ghost"]')).toBeTruthy()
    expect(tileEl('fruit').classList.contains('tile--placeholder')).toBe(true)
    pointer(el, 'pointerup', 250, 150, { pointerId: 2 })
    el.click()
    await settle()
    expect(useTiles().visibleTiles.value.map((t) => t.id)).toEqual(['veg', 'bread', 'meal', 'snack', 'sweets', 'fruit', 'dairy', 'drink'])
    expect(body().querySelector('[role="dialog"]')).toBeNull()
    expect(body().querySelector('[data-testid="tile-ghost"]')).toBeNull()
    expect(Array.from(body().querySelectorAll('[data-tile]')).map((x) => (x as HTMLElement).dataset.tile)).toEqual(useTiles().visibleTiles.value.map((t) => t.id))
  })
  it('in edit mode a swipe that moves right away scrolls instead of moving the tile', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.tile) {
        const i = Array.from(this.parentElement!.children).indexOf(this)
        const x = (i % 3) * 100
        const y = Math.floor(i / 3) * 100
        return { left: x, top: y, right: x + 100, bottom: y + 100, width: 100, height: 100, x, y, toJSON: () => ({}) } as DOMRect
      }
      return { left: 0, top: 0, right: 300, bottom: 300, width: 300, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    })
    await mountToday()
    await longPress(tileEl('fruit'))
    const before = useTiles().visibleTiles.value.map((t) => t.id)
    const el = tileEl('dairy')
    pointer(el, 'pointerdown', 150, 250, { pointerId: 3 })
    for (const y of [235, 200, 120, 50]) pointer(el, 'pointermove', 150, y, { pointerId: 3 })
    await settle()
    expect(body().querySelector('[data-testid="tile-ghost"]')).toBeNull()
    pointer(el, 'pointerup', 150, 50, { pointerId: 3 })
    await settle()
    expect(useTiles().visibleTiles.value.map((t) => t.id)).toEqual(before)
    expect(isEditing()).toBe(true)
  })
  it('a tap outside the tiles ends edit mode, a tap on a tile does not', async () => {
    await mountToday()
    await longPress(tileEl('fruit'))
    expect(isEditing()).toBe(true)
    pointer(tileEl('veg'), 'pointerdown', 10, 10, { pointerId: 4 })
    pointer(tileEl('veg'), 'pointercancel', 10, 10, { pointerId: 4 })
    await settle()
    expect(isEditing()).toBe(true)
    pointer(body().querySelector('header') ?? body().querySelector('main')!, 'pointerdown', 5, 5, { pointerId: 5 })
    await settle()
    expect(isEditing()).toBe(false)
  })
})
