<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import TileIcon from '@/components/ui/TileIcon.vue'
import { tileSoftVar } from '@/domain/tiles'
import type { Mood, Tile } from '@/domain/types'

/**
 * "Kurz beschreiben" sheet (design/Describe.dc.html). Note and mood are both optional:
 * "Speichern" logs with them, "Nur eintragen" logs the tile alone.
 */
const props = defineProps<{
  open: boolean
  /** Tile being logged. Kept while the sheet closes. */
  tile: Tile
  label: string
  /** Clock time shown as "Gerade eben · 12:40". */
  time: string
  /** Earlier notes for this tile, newest first. */
  recentNotes: readonly string[]
}>()

const emit = defineEmits<{
  close: []
  save: [extra: { note?: string; mood?: Mood }]
}>()

const { t } = useI18n()
const noteId = useId()
const moodLabelId = useId()

const note = ref('')
const mood = ref<Mood | null>(null)

// Each opening starts blank.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    note.value = ''
    mood.value = null
  },
)

const MOODS: readonly { id: Mood; mouth: string }[] = [
  { id: 'yum', mouth: 'M8 14.5c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4' },
  { id: 'ok', mouth: 'M8.5 15.5h7' },
  { id: 'meh', mouth: 'M8 16.5c1-1.2 2.4-1.8 4-1.8s3 .6 4 1.8' },
]

function toggleMood(id: Mood): void {
  mood.value = mood.value === id ? null : id
}

// Ignore taps while the sheet is closing (its leave transition is still on screen).
function save(): void {
  if (!props.open) return
  const text = note.value.trim()
  emit('save', { ...(text ? { note: text } : {}), ...(mood.value ? { mood: mood.value } : {}) })
}

function justLog(): void {
  if (!props.open) return
  emit('save', {})
}
</script>

<template>
  <BottomSheet :open="open" :title="label" variant="form" initial-focus="[data-testid='describe-close']" @close="emit('close')">
    <template #leading>
      <span class="describe__icon" :style="{ background: tileSoftVar(tile.color) }">
        <TileIcon :name="tile.icon" :size="32" />
      </span>
    </template>
    <template #subtitle>
      <span class="describe__time">{{ t('describe.justNow', { time }) }}</span>
    </template>
    <template #action>
      <button type="button" class="close-button" data-testid="describe-close" :aria-label="t('common.actions.close')" @click="emit('close')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </template>

    <div class="describe" data-testid="describe-sheet">
      <div class="describe__group">
        <label :for="noteId" class="describe__label">
          {{ t('describe.what') }} <span class="describe__optional">{{ t('describe.optional') }}</span>
        </label>
        <textarea :id="noteId" v-model="note" class="describe__text" rows="2" maxlength="200" :placeholder="t('describe.placeholder')"></textarea>
        <template v-if="recentNotes.length > 0">
          <span class="describe__hint">{{ t('describe.recent') }}</span>
          <div class="describe__chips">
            <button
              v-for="text in recentNotes"
              :key="text"
              type="button"
              class="chip"
              :class="{ 'chip--on': note === text }"
              :aria-pressed="note === text ? 'true' : 'false'"
              @click="note = text"
            >
              {{ text }}
            </button>
          </div>
        </template>
      </div>

      <div class="describe__group">
        <span :id="moodLabelId" class="describe__label">
          {{ t('describe.how') }} <span class="describe__optional">{{ t('describe.optional') }}</span>
        </span>
        <div role="group" :aria-labelledby="moodLabelId" class="moods">
          <button
            v-for="m in MOODS"
            :key="m.id"
            type="button"
            class="mood"
            :class="{ 'mood--on': mood === m.id }"
            :data-mood="m.id"
            :aria-pressed="mood === m.id ? 'true' : 'false'"
            @click="toggleMood(m.id)"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="9" />
              <circle cx="9" cy="10" r=".6" fill="currentColor" />
              <circle cx="15" cy="10" r=".6" fill="currentColor" />
              <path :d="m.mouth" />
            </svg>
            <span>{{ t(`describe.moods.${m.id}`) }}</span>
          </button>
        </div>
      </div>

      <div class="describe__actions">
        <button type="button" class="primary" data-testid="describe-save" @click="save">{{ t('describe.save') }}</button>
        <button type="button" class="secondary" data-testid="describe-just-log" @click="justLog">{{ t('describe.justLog') }}</button>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.close-button {
  width: var(--touch-target);
  height: var(--touch-target);
  flex: none;
  border: 0;
  border-radius: 50%;
  background: var(--color-card);
  color: var(--color-ink);
  display: flex;
  align-items: center;
  justify-content: center;
}

.describe {
  display: flex;
  flex-direction: column;
  gap: 18px;
  /* The sheet's 10px gap plus 8px: 18px below the header, like the design's dialog column. */
  margin-top: 8px;
}

.describe__icon {
  width: 56px;
  height: 56px;
  flex: none;
  border-radius: var(--radius-md);
  color: var(--color-tile-ink);
  display: flex;
  align-items: center;
  justify-content: center;
}

.describe__time {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-muted);
}

.describe__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.describe__label {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-muted);
}

.describe__optional {
  font-weight: 600;
}

.describe__text {
  width: 100%;
  border: 2px solid var(--color-line);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font: 700 17px var(--font-body);
  color: var(--color-ink);
  background: var(--color-card);
  resize: none;
}

.describe__text::placeholder {
  color: var(--color-muted);
  opacity: 1;
}

.describe__text:focus-visible {
  outline: none;
  border-color: var(--color-focus);
}

.describe__hint {
  margin-top: var(--space-1);
  font-size: 12px;
  font-weight: 800;
  color: var(--color-muted);
}

.describe__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* 36px tall like the design; the 8px gap keeps neighbouring targets apart. */
.chip {
  min-height: 36px;
  max-width: 100%;
  padding: 6px 14px;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-card);
  color: var(--color-ink);
  font: 700 14px var(--font-body);
  overflow-wrap: anywhere;
}

.chip--on {
  background: var(--color-inverse);
  color: var(--color-inverse-ink);
}

.moods {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.mood {
  height: 72px;
  border: 2px solid var(--color-card);
  border-radius: var(--radius-md);
  background: var(--color-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  font: 700 13px var(--font-body);
  color: var(--color-ink);
}

.mood--on {
  border-color: var(--color-accent);
}

.describe__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.primary {
  height: 56px;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  font: 800 17px var(--font-body);
}

.secondary {
  height: 48px;
  border: 0;
  background: transparent;
  color: var(--color-link);
  font: 800 15px var(--font-body);
}
</style>
