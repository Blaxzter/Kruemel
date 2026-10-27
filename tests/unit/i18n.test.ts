import { describe, expect, it } from 'vitest'
import { buildMessages, i18n, setLocale } from '@/i18n'

describe('i18n', () => {
  it('namespaces locale files by file name', () => {
    const messages = buildMessages({
      './locales/de/today.json': { title: 'Heute' },
      './locales/en/today.json': { title: 'Today' },
      './locales/fr/today.json': { title: 'ignored' },
    })
    expect(messages.de.today).toEqual({ title: 'Heute' })
    expect(messages.en.today).toEqual({ title: 'Today' })
    expect(Object.keys(messages)).toEqual(['de', 'en'])
  })

  it('loads the real common namespace in German by default', () => {
    expect(i18n.global.locale.value).toBe('de')
    expect(i18n.global.t('common.nav.today')).toBe('Heute')
    expect(i18n.global.t('tiles.fruit')).toBe('Obst')
  })

  it('switches locale and keeps <html lang> in sync', async () => {
    setLocale('en')
    await Promise.resolve()
    expect(i18n.global.t('common.nav.week')).toBe('Week')
    expect(document.documentElement.lang).toBe('en')
    setLocale('de')
    await Promise.resolve()
    expect(document.documentElement.lang).toBe('de')
  })

  it('reads naturally for a single tap on a tile', () => {
    const { t } = i18n.global
    expect(t('today.tiles.aria', { tile: 'Obst', n: 1 }, 1)).toBe('Obst, heute einmal')
    expect(t('today.tiles.aria', { tile: 'Obst', n: 3 }, 3)).toBe('Obst, heute 3-mal')
    expect(t('today.tiles.aria', { tile: 'Fruit', n: 1 }, { locale: 'en', plural: 1 })).toBe('Fruit, once today')
    expect(t('today.tiles.aria', { tile: 'Fruit', n: 3 }, { locale: 'en', plural: 3 })).toBe('Fruit, 3 times today')
  })

  it('uses "log" for adding an entry in English, like the onboarding', () => {
    const { t } = i18n.global
    expect(t('intro.tap.toast', {}, { locale: 'en' })).toMatch(/logged/)
    expect(t('today.toast.added', { tile: 'Fruit' }, { locale: 'en' })).toBe('Fruit logged')
    expect(t('describe.justLog', {}, { locale: 'en' })).toBe('Just log it')
  })

  it('has the same keys in every locale', () => {
    const keys = (obj: unknown, prefix = ''): string[] =>
      typeof obj === 'object' && obj !== null
        ? Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
        : [prefix]
    const files = import.meta.glob<unknown>('/src/locales/*/*.json', { eager: true, import: 'default' })
    const byNs = new Map<string, Record<string, string[]>>()
    for (const [path, content] of Object.entries(files)) {
      const [, lang, ns] = /locales\/([^/]+)\/([^/]+)\.json$/.exec(path) ?? []
      if (!lang || !ns) continue
      const entry = byNs.get(ns) ?? {}
      entry[lang] = keys(content).sort()
      byNs.set(ns, entry)
    }
    for (const [ns, langs] of byNs) {
      expect(langs.en, `en/${ns}.json`).toEqual(langs.de)
    }
  })
})
