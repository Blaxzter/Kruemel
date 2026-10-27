<script setup lang="ts">
import { useId } from 'vue'
import { SwitchRoot, SwitchThumb } from 'reka-ui'

/** A settings row with a title, a hint and an on/off switch (Reka Switch, role="switch"). */
defineProps<{ title: string; hint: string }>()
const model = defineModel<boolean>({ required: true })

const titleId = useId()
const hintId = useId()
</script>

<template>
  <div class="switch-row">
    <span class="switch-row__text">
      <span :id="titleId" class="switch-row__title">{{ title }}</span>
      <span :id="hintId" class="switch-row__hint">{{ hint }}</span>
    </span>
    <SwitchRoot v-model="model" class="switch" :aria-labelledby="titleId" :aria-describedby="hintId">
      <SwitchThumb class="switch__thumb" aria-hidden="true" />
    </SwitchRoot>
  </div>
</template>

<style scoped>
.switch-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 56px;
  padding: 6px 0;
}

.switch-row + .switch-row {
  border-top: 1px solid var(--color-surface-chip);
}

.switch-row__text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.switch-row__title {
  font-size: 15px;
  font-weight: 800;
}

.switch-row__hint {
  font-size: 12px;
  color: var(--color-muted);
}

/* 52x32 visual track inside a 44px tall hit area. */
.switch {
  flex: none;
  width: 52px;
  height: var(--touch-target);
  border: 0;
  padding: 0;
  background: transparent;
  display: flex;
  align-items: center;
}

.switch__thumb {
  position: relative;
  width: 52px;
  height: 32px;
  border-radius: 16px;
  background: var(--color-handle);
  transition: background-color var(--duration-fast) ease;
}

.switch__thumb::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 26px;
  height: 26px;
  border-radius: 13px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(35, 31, 58, 0.3);
  transition: transform var(--duration-fast) var(--ease-out);
}

.switch[data-state='checked'] .switch__thumb {
  background: var(--color-accent);
}

.switch[data-state='checked'] .switch__thumb::after {
  transform: translateX(20px);
}
</style>
