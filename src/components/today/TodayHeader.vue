<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

defineProps<{
  dateLabel: string
  greeting: string
  leafCount: number
  showTree: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <header class="today-header">
    <div class="today-header__text">
      <span class="today-header__date">{{ dateLabel }}</span>
      <h1 class="today-header__greeting">{{ greeting }}</h1>
    </div>
    <div class="today-header__actions">
      <RouterLink
        v-if="showTree"
        to="/baum"
        class="tree-pill"
        data-testid="tree-pill"
        :aria-label="t('today.treePill', { n: leafCount }, leafCount)"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="tree-pill__leaf">
          <path d="M12 21v-6" />
          <path d="M12 15c-4.5 0-7-2.5-7-6a7 7 0 0 1 14 0c0 3.5-2.5 6-7 6z" class="tree-pill__leaf-fill" />
          <path d="M12 15l-2.5-3M12 13l3-3" />
        </svg>
        <span aria-hidden="true">{{ leafCount }}</span>
      </RouterLink>
      <RouterLink to="/einstellungen" class="round-button" data-testid="settings-link" :aria-label="t('today.settings')">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false">
          <path d="M4 7h9M18 7h2M4 17h3M12 17h8" />
          <circle cx="15.5" cy="7" r="2.5" />
          <circle cx="9.5" cy="17" r="2.5" />
        </svg>
      </RouterLink>
    </div>
  </header>
</template>

<style scoped>
.today-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-3);
}

.today-header__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.today-header__date {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-muted);
}

.today-header__greeting {
  font-size: 26px;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.today-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: none;
}

.tree-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--touch-target);
  background: var(--color-card);
  border-radius: var(--radius-pill);
  padding: 0 14px 0 10px;
  font-weight: 800;
  font-size: 15px;
  color: var(--color-ink);
  text-decoration: none;
}

.tree-pill:hover {
  color: var(--color-ink);
}

.tree-pill__leaf {
  stroke: var(--color-leaf);
}

.tree-pill__leaf-fill {
  fill: var(--color-leaf-fill);
}

.round-button {
  width: var(--touch-target);
  height: var(--touch-target);
  border-radius: 50%;
  background: var(--color-card);
  color: var(--color-ink);
  display: flex;
  align-items: center;
  justify-content: center;
}

.round-button:hover {
  color: var(--color-ink);
}
</style>
