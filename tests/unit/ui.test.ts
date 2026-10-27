import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type Component } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { i18n } from '@/i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import TileIcon from '@/components/ui/TileIcon.vue'
import { ICON_NAMES } from '@/domain/tiles'
import { useToast } from '@/composables/useToast'
import { useSheetStack } from '@/composables/sheetStack'

const mounted: VueWrapper[] = []

function mountInBody(component: Component, props?: Record<string, unknown>): VueWrapper {
  const wrapper = mount(component, { props, attachTo: document.body, global: { plugins: [i18n] } })
  mounted.push(wrapper)
  return wrapper
}

afterEach(() => {
  // Unmount before wiping the DOM, so teleports can remove their own nodes.
  for (const w of mounted.splice(0)) w.unmount()
  useToast().dismiss()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

/** Reka's focus scope and toast wiring settle over a few ticks and a macrotask. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await flushPromises()
  }
}

const key = (k: string, init: KeyboardEventInit = {}) =>
  (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }))

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')

describe('BottomSheet', () => {
  function mountSheet(props: Record<string, unknown> = {}) {
    const open = ref(false)
    const Host = defineComponent({
      setup: () => () => [
        h('button', { id: 'opener', onClick: () => (open.value = true) }, 'open'),
        h(
          BottomSheet,
          { open: open.value, title: 'Morgens', ...props, onClose: () => (open.value = false) },
          { default: () => [h('button', { id: 'inner' }, 'inner')] },
        ),
      ],
    })
    const wrapper = mountInBody(Host)
    return { wrapper, open }
  }

  it('is a labelled modal dialog that takes and returns focus', async () => {
    const { open } = mountSheet()
    const opener = document.getElementById('opener') as HTMLButtonElement
    opener.focus()
    opener.click()
    await settle()

    const panel = dialog()!
    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(panel.dataset.state).toBe('open')
    const title = document.getElementById(panel.getAttribute('aria-labelledby') ?? '')
    expect(title?.tagName).toBe('H2')
    expect(title?.textContent).toBe('Morgens')
    // No description given: no dangling aria-describedby.
    expect(panel.hasAttribute('aria-describedby')).toBe(false)
    // The content's first control, not the header's "Fertig".
    expect(document.activeElement?.id).toBe('inner')
    // A visible drag handle, hidden from assistive tech.
    expect(panel.querySelector('.sheet__handle')?.getAttribute('aria-hidden')).toBe('true')

    key('Escape')
    await settle()
    expect(open.value).toBe(false)
    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('closes from its "Fertig" button and supports an h1 title and a description', async () => {
    const { open } = mountSheet({ headingLevel: 1, description: 'Alles von heute Morgen' })
    open.value = true
    await settle()
    const panel = dialog()!
    expect(document.getElementById(panel.getAttribute('aria-labelledby')!)?.tagName).toBe('H1')
    expect(document.getElementById(panel.getAttribute('aria-describedby')!)?.textContent).toBe('Alles von heute Morgen')

    ;(panel.querySelector('.sheet__close') as HTMLButtonElement).click()
    await settle()
    expect(open.value).toBe(false)
  })

  it('focuses `initialFocus` when given', async () => {
    const { open } = mountSheet({ initialFocus: '.sheet__close' })
    open.value = true
    await settle()
    expect(document.activeElement?.classList.contains('sheet__close')).toBe(true)
  })

  it('hides the page behind from assistive tech while open', async () => {
    const app = document.createElement('div')
    app.id = 'app'
    document.body.append(app)
    const { open } = mountSheet()
    open.value = true
    await settle()
    expect(app.getAttribute('aria-hidden')).toBe('true')
    expect(useSheetStack().anySheetOpen.value).toBe(true)
    open.value = false
    await settle()
    expect(app.hasAttribute('aria-hidden')).toBe(false)
    expect(useSheetStack().anySheetOpen.value).toBe(false)
  })

  it('moves a visible undo toast into the sheet, so it stays reachable, and makes room for it', async () => {
    const app = document.createElement('div')
    app.id = 'app'
    document.body.append(app)
    mountInBody(ToastHost)
    const { open } = mountSheet()
    open.value = true
    await settle()
    const panel = dialog()!
    const scroller = panel.querySelector('.sheet__scroll')!
    expect(scroller.classList.contains('sheet__scroll--toast')).toBe(false)

    useToast().show('Obst gelöscht', { actionLabel: 'Rückgängig', onAction: () => {} })
    await settle()
    expect(scroller.classList.contains('sheet__scroll--toast')).toBe(true)
    const undo = document.querySelector('.toast__action') as HTMLButtonElement
    // Inside the dialog: in its focus trap and accessibility tree, not under an aria-hidden node.
    expect(panel.contains(undo)).toBe(true)
    expect(undo.closest('[aria-hidden="true"]')).toBeNull()
    expect(undo.closest('[inert]')).toBeNull()
    expect(app.getAttribute('aria-hidden')).toBe('true')

    // The focus trap loops: Shift+Tab from the first control lands on the toast's action.
    const done = panel.querySelector('.sheet__close') as HTMLButtonElement
    done.focus()
    key('Tab', { shiftKey: true })
    await settle()
    expect(document.activeElement).toBe(undo)

    // Esc on the focused toast closes only the toast, not the sheet.
    key('Escape')
    await settle()
    expect(useToast().current.value).toBeNull()
    expect(open.value).toBe(true)
    expect(panel.contains(document.activeElement)).toBe(true)

    // Back in <body> once the sheet closes.
    useToast().show('Obst gelöscht', { actionLabel: 'Rückgängig' })
    open.value = false
    await settle()
    const toast = document.querySelector('.toast')!
    expect(toast.closest('.toast-layer')?.parentElement).toBe(document.body)
  })

  it('never leaves the page aria-hidden after sheets were opened, closed and unmounted (route changes)', async () => {
    const app = document.createElement('div')
    app.id = 'app'
    document.body.append(app)
    // Each round is one route with its own sheet: open, close, then the page (and sheet) unmounts.
    for (let round = 0; round < 3; round++) {
      const { wrapper, open } = mountSheet()
      open.value = true
      await settle()
      expect(app.getAttribute('aria-hidden')).toBe('true')
      open.value = false
      await settle()
      expect(app.hasAttribute('aria-hidden')).toBe(false)
      wrapper.unmount()
      mounted.splice(mounted.indexOf(wrapper), 1)
      await settle()
      expect(app.hasAttribute('aria-hidden')).toBe(false)
    }
  })

  it('uses the design shape of its variant', async () => {
    const { open } = mountSheet({ variant: 'form' })
    open.value = true
    await settle()
    expect(dialog()!.classList.contains('sheet--form')).toBe(true)
  })
})

describe('ToastHost', () => {
  it('announces each toast through a polite status region that is not aria-hidden', async () => {
    mountInBody(ToastHost)
    await settle()
    const status = document.querySelector<HTMLElement>('[role="status"]')!
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(status.closest('[aria-hidden="true"]')).toBeNull()
    expect(status.textContent).toBe('')

    useToast().show('Obst eingetragen', { actionLabel: 'Rückgängig' })
    await settle()
    await vi.waitFor(() => expect(status.textContent).toBe('Obst eingetragen. Rückgängig mit Strg+Z'))

    // The same text again is announced again: the region is cleared first.
    useToast().show('Obst eingetragen')
    await nextTick()
    expect(status.textContent).toBe('')
    await vi.waitFor(() => expect(status.textContent).toBe('Obst eingetragen'))

    useToast().dismiss()
    await nextTick()
    expect(status.textContent).toBe('')
  })
})

describe('TileIcon', () => {
  it('renders every icon as a decorative svg', () => {
    for (const name of ICON_NAMES) {
      const wrapper = mount(TileIcon, { props: { name } })
      expect(wrapper.attributes('aria-hidden')).toBe('true')
      expect(wrapper.findAll('path, circle').length).toBeGreaterThan(0)
      wrapper.unmount()
    }
  })
})

describe('useToast', () => {
  it('shows, runs the action and auto-hides', () => {
    vi.useFakeTimers()
    const toast = useToast()
    const onAction = vi.fn()
    toast.show('Obst eingetragen', { actionLabel: 'Rückgängig', onAction })
    expect(toast.current.value?.text).toBe('Obst eingetragen')
    toast.runAction()
    expect(onAction).toHaveBeenCalledOnce()
    expect(toast.current.value).toBeNull()

    toast.show('Hallo')
    vi.advanceTimersByTime(3500)
    expect(toast.current.value).toBeNull()
    vi.useRealTimers()
  })

  it('stays while focused or hovered and gets a fresh duration afterwards (WCAG 2.2.1)', () => {
    vi.useFakeTimers()
    const toast = useToast()
    toast.show('Obst eingetragen', { actionLabel: 'Rückgängig' })
    toast.hold('focus')
    toast.hold('hover')
    vi.advanceTimersByTime(10_000)
    expect(toast.current.value).not.toBeNull()
    toast.release('focus')
    vi.advanceTimersByTime(10_000)
    expect(toast.current.value).not.toBeNull()
    toast.release('hover')
    vi.advanceTimersByTime(3000)
    expect(toast.current.value).not.toBeNull()
    vi.advanceTimersByTime(500)
    expect(toast.current.value).toBeNull()
  })
})

describe('ToastHost', () => {
  it('renders the toast in a labelled region with an announced message', async () => {
    mountInBody(ToastHost)
    useToast().show('Obst eingetragen', { actionLabel: 'Rückgängig' })
    await settle()
    const region = document.querySelector('[role="region"]')!
    expect(region.getAttribute('aria-label')).toBe('Hinweise')
    expect(region.querySelector('.toast__text')?.textContent).toBe('Obst eingetragen')
    const undo = region.querySelector('.toast__action')!
    expect(undo.textContent?.trim()).toBe('Rückgängig')
    expect(undo.getAttribute('aria-keyshortcuts')).toBe('Control+Z')
    // Reka's polite announcer names the shortcut instead of reading the button label.
    await vi.waitFor(() => expect(document.querySelector('[role="alert"][aria-live="polite"]')?.textContent).toContain('Obst eingetragen'))
    const announcer = document.querySelector('[role="alert"][aria-live="polite"]')!
    expect(announcer.textContent).toContain('Hinweis')
    expect(announcer.textContent).toContain('Rückgängig mit Strg+Z')
  })

  it('pauses on focus and returns focus to the trigger when it hides', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    mountInBody(ToastHost)
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const toast = useToast()
    toast.show('Obst eingetragen', { actionLabel: 'Rückgängig' })
    await nextTick()
    await nextTick()
    const undo = document.querySelector('.toast__action') as HTMLButtonElement
    undo.focus()
    vi.advanceTimersByTime(10_000)
    expect(toast.current.value).not.toBeNull()

    toast.dismiss()
    expect(document.activeElement).toBe(trigger)
  })

  it('runs the action once when its button is pressed', async () => {
    mountInBody(ToastHost)
    const onAction = vi.fn()
    useToast().show('Obst eingetragen', { actionLabel: 'Rückgängig', onAction })
    await settle()
    ;(document.querySelector('.toast__action') as HTMLButtonElement).click()
    await settle()
    expect(onAction).toHaveBeenCalledOnce()
    expect(useToast().current.value).toBeNull()
  })

  it('ignores Esc unless the toast has focus', async () => {
    mountInBody(ToastHost)
    useToast().show('Obst eingetragen', { actionLabel: 'Rückgängig' })
    await settle()
    key('Escape')
    await settle()
    expect(useToast().current.value).not.toBeNull()
    ;(document.querySelector('.toast__action') as HTMLButtonElement).focus()
    key('Escape')
    await settle()
    expect(useToast().current.value).toBeNull()
  })

  it('runs the toast action on Ctrl+Z, but not while typing', async () => {
    mountInBody(ToastHost)
    const onAction = vi.fn()
    useToast().show('Obst eingetragen', { actionLabel: 'Rückgängig', onAction })
    await nextTick()
    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    expect(onAction).not.toHaveBeenCalled()
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }))
    expect(onAction).toHaveBeenCalledOnce()
    expect(useToast().current.value).toBeNull()
  })
})
