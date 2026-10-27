<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TileIcon from '@/components/ui/TileIcon.vue'
import DayStartSelect from '@/components/settings/DayStartSelect.vue'
import IntroArt from './IntroArt.vue'
import type { Settings } from '@/domain/types'

/** Step 1: hello, name and day start. */
const name = defineModel<string>('name', { required: true })
const dayStartHour = defineModel<Settings['dayStartHour']>('dayStartHour', { required: true })

const { t } = useI18n()
</script>

<template>
  <div class="step">
    <IntroArt :width="272" :height="234">
      <div class="collage">
        <div class="collage__tile collage__tile--fruit">
          <TileIcon name="apple" :size="44" />
          <span>{{ t('tiles.fruit') }}</span>
        </div>
        <div class="collage__tile collage__tile--bread">
          <TileIcon name="bread" :size="46" />
          <span>{{ t('tiles.bread') }}</span>
        </div>
        <div class="collage__tile collage__tile--veg">
          <TileIcon name="carrot" :size="44" />
          <span>{{ t('tiles.veg') }}</span>
        </div>
        <div class="collage__tile collage__tile--drink">
          <TileIcon name="cup" :size="40" />
        </div>
      </div>
    </IntroArt>

    <div class="step__copy">
      <h1 class="step__title" tabindex="-1" data-step-title>{{ t('intro.hello.title') }}</h1>
      <p class="step__lead">{{ t('intro.hello.text') }}</p>
    </div>

    <div class="field">
      <label for="intro-name" class="field__label">{{ t('intro.hello.nameLabel') }}</label>
      <input id="intro-name" v-model="name" class="field__input" type="text" autocomplete="given-name" maxlength="40" enterkeyhint="next" />
    </div>

    <div class="field">
      <label for="intro-day" class="field__label">{{ t('intro.hello.dayLabel') }}</label>
      <div class="field__row">
        <DayStartSelect id="intro-day" v-model="dayStartHour" size="lg" aria-describedby="intro-day-hint" />
        <span id="intro-day-hint" class="field__hint">{{ t('intro.hello.dayText') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped src="./intro.css"></style>

<style scoped>
/* The design draws the collage at 80% scale (340x292 drawn as 272x234). */
.collage {
  position: relative;
  width: 340px;
  height: 292px;
  transform: scale(0.8);
  transform-origin: 0 0;
}

.collage__tile {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--color-tile-ink);
  font: 700 16px var(--font-body);
}

.collage__tile--fruit {
  left: 34px;
  top: 40px;
  width: 120px;
  height: 120px;
  border-radius: 28px;
  background: var(--tile-coral-soft);
  transform: rotate(-8deg);
}

.collage__tile--bread {
  left: 170px;
  top: 20px;
  width: 130px;
  height: 130px;
  border-radius: 30px;
  background: var(--tile-butter-soft);
  transform: rotate(6deg);
}

.collage__tile--veg {
  left: 100px;
  top: 168px;
  width: 124px;
  height: 124px;
  border-radius: 28px;
  background: var(--tile-mint-soft);
  transform: rotate(-2deg);
}

.collage__tile--drink {
  left: 236px;
  top: 176px;
  width: 96px;
  height: 96px;
  border-radius: 24px;
  background: var(--tile-latte-soft);
  transform: rotate(10deg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__label {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-muted);
}

.field__input {
  height: 52px;
  border: 2px solid var(--color-line);
  border-radius: var(--radius-sm);
  padding: 0 16px;
  background: var(--color-card);
  color: var(--color-ink);
  font: 700 18px var(--font-body);
}

.field__input:focus {
  border-color: var(--color-accent);
}

.field__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.field__hint {
  font-size: 13px;
  line-height: 1.35;
  color: var(--color-muted);
}
</style>
