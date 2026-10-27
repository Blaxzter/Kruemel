// Test helpers for the SCREENS views (imported by *.test.ts only).
import { defineComponent, h, type Component } from 'vue'
import { RouterView, createMemoryHistory, createRouter, type Router } from 'vue-router'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { i18n, setLocale } from '@/i18n'
import { initStores, useSettings } from '@/stores'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import type { Settings } from '@/domain/types'

// Every other route renders an empty placeholder.
const Blank: Component = { name: 'BlankRoute', render: () => h('div', { 'data-testid': 'blank-route' }) }
const Host = defineComponent({ name: 'TestHost', render: () => h(RouterView) })

const PATHS = ['/', '/woche', '/vielfalt', '/baum', '/einstellungen', '/kacheln', '/willkommen']

/** Resets settings (and the UI locale) to defaults plus `patch`. */
export async function resetSettings(patch: Partial<Settings> = {}): Promise<void> {
  await initStores()
  await useSettings().update({ ...DEFAULT_SETTINGS, onboardingDone: true, ...patch })
  setLocale('de')
}

/**
 * Mounts a view at `path` inside a memory router whose other routes are blank, with the
 * real i18n. TreeView is stubbed so these tests do not depend on the tree renderer.
 */
export async function mountView(view: Component, path: string): Promise<{ wrapper: VueWrapper; router: Router }> {
  const target = path.split('?')[0]
  const router = createRouter({
    history: createMemoryHistory(),
    routes: PATHS.map((p) => ({ path: p, component: p === target ? view : Blank })),
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { plugins: [i18n, router], stubs: { TreeView: true } },
  })
  await settle()
  return { wrapper, router }
}

/** Elements teleported into <body> (bottom sheets). */
export function inBody<T extends Element = HTMLElement>(selector: string): T | null {
  return document.body.querySelector<T>(selector)
}

/**
 * Waits for store writes to land. The stores write through to IndexedDB (fake-indexeddb in
 * tests), which resolves over several macrotasks, so flushPromises alone is not enough.
 */
export async function settle(rounds = 8): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await flushPromises()
  }
}
