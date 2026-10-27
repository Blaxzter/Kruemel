import { onScopeDispose, watchEffect, ref } from 'vue'
import type { Settings } from '@/domain/types'

/** --color-ground of each theme (tokens.css); also in index.html's theme-color metas. */
export const THEME_COLORS = { light: '#F6F3FF', dark: '#15122A' } as const

type ThemeName = keyof typeof THEME_COLORS

/** The theme a media-scoped theme-color meta stands for, from its media query. */
function metaTheme(meta: Element): ThemeName | null {
  const media = meta.getAttribute('media') ?? ''
  if (/prefers-color-scheme:\s*dark/.test(media)) return 'dark'
  if (/prefers-color-scheme:\s*light/.test(media)) return 'light'
  return null
}

/**
 * Sets every <meta name="theme-color"> for the in-app choice. index.html ships one meta per
 * system theme (media-scoped), so the status bar is right before the app runs. For 'system'
 * each meta keeps its own theme's colour and the browser picks by media query; for a forced
 * theme both get that theme's colour, so it wins over the system setting.
 */
export function applyThemeColorMetas(choice: Settings['theme'], systemDark: boolean): void {
  const effective: ThemeName = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const own = metaTheme(meta)
    const color = choice === 'system' && own ? THEME_COLORS[own] : THEME_COLORS[effective]
    meta.setAttribute('content', color)
  })
}

/**
 * Applies settings.theme to <html>: data-theme="light|dark" for an explicit choice,
 * no attribute for 'system' (tokens.css then follows prefers-color-scheme).
 * Also keeps <meta name="theme-color"> matching the effective theme.
 */
export function useThemeSync(theme: () => Settings['theme']): void {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  const systemDark = ref(media?.matches ?? false)
  const onChange = (e: MediaQueryListEvent) => (systemDark.value = e.matches)
  media?.addEventListener('change', onChange)
  onScopeDispose(() => media?.removeEventListener('change', onChange))

  watchEffect(() => {
    const choice = theme()
    const root = document.documentElement
    if (choice === 'system') delete root.dataset.theme
    else root.dataset.theme = choice
    applyThemeColorMetas(choice, systemDark.value)
  })
}
