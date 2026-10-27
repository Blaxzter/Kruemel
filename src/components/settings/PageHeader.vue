<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

/** Page header with a round back link and the page's h1 (Tree, Settings, Tiles). */
defineProps<{ title: string; backTo: RouteLocationRaw; backLabel: string }>()
</script>

<template>
  <header class="page-header">
    <RouterLink :to="backTo" class="page-header__back" :aria-label="backLabel">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </RouterLink>
    <h1 class="page-header__title">{{ title }}</h1>
    <slot />
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  /* On narrow screens an extra (slot) pill moves to its own line instead of squeezing the title. */
  flex-wrap: wrap;
  gap: var(--space-2);
}

.page-header__back {
  flex: none;
  width: var(--touch-target);
  height: var(--touch-target);
  border-radius: 22px;
  background: var(--color-card);
  color: var(--color-ink);
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-header__back:hover {
  color: var(--color-ink);
}

.page-header__title {
  /* Takes its natural width (wrapping only if it alone is wider than the line beside the back link). */
  flex: 1 0 auto;
  max-width: calc(100% - var(--touch-target) - var(--space-2));
  font-size: 28px;
}
</style>
