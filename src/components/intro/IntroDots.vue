<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/** Step indicator ("Schritt 2 von 4"). */
defineProps<{ step: number; total: number }>()

const { t } = useI18n()
</script>

<template>
  <div class="dots" role="img" :aria-label="t('intro.stepOf', { n: step, total })">
    <span v-for="n in total" :key="n" class="dots__dot" :class="{ 'dots__dot--on': n === step }"></span>
  </div>
</template>

<style scoped>
.dots {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.dots__dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: var(--color-line);
  transition: width var(--duration-fast) var(--ease-out);
}

.dots__dot--on {
  width: 22px;
  background: var(--color-accent);
}
</style>
