<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TreeView from '@/tree/TreeView.vue'

/** "Mein Baum" summary with a small tree thumbnail. */
defineProps<{ leaves: number; newThisWeek: number; seed: number }>()

const { t } = useI18n()
</script>

<template>
  <section class="mini-card">
    <h2 class="mini-card__title">
      <RouterLink to="/baum" class="mini-card__link">{{ t('week.treeCard.title') }}</RouterLink>
    </h2>
    <RouterLink to="/baum" class="tree-thumb" :aria-label="t('week.treeCard.open')">
      <TreeView :leaves="leaves" :seed="seed" season="auto" time="auto" :size="90" still />
    </RouterLink>
    <p class="mini-card__text">
      {{ t('week.treeCard.newLeaves', { n: newThisWeek }, newThisWeek) }}
      <b>{{ t('week.treeCard.total', { n: leaves }) }}</b>
    </p>
  </section>
</template>

<style scoped src="./miniCard.css"></style>

<style scoped>
.tree-thumb {
  /* Above the title link's card-wide touch area, so it keeps its own focus ring. */
  position: relative;
  z-index: 1;
  align-self: center;
  display: block;
  width: 90px;
  height: 110px;
  border-radius: var(--radius-xs);
}
</style>
