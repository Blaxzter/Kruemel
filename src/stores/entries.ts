import { shallowRef, type Ref } from 'vue'
import { db } from '@/db/db'
import { dayKey } from '@/domain/day'
import { newId } from '@/domain/id'
import type { Entry, Mood } from '@/domain/types'
import { useSettings } from './settings'

/** Internal shared state, always sorted by `at` (oldest first). Other stores may read it. */
export const entriesState = shallowRef<Entry[]>([])

export interface EntriesStore {
  entries: Readonly<Ref<Entry[]>>
  addEntry(tileId: string, extra?: { note?: string; mood?: Mood }): Promise<Entry>
  updateEntry(id: string, patch: Partial<Pick<Entry, 'note' | 'mood'>>): Promise<void>
  removeEntry(id: string): Promise<void>
  /** Puts a removed entry back unchanged (same id, time and dayKey). Used for undo. */
  restoreEntry(entry: Entry): Promise<void>
}

// The id tie-break keeps same-millisecond entries in one stable order across reloads.
const byTime = (a: Entry, b: Entry): number => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Sets memory, runs the DB write, and undoes just this change if the write fails. `revert`
 * gets the list as it is at failure time, so later changes that did save are kept.
 */
async function commit(next: Entry[], write: () => Promise<unknown>, revert: (list: Entry[]) => Entry[]): Promise<void> {
  entriesState.value = next
  try {
    await write()
  } catch (err) {
    entriesState.value = revert(entriesState.value)
    throw err
  }
}

async function addEntry(tileId: string, extra?: { note?: string; mood?: Mood }): Promise<Entry> {
  const now = new Date()
  const note = extra?.note?.trim()
  const entry: Entry = {
    id: newId(),
    tileId,
    at: now.getTime(),
    dayKey: dayKey(now, useSettings().settings.value.dayStartHour),
    ...(note ? { note } : {}),
    ...(extra?.mood ? { mood: extra.mood } : {}),
  }
  await commit(
    [...entriesState.value, entry].sort(byTime),
    () => db.entries.add({ ...entry }),
    (list) => list.filter((e) => e !== entry),
  )
  return entry
}

/** A patch key set to undefined or an empty note clears that field. */
async function updateEntry(id: string, patch: Partial<Pick<Entry, 'note' | 'mood'>>): Promise<void> {
  const current = entriesState.value.find((e) => e.id === id)
  if (!current) return
  const updated: Entry = { ...current }
  if ('note' in patch) {
    const note = patch.note?.trim()
    if (note) updated.note = note
    else delete updated.note
  }
  if ('mood' in patch) {
    if (patch.mood) updated.mood = patch.mood
    else delete updated.mood
  }
  await commit(
    entriesState.value.map((e) => (e.id === id ? updated : e)),
    () => db.entries.put({ ...updated }),
    (list) => list.map((e) => (e === updated ? current : e)),
  )
}

async function removeEntry(id: string): Promise<void> {
  const current = entriesState.value.find((e) => e.id === id)
  if (!current) return
  await commit(
    entriesState.value.filter((e) => e.id !== id),
    () => db.entries.delete(id),
    (list) => (list.some((e) => e.id === id) ? list : [...list, current].sort(byTime)),
  )
}

async function restoreEntry(entry: Entry): Promise<void> {
  if (entriesState.value.some((e) => e.id === entry.id)) return
  const copy: Entry = { ...entry }
  await commit(
    [...entriesState.value, copy].sort(byTime),
    () => db.entries.add({ ...copy }),
    (list) => list.filter((e) => e !== copy),
  )
}

export function useEntries(): EntriesStore {
  return { entries: entriesState, addEntry, updateEntry, removeEntry, restoreEntry }
}

/** Internal: called by initStores() and after a backup import. */
export async function loadEntries(): Promise<void> {
  entriesState.value = (await db.entries.toArray()).sort(byTime)
}
