<script setup lang="ts" generic="T extends string">
import { useId } from 'vue'
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'

/**
 * Segmented control with radio semantics (Reka RadioGroup): one tab stop, arrow keys move and
 * select, like native radios.
 */
defineProps<{ legend: string; options: readonly { value: T; label: string; lang?: string }[] }>()
const model = defineModel<T>({ required: true })

const legendId = useId()

function onUpdate(value: unknown): void {
  model.value = value as T
}
</script>

<template>
  <div class="segmented">
    <span :id="legendId" class="segmented__legend">{{ legend }}</span>
    <RadioGroupRoot
      :model-value="model"
      class="segmented__track"
      orientation="horizontal"
      :aria-labelledby="legendId"
      :style="{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }"
      @update:model-value="onUpdate"
    >
      <RadioGroupItem v-for="option in options" :key="option.value" :value="option.value" class="segmented__option">
        <span :lang="option.lang">{{ option.label }}</span>
      </RadioGroupItem>
    </RadioGroupRoot>
  </div>
</template>

<style scoped>
.segmented {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.segmented__legend {
  margin: 0 0 6px 4px;
  font-size: 13px;
  font-weight: 800;
  color: var(--color-muted);
}

.segmented__track {
  display: grid;
  gap: 4px;
  background: var(--color-surface-chip);
  border-radius: 14px;
  padding: 4px;
}

.segmented__option {
  height: var(--touch-target);
  min-width: 0;
  border: 0;
  padding: 0 4px;
  border-radius: 11px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 700 14px var(--font-body);
  color: var(--color-ink);
  cursor: pointer;
}

.segmented__option[data-state='checked'] {
  background: var(--color-segment-selected);
  font-weight: 800;
  box-shadow:
    0 1px 4px rgba(35, 31, 58, 0.15),
    inset 0 0 0 1.5px var(--color-line);
}

.segmented__option:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}
</style>
