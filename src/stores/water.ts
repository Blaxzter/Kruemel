import { shallowRef } from 'vue'
import { db } from '@/db/db'
import { MAX_GLASSES } from '@/domain/settings'
import type { WaterDay } from '@/domain/types'

const glassesByDay = shallowRef<Readonly<Record<string, number>>>({})

export interface WaterStore {
  /** Reactive when read inside a computed/render. */
  glassesFor(dayKey: string): number
  /** Clamped to 0..MAX_GLASSES. 0 removes the day's row. */
  setGlasses(dayKey: string, n: number): Promise<void>
}

function glassesFor(dayKey: string): number {
  return glassesByDay.value[dayKey] ?? 0
}

async function setGlasses(dayKey: string, n: number): Promise<void> {
  const glasses = Number.isFinite(n) ? Math.max(0, Math.min(MAX_GLASSES, Math.round(n))) : 0
  const prev = glassesByDay.value
  const next: Record<string, number> = { ...prev }
  if (glasses === 0) delete next[dayKey]
  else next[dayKey] = glasses
  glassesByDay.value = next
  try {
    if (glasses === 0) await db.water.delete(dayKey)
    else await db.water.put({ dayKey, glasses })
  } catch (err) {
    if (glassesByDay.value === next) glassesByDay.value = prev
    throw err
  }
}

export function useWater(): WaterStore {
  return { glassesFor, setGlasses }
}

/** Internal: all water days with at least one glass (for backups). */
export function waterDays(): WaterDay[] {
  return Object.entries(glassesByDay.value).map(([dayKey, glasses]) => ({ dayKey, glasses }))
}

/** Internal: called by initStores() and after a backup import. */
export async function loadWater(): Promise<void> {
  const rows = await db.water.toArray()
  glassesByDay.value = Object.fromEntries(rows.filter((r) => r.glasses > 0).map((r) => [r.dayKey, r.glasses]))
}
