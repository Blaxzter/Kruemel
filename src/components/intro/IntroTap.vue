<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TileIcon from '@/components/ui/TileIcon.vue'
import IntroArt from './IntroArt.vue'

/** Step 2: one tap logs it. */
const { t } = useI18n()
</script>

<template>
  <div class="step">
    <IntroArt :width="280" :height="300">
      <div class="demo">
        <div class="demo__tile">
          <TileIcon name="apple" :size="54" />
          <span>{{ t('tiles.fruit') }}</span>
          <span class="demo__badge">1</span>
          <span class="demo__tap"></span>
        </div>
        <div class="demo__toast">
          <span>{{ t('intro.tap.toast') }}</span>
          <span class="demo__undo">{{ t('common.actions.undo') }}</span>
        </div>
      </div>
    </IntroArt>

    <div class="step__copy">
      <h1 class="step__title" tabindex="-1" data-step-title>{{ t('intro.tap.title') }}</h1>
      <p class="step__lead">{{ t('intro.tap.text') }}</p>
      <!-- Own line, never dropped: it is the only hint that tiles can be edited. -->
      <p class="step__hint" data-testid="intro-hold-hint">{{ t('intro.tap.hold') }}</p>
      <p class="step__more">{{ t('intro.tap.more') }}</p>
    </div>
  </div>
</template>

<style scoped src="./intro.css"></style>

<style scoped>
.demo {
  width: 280px;
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
}

.demo__tile {
  position: relative;
  width: 150px;
  height: 150px;
  border-radius: 34px;
  background: var(--tile-coral-soft);
  color: var(--color-tile-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font: 700 18px var(--font-body);
}

/* Count badge on a pastel tile: always dark, like on Today. */
.demo__badge {
  position: absolute;
  top: 10px;
  right: 10px;
  min-width: 28px;
  height: 28px;
  border-radius: 14px;
  background: var(--color-tile-ink);
  color: #ffffff;
  font: 800 15px var(--font-body);
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo__tap {
  position: absolute;
  left: 84px;
  top: 92px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  border: 3px solid var(--color-accent);
  background: rgba(107, 78, 255, 0.15);
}

.demo__toast {
  width: 280px;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: var(--color-inverse);
  color: var(--color-inverse-ink);
  border-radius: var(--radius-md);
  padding: 6px 6px 6px 18px;
  font: 700 15px var(--font-body);
}

.demo__undo {
  height: 40px;
  padding: 0 14px;
  border-radius: 14px;
  background: var(--color-inverse-button);
  color: var(--color-inverse-button-ink);
  font-weight: 800;
  display: flex;
  align-items: center;
}
</style>
