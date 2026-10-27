<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import BottomNav from '@/components/ui/BottomNav.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import { setLocale } from '@/i18n'
import { useSettings } from '@/stores'
import { useThemeSync } from '@/composables/useTheme'
import { useSheetStack } from '@/composables/sheetStack'
import { updateDocumentTitle } from '@/router'

const route = useRoute()
const { settings } = useSettings()

const showNav = computed(() => route.meta.tab === true)
const { anySheetOpen } = useSheetStack()
// Above the nav on tab pages; at the bottom edge while a sheet covers the nav (the sheet makes room).
const toastOffset = computed(() =>
  showNav.value && !anySheetOpen.value ? 'calc(88px + env(safe-area-inset-bottom))' : 'calc(20px + env(safe-area-inset-bottom))',
)

// Design frames differ in top padding (Main 28, Week 24, Tree/Settings/Variety 20).
const shellStyle = computed(() => (route.meta.padTop === undefined ? undefined : { '--page-pad-top': `${route.meta.padTop}px` }))

useThemeSync(() => settings.value.theme)
watchEffect(() => {
  setLocale(settings.value.locale)
  // The router only sets the title on navigation, so refresh it when the language changes.
  updateDocumentTitle(route.meta.titleKey)
})
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--with-nav': showNav, 'app-shell--fixed': route.meta.fixedHeight === true }" :style="shellStyle">
    <RouterView />
    <div v-if="showNav" class="app-shell__nav">
      <BottomNav />
    </div>
  </div>
  <ToastHost :bottom-offset="toastOffset" />
</template>

<style scoped>
.app-shell {
  max-width: var(--page-max-width);
  /* 100vh first for browsers without dvh (iOS Safari < 15.4, Chrome < 108). */
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(var(--page-pad-top) + env(safe-area-inset-top)) var(--page-pad-x) calc(20px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

/* Exactly one screen high (safe-area padding included); the page scrolls inside itself. */
.app-shell--fixed {
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
}

.app-shell--with-nav {
  /* Room for the fixed nav (56px) plus its 20px gap. */
  padding-bottom: calc(96px + env(safe-area-inset-bottom));
}

.app-shell__nav {
  position: fixed;
  left: 50%;
  bottom: calc(20px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(100% - 2 * var(--page-pad-x), var(--page-max-width) - 2 * var(--page-pad-x));
  z-index: 30;
}
</style>
