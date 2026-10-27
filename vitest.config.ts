import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Kept separate from vite.config.ts so the PWA plugin does not run during unit tests.
export default defineConfig({
  plugins: [
    vue(),
    {
      // src/i18n.ts uses import.meta.glob over the locale folder. Its cache key only covers its
      // own source, so a new locale file would not show up from the fs module cache.
      name: 'kruemel:no-cache-glob-modules',
      configureVitest({ defineCacheKeyGenerator }) {
        defineCacheKeyGenerator(({ id }) => (id.replaceAll('\\', '/').endsWith('/src/i18n.ts') ? false : undefined))
      },
    },
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    restoreMocks: true,
  },
})
