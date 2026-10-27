import { nextTick } from 'vue'
import { START_LOCATION, createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { i18n } from '@/i18n'
import { useSettings } from '@/stores'
import TodayView from '@/views/TodayView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Main tab route: App shows the bottom nav. */
    tab?: boolean
    /** i18n key for document.title. */
    titleKey?: string
    /** Top padding of the page in px, per design frame (default --page-pad-top, 28px as in Main). */
    padTop?: number
    /** The page is exactly one screen high and scrolls inside itself (onboarding), so its buttons stay on screen. */
    fixedHeight?: boolean
  }
}

const ROUTE_PATHS = {
  today: '/',
  week: '/woche',
  variety: '/vielfalt',
  /** Old name of the Vielfalt page, kept for bookmarks and installed shortcuts. */
  varietyLegacy: '/farben',
  tree: '/baum',
  settings: '/einstellungen',
  tiles: '/kacheln',
  intro: '/willkommen',
} as const

const routes: RouteRecordRaw[] = [
  { path: ROUTE_PATHS.today, name: 'today', component: TodayView, meta: { tab: true, titleKey: 'common.pageTitle.today' } },
  { path: ROUTE_PATHS.week, name: 'week', component: () => import('@/views/WeekView.vue'), meta: { tab: true, titleKey: 'common.pageTitle.week', padTop: 24 } },
  { path: ROUTE_PATHS.variety, name: 'variety', component: () => import('@/views/VarietyView.vue'), meta: { titleKey: 'common.pageTitle.variety', padTop: 20 } },
  { path: ROUTE_PATHS.varietyLegacy, redirect: ROUTE_PATHS.variety },
  { path: ROUTE_PATHS.tree, name: 'tree', component: () => import('@/views/TreePageView.vue'), meta: { titleKey: 'common.pageTitle.tree', padTop: 20 } },
  { path: ROUTE_PATHS.settings, name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { titleKey: 'common.pageTitle.settings', padTop: 20 } },
  { path: ROUTE_PATHS.tiles, name: 'tiles', component: () => import('@/views/TilesView.vue'), meta: { titleKey: 'common.pageTitle.tiles', padTop: 20 } },
  { path: ROUTE_PATHS.intro, name: 'intro', component: () => import('@/views/IntroView.vue'), meta: { titleKey: 'common.pageTitle.intro', fixedHeight: true } },
  { path: '/:pathMatch(.*)*', redirect: ROUTE_PATHS.today },
]

export function createAppRouter() {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  })

  // Onboarding first. Stores are initialised before the router is installed (see main.ts).
  router.beforeEach((to) => {
    const { settings } = useSettings()
    if (!settings.value.onboardingDone && to.path !== ROUTE_PATHS.intro) return ROUTE_PATHS.intro
    // Switched-off features have no page: the Vielfalt and tree pages go back to Today.
    if (to.path === ROUTE_PATHS.variety && !settings.value.showColors) return ROUTE_PATHS.today
    if (to.path === ROUTE_PATHS.tree && !settings.value.showTree) return ROUTE_PATHS.today
    return true
  })

  router.afterEach((to, from, failure) => {
    updateDocumentTitle(to.meta.titleKey)
    // Not on app start (nothing was focused yet) and not when only the query/hash changed.
    if (failure || from === START_LOCATION || to.path === from.path) return
    void nextTick(focusPageHeading)
  })

  return router
}

/**
 * After a route change, moves focus to the new page's h1 so screen readers announce the page
 * and keyboard users do not start again from <body>. A focused bottom-nav link keeps focus:
 * it stays on screen and switching tabs from it should not jump.
 */
export function focusPageHeading(): void {
  const active = document.activeElement
  if (active instanceof HTMLElement && active.closest('.bottom-nav') && active.isConnected) return
  const heading = document.querySelector<HTMLElement>('#app h1')
  if (!heading) return
  if (!heading.hasAttribute('tabindex')) {
    heading.setAttribute('tabindex', '-1')
    heading.setAttribute('data-route-focus', '')
  }
  heading.focus({ preventScroll: true })
}

/** Sets document.title for a route; App.vue calls it again when the locale changes. */
export function updateDocumentTitle(titleKey: string | undefined): void {
  const appName = i18n.global.t('common.appName')
  const title = titleKey ? i18n.global.t(titleKey) : ''
  document.title = title ? `${title} · ${appName}` : appName
}

