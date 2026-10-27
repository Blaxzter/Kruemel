import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Colours from the design (ground light #F6F3FF / dark #15122A, accent #6B4EFF).
// An installed app on Android takes its navigation bar colour from the manifest only: theme_color
// up to Android 14, background_color (the window behind the page) from Android 15. The manifest
// cannot carry a dark variant and the page cannot change it at runtime, so one colour has to serve
// both themes. The dark ground is used: the bar matches the page in dark mode (the field test
// asked for exactly that), and a dark bar under the light page still looks calm. The violet tried
// before gave a bright strip under the dark page. <meta name="theme-color"> (index.html,
// useThemeSync) still matches the status bar to the page. background_color is also the splash
// screen behind the icon. Installed apps pick a manifest change up on reinstall or Chrome's update.
const THEME_COLOR = '#15122A'
const BACKGROUND_COLOR = '#15122A'

export default defineConfig({
  plugins: [
    vue(),
    // Precompiles src/locales/**/*.json (also when loaded through import.meta.glob in src/i18n.ts)
    // into message functions, so the runtime message compiler can be left out of the bundle.
    VueI18nPlugin({
      include: fileURLToPath(new URL('./src/locales/**', import.meta.url)),
      runtimeOnly: true,
      dropMessageCompiler: true,
      compositionOnly: true,
      fullInstall: true,
    }),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // globPatterns below already precaches every icon (the plugin adds the manifest); listing them again
      // (includeAssets / manifest icons) only duplicated the precache entries.
      includeManifestIcons: false,
      manifest: {
        // Stable app identity, independent of start_url.
        id: '/',
        name: 'Krümel',
        short_name: 'Krümel',
        description: 'Dein kleines Essenstagebuch. Alles bleibt auf deinem Handy.',
        lang: 'de',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // Control the page on the first install, so lazy page chunks come from the cache
        // straight away (offline after the first load). Updates still wait for the prompt.
        clientsClaim: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
  preview: { port: 4173, strictPort: true },
  server: { port: 5173 },
})
