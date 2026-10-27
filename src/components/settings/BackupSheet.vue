<script setup lang="ts">
import DownloadIcon from '@/components/ui/DownloadIcon.vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useToast } from '@/composables/useToast'
import { BackupError, backupFileName, useBackup, type BackupErrorCode } from '@/stores'
import { downloadBlob } from './backup'

/** "Tagebuch sichern": export to a JSON file, or import one after a confirmation step. */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const toast = useToast()
const { exportBlob, importFile } = useBackup()

const busy = ref(false)
const pendingFile = ref<File | null>(null)
/** i18n key of the import error shown, or null. */
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (open) => {
    if (!open) reset()
  },
)

function reset(): void {
  pendingFile.value = null
  error.value = null
  if (fileInput.value) fileInput.value.value = ''
}

async function onExport(): Promise<void> {
  busy.value = true
  try {
    downloadBlob(await exportBlob(), backupFileName())
    toast.show(t('settings.backup.exported'))
  } finally {
    busy.value = false
  }
}

function onPick(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0]
  error.value = null
  pendingFile.value = file ?? null
}

async function onConfirm(): Promise<void> {
  const file = pendingFile.value
  if (!file) return
  busy.value = true
  error.value = null
  try {
    await importFile(file)
    toast.show(t('settings.backup.imported'))
    emit('close')
  } catch (err) {
    error.value = importErrorKey(err)
    pendingFile.value = null
    if (fileInput.value) fileInput.value.value = ''
  } finally {
    busy.value = false
  }
}

const ERROR_KEYS: Record<BackupErrorCode, string> = {
  unreadable: 'settings.backup.errors.unreadable',
  'not-json': 'settings.backup.error',
  'not-a-backup': 'settings.backup.error',
  'unsupported-version': 'settings.backup.errors.unsupportedVersion',
  'invalid-data': 'settings.backup.errors.invalidData',
}

function importErrorKey(err: unknown): string {
  return err instanceof BackupError ? ERROR_KEYS[err.code] : 'settings.backup.error'
}

function onCancelImport(): void {
  reset()
}
</script>

<template>
  <BottomSheet :open="open" :title="t('settings.backup.title')" @close="emit('close')">
    <p class="backup__text">{{ t('settings.backup.exportText') }}</p>
    <button type="button" class="backup__primary" :disabled="busy" data-testid="backup-export" @click="onExport">
      <DownloadIcon />
      <span>{{ t('settings.backup.export') }}</span>
    </button>

    <hr class="backup__rule" />

    <template v-if="pendingFile">
      <section class="backup__confirm" aria-labelledby="backup-confirm-title">
        <h3 id="backup-confirm-title" class="backup__confirm-title">{{ t('settings.backup.confirmTitle') }}</h3>
        <p class="backup__text">{{ t('settings.backup.confirmText', { file: pendingFile.name }) }}</p>
        <div class="backup__row">
          <button type="button" class="backup__secondary" :disabled="busy" @click="onCancelImport">{{ t('common.actions.cancel') }}</button>
          <button type="button" class="backup__primary" :disabled="busy" data-testid="backup-confirm" @click="onConfirm">
            {{ t('settings.backup.confirm') }}
          </button>
        </div>
      </section>
    </template>
    <template v-else>
      <p class="backup__text">{{ t('settings.backup.importText') }}</p>
      <label class="backup__secondary backup__file">
        <input ref="fileInput" class="visually-hidden" type="file" accept="application/json,.json" data-testid="backup-file" @change="onPick" />
        <span>{{ t('settings.backup.import') }}</span>
      </label>
    </template>

    <p v-if="error" class="backup__error" role="alert">{{ t(error) }}</p>
  </BottomSheet>
</template>

<style scoped>
.backup__text {
  font-size: 15px;
  line-height: 1.45;
  color: var(--color-ink-secondary);
}

.backup__primary,
.backup__secondary {
  flex: 1;
  min-height: 52px;
  border-radius: var(--radius-pill);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 18px;
  font: 800 16px var(--font-body);
}

.backup__primary {
  border: 0;
  background: var(--color-accent);
  color: var(--color-accent-ink);
}

.backup__secondary {
  border: 2px solid var(--color-line);
  background: var(--color-card);
  color: var(--color-ink);
  cursor: pointer;
}

.backup__file:focus-within {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.backup__primary:disabled,
.backup__secondary:disabled {
  opacity: 0.6;
}

.backup__rule {
  width: 100%;
  border: 0;
  border-top: 1px solid var(--color-line);
  margin: 6px 0;
}

.backup__confirm {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.backup__confirm-title {
  font-size: 18px;
}

.backup__row {
  display: flex;
  gap: 10px;
}

.backup__error {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-tile-ink);
  background: var(--tile-coral-soft);
  border-radius: var(--radius-xs);
  padding: 10px 12px;
}
</style>
