import { db } from '@/db/db'
import { reloadStores } from './load'
import { requestPersistentStorage } from './persist'
import { useSettings } from './settings'

export { useSettings } from './settings'
export { useTiles } from './tiles'
export { useEntries } from './entries'
export { useWater } from './water'
export { useToday } from './today'
export {
  useBackup,
  backupFileName,
  readBackupFile,
  BackupError,
  type BackupFile,
  type BackupErrorCode,
} from './backup'

/**
 * Opens the DB, seeds builtin tiles and default settings (first run only, idempotent),
 * loads everything into memory, and requests persistent storage once onboarding is done.
 * Must resolve before the app mounts (main.ts awaits it).
 */
export async function initStores(): Promise<void> {
  await db.open()
  await reloadStores()
  if (useSettings().settings.value.onboardingDone) void requestPersistentStorage()
}
