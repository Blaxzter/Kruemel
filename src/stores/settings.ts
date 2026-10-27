import { ref, shallowRef, type Ref } from 'vue'
import { db, SETTINGS_ROW_ID } from '@/db/db'
import { DEFAULT_SETTINGS, sanitizeSettings } from '@/domain/settings'
import type { Settings } from '@/domain/types'
import { requestPersistentStorage } from './persist'

const settings = shallowRef<Settings>({ ...DEFAULT_SETTINGS })
const ready = ref(false)

export interface SettingsStore {
  settings: Readonly<Ref<Settings>>
  ready: Ref<boolean>
  update(patch: Partial<Settings>): Promise<void>
}

async function update(patch: Partial<Settings>): Promise<void> {
  const prev = settings.value
  const next = sanitizeSettings({ ...prev, ...patch })
  settings.value = next
  try {
    await db.settings.put({ id: SETTINGS_ROW_ID, value: { ...next } })
  } catch (err) {
    // Roll back unless a newer update already replaced this one.
    if (settings.value === next) settings.value = prev
    throw err
  }
  if (next.onboardingDone && !prev.onboardingDone) void requestPersistentStorage()
}

export function useSettings(): SettingsStore {
  return { settings, ready, update }
}

/** Internal: called by initStores() and after a backup import. The row must exist (see seed). */
export async function loadSettings(): Promise<void> {
  const row = await db.settings.get(SETTINGS_ROW_ID)
  settings.value = sanitizeSettings(row?.value)
  ready.value = true
}
