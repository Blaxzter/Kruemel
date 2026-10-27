// Strict parsers for records that come from outside the app (backup files).
// Each returns a clean copy with only known fields, or null when the value is invalid.
import { isDayKey } from './day'
import { MAX_GLASSES } from './settings'
import { BUILTIN_TILES, ICON_NAMES, TILE_COLOR_NAMES } from './tiles'
import type { Entry, IconName, Mood, Tile, TileColor, WaterDay } from './types'

const MOODS: readonly Mood[] = ['yum', 'ok', 'meh']
const MAX_TEXT = 500
// builtinKey is passed to i18n t(), so only the keys of real builtin tiles are allowed.
const BUILTIN_KEYS: readonly string[] = BUILTIN_TILES.map((t) => t.builtinKey as string)

type Rec = Record<string, unknown>

const isRecord = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 100
const isText = (v: unknown): v is string => typeof v === 'string' && v.length <= MAX_TEXT

export function parseTile(v: unknown): Tile | null {
  if (!isRecord(v)) return null
  const { id, builtinKey, name, icon, color, order, hidden } = v
  if (!isId(id)) return null
  if (builtinKey !== null && !isText(builtinKey)) return null
  if (name !== null && !isText(name)) return null
  // An unknown builtinKey is dropped; the tile survives only as a custom tile with a name.
  const key = builtinKey !== null && BUILTIN_KEYS.includes(builtinKey) ? builtinKey : null
  if (key === null && !name) return null
  if (!ICON_NAMES.includes(icon as IconName)) return null
  if (!TILE_COLOR_NAMES.includes(color as TileColor)) return null
  if (typeof order !== 'number' || !Number.isFinite(order)) return null
  if (typeof hidden !== 'boolean') return null
  return { id, builtinKey: key, name, icon: icon as IconName, color: color as TileColor, order, hidden }
}

export function parseEntry(v: unknown): Entry | null {
  if (!isRecord(v)) return null
  const { id, tileId, at, dayKey, note, mood } = v
  if (!isId(id) || !isId(tileId)) return null
  if (typeof at !== 'number' || !Number.isFinite(at) || at < 0) return null
  if (!isDayKey(dayKey)) return null
  if (note !== undefined && !isText(note)) return null
  if (mood !== undefined && !MOODS.includes(mood as Mood)) return null
  return {
    id,
    tileId,
    at,
    dayKey,
    ...(note ? { note } : {}),
    ...(mood ? { mood: mood as Mood } : {}),
  }
}

export function parseWaterDay(v: unknown): WaterDay | null {
  if (!isRecord(v)) return null
  const { dayKey, glasses } = v
  if (!isDayKey(dayKey)) return null
  if (typeof glasses !== 'number' || !Number.isInteger(glasses) || glasses < 0 || glasses > MAX_GLASSES) return null
  return { dayKey, glasses }
}
