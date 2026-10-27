<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { InstallMode } from '@/pwa/useInstallPrompt'
import InstallButton from '@/components/ui/InstallButton.vue'
import InstallGuide from './InstallGuide.vue'
import IntroArt from './IntroArt.vue'

/**
 * Step 4: install. Shows the install button when the browser offered a prompt, otherwise
 * the manual steps for this browser (Chrome offers the prompt only after some use, and
 * some browsers never do). When the prompt arrives later, the button replaces the steps.
 */
defineProps<{ mode: InstallMode }>()
const emit = defineEmits<{ install: [] }>()

const { t } = useI18n()
</script>

<template>
  <div class="step">
    <IntroArt :width="230" :height="200">
      <div class="home">
        <span class="home__app home__app--ghost"></span>
        <span class="home__app home__app--ghost"></span>
        <span class="home__app home__app--ghost"></span>
        <span class="home__app home__app--ghost"></span>
        <span class="home__ours">
          <span class="home__icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
              <path d="M12 21v-6" />
              <path d="M12 15c-4.5 0-7-2.5-7-6a7 7 0 0 1 14 0c0 3.5-2.5 6-7 6z" fill="#9BE0B0" />
              <path d="M12 15l-2.5-3M12 13l3-3" />
            </svg>
          </span>
          <span class="home__name">{{ t('common.appName') }}</span>
        </span>
        <span class="home__app home__app--ghost"></span>
      </div>
    </IntroArt>

    <div class="step__copy">
      <h1 class="step__title step__title--install" tabindex="-1" data-step-title>{{ t('intro.install.title') }}</h1>
      <p class="step__lead">{{ t('intro.install.text') }}</p>
    </div>

    <InstallButton v-if="mode === 'prompt'" @click="emit('install')" />
    <InstallGuide v-else-if="mode !== 'installed'" :guide="mode" />
    <p v-else class="done" role="status" data-testid="install-done">{{ t('intro.install.done') }}</p>
  </div>
</template>

<style scoped src="./intro.css"></style>

<style scoped>
.home {
  width: 230px;
  height: 200px;
  border-radius: var(--radius-xl);
  background: var(--tile-lilac-soft);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 22px;
  align-items: start;
  justify-items: center;
}

.home__app {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: #ffffff;
  opacity: 0.6;
}

.home__ours {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.home__icon {
  width: 58px;
  height: 58px;
  margin-top: -4px;
  border-radius: var(--radius-sm);
  background: #6b4eff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-accent);
}

.home__name {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-tile-ink);
}

.step__title--install {
  font-size: 32px;
}


.done {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-ink);
}
</style>
