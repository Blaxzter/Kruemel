<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import TileIcon from '@/components/ui/TileIcon.vue'
import { ICON_NAMES, TILE_COLOR_NAMES, tileSoftVar } from '@/domain/tiles'
import type { IconName, Tile, TileColor } from '@/domain/types'
import { useEntries, useTiles } from '@/stores'
import { useToast } from '@/composables/useToast'
import { showErrorToast, withErrorToast } from '@/composables/errorToast'
import { moveTileVisible } from './reorder'

/**
 * New / edit tile sheet (design/NewTile.dc.html): live preview, name, icon picker, colour swatches.
 * `tile` null creates a new tile.
 *
 * `manage` (edit mode on Today) adds the place among the visible tiles with earlier / later
 * buttons and "Ausblenden"; delete is then only offered for custom tiles without entries.
 */
const props = withDefaults(defineProps<{ open: boolean; tile: Tile | null; manage?: boolean }>(), { manage: false })
const emit = defineEmits<{ close: []; saved: [tile: Tile] }>()

const { t } = useI18n()
const toast = useToast()
const { addTile, updateTile, deleteTile, tileLabel, tiles, visibleTiles } = useTiles()
const { entries } = useEntries()

// The NewTile design offers 10 pictures (no plain bowl) and 8 swatches (no butter). Both stay
// available when the edited tile already uses them, e.g. the builtin "Warmes Essen" and "Brot".
const DESIGN_ICONS = ICON_NAMES.filter((i) => i !== 'bowl')
const DESIGN_SWATCHES = TILE_COLOR_NAMES.filter((c) => c !== 'butter')
const DEFAULT_ICON: IconName = 'noodles'
const DEFAULT_COLOR: TileColor = 'lemon'

const name = ref('')
const icon = ref<IconName>(DEFAULT_ICON)
const color = ref<TileColor>(DEFAULT_COLOR)
const triedSave = ref(false)
const busy = ref(false)

const isNew = computed(() => props.tile === null)
const builtinName = computed(() => (props.tile?.builtinKey ? t(props.tile.builtinKey) : ''))
const icons = computed(() => (icon.value === 'bowl' || props.tile?.icon === 'bowl' ? ICON_NAMES : DESIGN_ICONS))
const swatches = computed(() => (color.value === 'butter' || props.tile?.color === 'butter' ? TILE_COLOR_NAMES : DESIGN_SWATCHES))
const trimmed = computed(() => name.value.trim())
// A builtin tile with an empty name falls back to its builtin name.
const canSave = computed(() => trimmed.value.length > 0 || builtinName.value.length > 0)
// Place among the visible tiles (what Today shows), 1-based; 0 when not shown there.
const place = computed(() => (props.tile ? visibleTiles.value.findIndex((x) => x.id === props.tile?.id) + 1 : 0))
const placeCount = computed(() => visibleTiles.value.length)
const showPlace = computed(() => props.manage && place.value > 0)
const canDelete = computed(() => {
  const tile = props.tile
  if (!tile || tile.builtinKey !== null) return false
  return props.manage ? !entries.value.some((e) => e.tileId === tile.id) : true
})
const placeStatus = ref('')
const previewName = computed(() => trimmed.value || builtinName.value || t('tiles.editor.namePlaceholder'))

watch(
  () => [props.open, props.tile] as const,
  ([open, tile]) => {
    if (!open) return
    triedSave.value = false
    name.value = tile ? tileLabel(tile) : ''
    icon.value = tile?.icon ?? DEFAULT_ICON
    color.value = tile?.color ?? DEFAULT_COLOR
  },
  { immediate: true },
)

async function save(): Promise<void> {
  triedSave.value = true
  if (!canSave.value || busy.value) return
  busy.value = true
  try {
    if (props.tile) {
      const customName = trimmed.value && trimmed.value !== builtinName.value ? trimmed.value : null
      await updateTile(props.tile.id, { name: props.tile.builtinKey ? customName : trimmed.value, icon: icon.value, color: color.value })
      const saved = tiles.value.find((x) => x.id === props.tile?.id) ?? props.tile
      toast.show(t('tiles.editor.saved'))
      emit('saved', saved)
    } else {
      const created = await addTile({ builtinKey: null, name: trimmed.value, icon: icon.value, color: color.value, hidden: false })
      toast.show(t('tiles.editor.added', { name: created.name ?? '' }))
      emit('saved', created)
    }
  } finally {
    busy.value = false
  }
}

async function move(dir: -1 | 1, which: 'earlier' | 'later'): Promise<void> {
  const tile = props.tile
  if (!tile || busy.value) return
  busy.value = true
  try {
    await moveTileVisible(tile.id, dir)
    placeStatus.value = t('tiles.editor.place', { n: place.value, total: placeCount.value })
  } catch (err) {
    showErrorToast(err)
  } finally {
    busy.value = false
  }
  // At the first or last place this button is disabled now: keep focus on its sibling.
  const self = document.querySelector<HTMLButtonElement>(`[data-place="${which}"]`)
  if (self?.disabled) document.querySelector<HTMLButtonElement>(`[data-place="${which === 'earlier' ? 'later' : 'earlier'}"]`)?.focus()
}

async function hide(): Promise<void> {
  const tile = props.tile
  if (!tile) return
  const label = tileLabel(tile)
  try {
    await updateTile(tile.id, { hidden: true })
  } catch (err) {
    showErrorToast(err)
    return
  }
  emit('close')
  toast.show(t('tiles.manage.hiddenToast', { name: label }), {
    actionLabel: t('common.actions.undo'),
    onAction: () => withErrorToast(updateTile(tile.id, { hidden: false })),
  })
}

async function remove(): Promise<void> {
  const tile = props.tile
  if (!tile) return
  const label = tileLabel(tile)
  await deleteTile(tile.id)
  // Tiles with history are hidden instead of deleted (store rule).
  const stillThere = tiles.value.some((x) => x.id === tile.id)
  toast.show(stillThere ? t('tiles.editor.deletedHidden', { name: label }) : t('tiles.editor.deleted', { name: label }))
  emit('close')
}
</script>

<template>
  <BottomSheet
    :open="open"
    :title="isNew ? t('tiles.editor.newTitle') : t('tiles.editor.editTitle')"
    initial-focus="#tile-editor-name"
    variant="form"
    @close="emit('close')"
  >
    <template #action>
      <button type="button" class="editor__cancel" @click="emit('close')">{{ t('common.actions.cancel') }}</button>
    </template>

    <form class="editor" novalidate @submit.prevent="save">
      <div class="editor__top">
        <div class="editor__preview" role="img" :aria-label="t('tiles.editor.preview', { name: previewName })" :style="{ background: tileSoftVar(color) }">
          <TileIcon :name="icon" :size="36" />
          <span class="editor__preview-name">{{ previewName }}</span>
        </div>
        <div class="editor__field">
          <label for="tile-editor-name" class="editor__label">{{ t('tiles.editor.nameLabel') }}</label>
          <input
            id="tile-editor-name"
            v-model="name"
            class="editor__input"
            type="text"
            maxlength="24"
            autocomplete="off"
            enterkeyhint="done"
            :placeholder="builtinName || t('tiles.editor.namePlaceholder')"
            :aria-invalid="triedSave && !canSave ? 'true' : undefined"
            :aria-describedby="triedSave && !canSave ? 'tile-editor-name-error' : undefined"
          />
          <p v-if="triedSave && !canSave" id="tile-editor-name-error" class="editor__error">{{ t('tiles.editor.nameNeeded') }}</p>
        </div>
      </div>

      <fieldset class="editor__group">
        <legend class="editor__label">{{ t('tiles.editor.iconLegend') }}</legend>
        <div class="editor__icons">
          <button
            v-for="option in icons"
            :key="option"
            type="button"
            class="editor__icon"
            :aria-pressed="icon === option ? 'true' : 'false'"
            :aria-label="t(`tiles.icons.${option}`)"
            @click="icon = option"
          >
            <TileIcon :name="option" :size="28" />
          </button>
        </div>
      </fieldset>

      <fieldset class="editor__group">
        <legend class="editor__label">{{ t('tiles.editor.colorLegend') }}</legend>
        <div class="editor__swatches" :style="{ gridTemplateColumns: `repeat(${swatches.length}, minmax(0, 1fr))` }">
          <button
            v-for="option in swatches"
            :key="option"
            type="button"
            class="editor__swatch"
            :aria-pressed="color === option ? 'true' : 'false'"
            :aria-label="t(`tiles.colors.${option}`)"
            @click="color = option"
          >
            <span class="editor__swatch-dot" :style="{ background: tileSoftVar(option) }" aria-hidden="true"></span>
          </button>
        </div>
      </fieldset>

      <fieldset v-if="showPlace" class="editor__group" data-testid="editor-place">
        <legend class="editor__label">{{ t('tiles.editor.placeLegend') }}</legend>
        <div class="editor__place">
          <button
            type="button"
            class="editor__place-button"
            data-place="earlier"
            :disabled="place <= 1 || busy"
            :aria-label="t('tiles.editor.earlierAria', { name: previewName })"
            @click="move(-1, 'earlier')"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 6l-6 6 6 6" /></svg>
            <span>{{ t('tiles.editor.earlier') }}</span>
          </button>
          <span class="editor__place-text" data-testid="editor-place-text">{{ t('tiles.editor.place', { n: place, total: placeCount }) }}</span>
          <button
            type="button"
            class="editor__place-button"
            data-place="later"
            :disabled="place >= placeCount || busy"
            :aria-label="t('tiles.editor.laterAria', { name: previewName })"
            @click="move(1, 'later')"
          >
            <span>{{ t('tiles.editor.later') }}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
        <p class="visually-hidden" aria-live="polite">{{ placeStatus }}</p>
      </fieldset>

      <button type="submit" class="editor__save" :disabled="busy">
        {{ isNew ? t('tiles.editor.add') : t('tiles.editor.save') }}
      </button>
      <div v-if="(manage && tile) || canDelete" class="editor__links">
        <button v-if="manage && tile" type="button" class="editor__delete" data-testid="editor-hide" @click="hide">
          {{ t('tiles.editor.hide') }}
        </button>
        <button v-if="canDelete" type="button" class="editor__delete" data-testid="editor-delete" @click="remove">
          {{ t('tiles.editor.delete') }}
        </button>
      </div>
    </form>
  </BottomSheet>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.editor__cancel {
  height: var(--touch-target);
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--color-link);
  font: 800 15px var(--font-body);
}

.editor__top {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.editor__preview {
  flex: none;
  width: 104px;
  height: 104px;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 6px;
  color: var(--color-tile-ink);
  font: 700 15px var(--font-body);
  text-align: center;
}

.editor__preview-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor__field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.editor__label {
  padding: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--color-muted);
}

.editor__input {
  height: 48px;
  width: 100%;
  border: 2px solid var(--color-line);
  border-radius: var(--radius-sm);
  padding: 0 14px;
  background: var(--color-card);
  color: var(--color-ink);
  font: 700 17px var(--font-body);
}

.editor__input:focus {
  border-color: var(--color-accent);
}

.editor__input::placeholder {
  color: var(--color-muted-soft);
}

.editor__error {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-ink);
}

.editor__group {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.editor__group > .editor__label {
  margin-bottom: 8px;
}

.editor__icons {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.editor__icon {
  height: 56px;
  border: 3px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--color-card);
  color: var(--color-ink);
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor__icon[aria-pressed='true'] {
  border-color: var(--color-accent);
}

.editor__swatches {
  display: grid;
  /* No gap and a little bleed into the sheet padding: 8 swatches stay 44px wide at 390px. */
  gap: 0;
  margin: 0 -4px;
}

.editor__swatch {
  height: var(--touch-target);
  border: 0;
  padding: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor__swatch-dot {
  width: 38px;
  height: 38px;
  border-radius: 19px;
}

.editor__swatch[aria-pressed='true'] .editor__swatch-dot {
  border: 3px solid var(--color-accent);
  box-shadow: inset 0 0 0 3px var(--color-ground);
}

.editor__save {
  height: 56px;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  font: 800 17px var(--font-body);
}

.editor__save:disabled {
  opacity: 0.6;
}

.editor__links {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0 var(--space-4);
  margin-top: -8px;
}

.editor__place {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor__place-text {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-ink-secondary);
}

.editor__place-button {
  flex: none;
  min-height: var(--touch-target);
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-card);
  color: var(--color-ink);
  display: flex;
  align-items: center;
  gap: 4px;
  font: 800 14px var(--font-body);
}

.editor__place-button:disabled {
  color: var(--color-line);
}

.editor__delete {
  height: var(--touch-target);
  border: 0;
  background: transparent;
  color: var(--color-link);
  font: 800 15px var(--font-body);
}
</style>
