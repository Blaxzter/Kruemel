import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { THEME_COLORS, applyThemeColorMetas } from '@/composables/useTheme'

const root = resolve(__dirname, '../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function setMetas(html: string): void {
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove())
  document.head.insertAdjacentHTML('beforeend', html)
}

function metaColors(): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    out[m.getAttribute('media') ?? 'none'] = m.getAttribute('content')
  })
  return out
}

const LIGHT = '(prefers-color-scheme: light)'
const DARK = '(prefers-color-scheme: dark)'

afterEach(() => setMetas(''))

describe('theme-color metas', () => {
  it('ship one colour per system theme in index.html, so a dark phone starts with a dark status bar', () => {
    const html = read('index.html')
    const metas = [...html.matchAll(/<meta name="theme-color" media="([^"]+)" content="([^"]+)"/g)].map((m) => [m[1], m[2]])
    expect(metas).toEqual([
      [LIGHT, THEME_COLORS.light],
      [DARK, THEME_COLORS.dark],
    ])
    // No unscoped meta that would win in both themes.
    expect(html).not.toMatch(/<meta name="theme-color" content=/)
  })

  it('match the ground colour of each theme in tokens.css', () => {
    const grounds = [...read('src/styles/tokens.css').matchAll(/--color-ground:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1]!.toUpperCase())
    expect(grounds[0]).toBe(THEME_COLORS.light)
    expect(grounds.slice(1).every((g) => g === THEME_COLORS.dark)).toBe(true)
  })

  it('keep their own theme for "system" and both follow a forced theme', () => {
    setMetas(`<meta name="theme-color" media="${LIGHT}" content="x"><meta name="theme-color" media="${DARK}" content="x">`)

    applyThemeColorMetas('system', false)
    expect(metaColors()).toEqual({ [LIGHT]: THEME_COLORS.light, [DARK]: THEME_COLORS.dark })

    applyThemeColorMetas('dark', false)
    expect(metaColors()).toEqual({ [LIGHT]: THEME_COLORS.dark, [DARK]: THEME_COLORS.dark })

    applyThemeColorMetas('light', true)
    expect(metaColors()).toEqual({ [LIGHT]: THEME_COLORS.light, [DARK]: THEME_COLORS.light })

    applyThemeColorMetas('system', true)
    expect(metaColors()).toEqual({ [LIGHT]: THEME_COLORS.light, [DARK]: THEME_COLORS.dark })
  })

  it('also handle a single unscoped meta', () => {
    setMetas('<meta name="theme-color" content="x">')
    applyThemeColorMetas('system', true)
    expect(metaColors()).toEqual({ none: THEME_COLORS.dark })
  })
})

describe('manifest colours', () => {
  // The installed app's Android navigation bar uses the manifest colours only (theme_color up to
  // Android 14, background_color from 15), with no dark variant. A light colour there gave a light
  // bar in dark mode; the colour has to carry light system icons in both themes.
  it('are dark enough for light navigation bar icons in both themes', () => {
    const config = read('vite.config.ts')
    const theme = /const THEME_COLOR = '(#[0-9A-Fa-f]{6})'/.exec(config)?.[1]
    const background = /const BACKGROUND_COLOR = '(#[0-9A-Fa-f]{6})'/.exec(config)?.[1]
    expect(config).toMatch(/theme_color: THEME_COLOR/)
    expect(config).toMatch(/background_color: BACKGROUND_COLOR/)
    for (const color of [theme, background]) {
      expect(color).toBeDefined()
      expect(color!.toUpperCase()).not.toBe(THEME_COLORS.light)
      // Contrast with white icons of at least 3:1.
      expect((1 + 0.05) / (luminance(color!) + 0.05)).toBeGreaterThanOrEqual(3)
    }
  })

  it('match the dark ground, so the navigation bar is dark in dark mode', () => {
    const config = read('vite.config.ts')
    expect(/const THEME_COLOR = '(#[0-9A-Fa-f]{6})'/.exec(config)?.[1]?.toUpperCase()).toBe(THEME_COLORS.dark.toUpperCase())
    expect(/const BACKGROUND_COLOR = '(#[0-9A-Fa-f]{6})'/.exec(config)?.[1]?.toUpperCase()).toBe(THEME_COLORS.dark.toUpperCase())
  })
})
