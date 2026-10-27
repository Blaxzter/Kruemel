<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { tileDotVar } from '@/domain/tiles'
import type { PartOfDay } from '@/domain/types'
import { formatTime, type TodayItem } from './todayModel'

const props = defineProps<{
  open: boolean
  /** Part whose entries are listed. Kept while closing so the title does not flash empty. */
  part: PartOfDay
  /** Entries of that part, oldest first. */
  items: readonly TodayItem[]
}>()

const emit = defineEmits<{ close: []; remove: [id: string] }>()

const { t, locale } = useI18n()

const doneButton = ref<HTMLButtonElement | null>(null)
const list = ref<HTMLElement | null>(null)

/**
 * Removing a row also removes the focused delete button. Once the list has updated (the store
 * write is async), focus the row that took its place, else the previous one, else "Fertig",
 * so keyboard and screen reader users stay in the sheet.
 */
let refocusIndex: number | null = null

function remove(index: number, id: string): void {
  refocusIndex = index
  emit('remove', id)
}

watch(
  () => props.items.length,
  () => {
    if (refocusIndex === null) return
    const index = refocusIndex
    refocusIndex = null
    const buttons = list.value?.querySelectorAll<HTMLButtonElement>('.entry__delete') ?? []
    const next = buttons[Math.min(index, buttons.length - 1)]
    ;(next ?? doneButton.value)?.focus()
  },
  { flush: 'post' },
)

function timeOf(item: TodayItem): string {
  return formatTime(item.at, locale.value)
}
</script>

<template>
  <BottomSheet :open="open" :title="t(`today.parts.${part}`)" initial-focus=".sheet-done" @close="emit('close')">
    <template #action>
      <button ref="doneButton" type="button" class="sheet-done" @click="emit('close')">{{ t('common.actions.done') }}</button>
    </template>
    <ul v-if="items.length > 0" ref="list" class="entries" data-testid="part-entries">
      <li v-for="(item, index) in items" :key="item.id" class="entry">
        <span class="entry__dot" :style="{ background: tileDotVar(item.color) }"></span>
        <span class="entry__label">{{ item.label }}</span>
        <span class="entry__time">{{ timeOf(item) }}</span>
        <button
          type="button"
          class="entry__delete"
          :aria-label="t('today.partSheet.deleteAria', { tile: item.label, time: timeOf(item) })"
          @click="remove(index, item.id)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
          </svg>
        </button>
      </li>
    </ul>
    <p v-else class="entries-empty">{{ t('today.partSheet.empty') }}</p>
  </BottomSheet>
</template>

<style scoped>
.sheet-done {
  height: var(--touch-target);
  padding: 0 6px;
  border: 0;
  background: transparent;
  color: var(--color-link);
  font: 800 15px var(--font-body);
}

.entries {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.entry {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 56px;
  background: var(--color-card);
  border-radius: var(--radius-sm);
  padding: 6px 6px 6px 14px;
}

.entry__dot {
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 6px;
}

.entry__label {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.entry__time {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.entry__delete {
  width: var(--touch-target);
  height: var(--touch-target);
  flex: none;
  border: 0;
  border-radius: var(--radius-xs);
  background: var(--color-ground);
  color: var(--color-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.entries-empty {
  padding: 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-muted);
}
</style>
