<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import type { InstallGuide } from '@/pwa/useInstallPrompt'

/**
 * Manual install steps for browsers without an install prompt (or before it arrives).
 * Used on the onboarding install step and in the settings install sheet.
 */
const props = defineProps<{ guide: InstallGuide }>()

const { t } = useI18n()
const titleId = `install-guide-${useId()}`

const steps = computed(() => {
  if (props.guide === 'ios') return null
  const key = `intro.install.guide.${props.guide}`
  return { title: t(`${key}.title`), step1: t(`${key}.step1`), step2: t(`${key}.step2`) }
})
</script>

<template>
  <section class="guide" :aria-labelledby="titleId" :data-guide="guide" :data-testid="guide === 'ios' ? 'ios-guide' : 'install-guide'">
    <template v-if="steps">
      <h2 :id="titleId" class="guide__title">{{ steps.title }}</h2>
      <ol class="guide__steps">
        <li>{{ steps.step1 }}</li>
        <li>{{ steps.step2 }}</li>
      </ol>
    </template>
    <template v-else>
      <h2 :id="titleId" class="guide__title">{{ t('intro.install.iosTitle') }}</h2>
      <ol class="guide__steps">
        <li>
          <span class="guide__inline">
            {{ t('intro.install.iosStep1') }}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-water-stroke)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" :aria-label="t('intro.install.iosShare')" focusable="false">
              <path d="M12 3v12M8 7l4-4 4 4" />
              <path d="M6 11H5v10h14V11h-1" />
            </svg>
          </span>
        </li>
        <li>{{ t('intro.install.iosStep2') }}</li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.guide {
  background: var(--color-card);
  border-radius: 20px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.guide__title {
  font: 800 15px var(--font-body);
}

.guide__steps {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: var(--color-ink-secondary);
}

.guide__inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
