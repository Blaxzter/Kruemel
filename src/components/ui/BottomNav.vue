<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

/** The two main tabs. Vielfalt is reached from its card on the Week screen. */
const { t } = useI18n()

const items = computed(() => [
  { to: '/', label: t('common.nav.today') },
  { to: '/woche', label: t('common.nav.week') },
])
</script>

<template>
  <nav class="bottom-nav" :aria-label="t('common.nav.label')">
    <!-- RouterLink sets aria-current="page" on the exact-active link. -->
    <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="bottom-nav__link" exact-active-class="is-active">
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  display: flex;
  background: var(--color-inverse);
  border-radius: var(--radius-pill);
  padding: 6px;
}

.bottom-nav__link {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--touch-target);
  border-radius: var(--radius-pill);
  color: var(--color-inverse-ink);
  font: 700 14px var(--font-body);
  text-decoration: none;
}

.bottom-nav__link:hover {
  color: var(--color-inverse-ink);
}

.bottom-nav__link.is-active {
  background: var(--color-card);
  color: var(--color-ink);
  font-weight: 800;
}

.bottom-nav__link:focus-visible {
  outline-color: var(--color-inverse-ink);
  outline-offset: -3px;
}

/* The active pill is card-coloured, the same as --color-inverse-ink in light mode: use ink there. */
.bottom-nav__link.is-active:focus-visible {
  outline-color: var(--color-ink);
}
</style>
