<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MAX_GLASSES } from '@/domain/settings'
import { nextGlasses } from './todayModel'

const props = defineProps<{ glasses: number }>()

const emit = defineEmits<{ set: [glasses: number] }>()

const { t } = useI18n()

const glassNumbers = computed(() => Array.from({ length: MAX_GLASSES }, (_, i) => i + 1))
</script>

<template>
  <section class="water card" aria-labelledby="today-water-title">
    <div class="water__head">
      <h2 id="today-water-title" class="water__title">{{ t('today.water.title') }}</h2>
      <span class="water__count">{{ t('today.water.count', { n: glasses, max: MAX_GLASSES }) }}</span>
    </div>
    <div class="water__glasses">
      <button
        v-for="n in glassNumbers"
        :key="n"
        type="button"
        class="glass"
        :data-glass="n"
        :aria-label="t('today.water.glass', { n })"
        :aria-pressed="n <= glasses ? 'true' : 'false'"
        @click="emit('set', nextGlasses(props.glasses, n))"
      >
        <svg width="26" height="30" viewBox="0 0 24 28" stroke-width="2" stroke-linejoin="round" aria-hidden="true" focusable="false" class="glass__svg">
          <path d="M4 3h16l-2 22H6z" :class="n <= glasses ? 'glass__body--full' : 'glass__body--empty'" />
        </svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
.card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
}

.water {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.water__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
}

.water__title {
  font-size: 17px;
}

.water__count {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-muted);
}

.water__glasses {
  display: flex;
  justify-content: space-between;
  /* Targets reach through the card padding (and 2px past it) so 8 glasses are 44px wide on a 390px phone. */
  margin: 0 calc(-1 * var(--space-4) - 2px);
}

.glass {
  flex: 1 1 0;
  max-width: var(--touch-target);
  height: var(--touch-target);
  border: 0;
  padding: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
  min-width: 0;
}

.glass:focus-visible {
  outline-offset: -2px;
}

.glass__svg {
  stroke: var(--color-water-stroke);
}

.glass__body--full {
  fill: var(--color-water-fill);
}

.glass__body--empty {
  fill: var(--color-water-empty);
}
</style>
