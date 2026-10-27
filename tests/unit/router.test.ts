import { beforeEach, describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import { nextTick } from 'vue'
import { createAppRouter, focusPageHeading, updateDocumentTitle } from '@/router'
import { resetSettings } from '@/components/week/__tests__/testkit'

beforeEach(async () => {
  await resetSettings()
  window.history.replaceState(null, '', '/')
})

async function landOn(path: string): Promise<string> {
  const router = createAppRouter()
  await router.push(path)
  return router.currentRoute.value.path
}

describe('route meta', () => {
  it('gives each page the top padding of its design frame', () => {
    const padTop = Object.fromEntries(createAppRouter().getRoutes().map((r) => [r.path, r.meta.padTop]))
    expect(padTop).toMatchObject({ '/': undefined, '/woche': 24, '/vielfalt': 20, '/baum': 20, '/einstellungen': 20, '/kacheln': 20 })
  })
})

describe('router guard', () => {
  it('sends every route to onboarding until it is done', async () => {
    await resetSettings({ onboardingDone: false })
    expect(await landOn('/woche')).toBe('/willkommen')
    expect(await landOn('/willkommen')).toBe('/willkommen')
  })

  it('opens the pages once onboarding is done, and the intro stays reachable for a replay', async () => {
    expect(await landOn('/baum')).toBe('/baum')
    expect(await landOn('/vielfalt')).toBe('/vielfalt')
    expect(await landOn('/willkommen')).toBe('/willkommen')
  })

  it('sends switched-off features back to Today', async () => {
    await resetSettings({ showColors: false, showTree: false })
    expect(await landOn('/vielfalt')).toBe('/')
    expect(await landOn('/farben')).toBe('/')
    expect(await landOn('/baum')).toBe('/')
  })

  it('sends the old /farben address to /vielfalt', async () => {
    expect(await landOn('/farben')).toBe('/vielfalt')
  })

  it('makes only Today and Week tabs; Vielfalt is a page of its own', () => {
    const tabs = createAppRouter().getRoutes().filter((r) => r.meta.tab).map((r) => r.path)
    expect(tabs.sort()).toEqual(['/', '/woche'])
  })

  it('redirects unknown paths to Today', async () => {
    expect(await landOn('/gibt-es-nicht')).toBe('/')
  })
})

describe('document title', () => {
  it('follows the route and the language', async () => {
    await landOn('/einstellungen')
    expect(document.title).toBe(`Einstellungen · ${i18n.global.t('common.appName')}`)
    setLocale('en')
    updateDocumentTitle('common.pageTitle.settings')
    expect(document.title).toMatch(/^Settings · /)
  })
})

describe('focus after navigation', () => {
  it('moves focus to the new page heading, but leaves a focused nav link alone', () => {
    const app = document.createElement('div')
    app.id = 'app'
    app.innerHTML = '<nav class="bottom-nav"><a href="/woche" id="nav-week">Woche</a></nav><main><h1>Deine Woche</h1></main>'
    document.body.append(app)
    const heading = app.querySelector('h1') as HTMLElement

    ;(app.querySelector('#nav-week') as HTMLElement).focus()
    focusPageHeading()
    expect(document.activeElement?.id).toBe('nav-week')

    ;(document.activeElement as HTMLElement).blur()
    focusPageHeading()
    expect(document.activeElement).toBe(heading)
    expect(heading.getAttribute('tabindex')).toBe('-1')
    app.remove()
  })

  it('focuses the heading after a real route change', async () => {
    const app = document.createElement('div')
    app.id = 'app'
    app.innerHTML = '<h1>Mein Baum</h1>'
    document.body.append(app)
    const router = createAppRouter()
    await router.push('/')
    expect(document.activeElement).not.toBe(app.querySelector('h1'))
    await router.push('/baum')
    await nextTick()
    expect(document.activeElement).toBe(app.querySelector('h1'))
    app.remove()
  })
})
