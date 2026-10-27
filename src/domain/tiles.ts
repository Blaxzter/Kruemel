import type { IconName, Tile, TileColor } from './types'

/** All tile colours in picker order. */
export const TILE_COLOR_NAMES: readonly TileColor[] = ['coral', 'apricot', 'butter', 'lemon', 'mint', 'sky', 'lilac', 'rose', 'latte']

/** All tile icons in picker order (matches the NewTile design). */
export const ICON_NAMES: readonly IconName[] = ['apple', 'carrot', 'bread', 'bowl', 'noodles', 'egg', 'pizza', 'cookie', 'milk', 'cup', 'snack']

/** CSS custom property for a tile's soft background (theme aware, see styles/tokens.css). */
export function tileSoftVar(color: TileColor): string {
  return `var(--tile-${color}-soft)`
}

/** CSS custom property for a tile's dot colour (theme aware). */
export function tileDotVar(color: TileColor): string {
  return `var(--tile-${color}-dot)`
}

/** Builtin tiles seeded on first run, in display order. Names resolve via i18n (`tiles.<id>`). */
export const BUILTIN_TILES: readonly Readonly<Tile>[] = [
  { id: 'fruit', builtinKey: 'tiles.fruit', name: null, icon: 'apple', color: 'coral', order: 0, hidden: false },
  { id: 'veg', builtinKey: 'tiles.veg', name: null, icon: 'carrot', color: 'mint', order: 1, hidden: false },
  { id: 'bread', builtinKey: 'tiles.bread', name: null, icon: 'bread', color: 'butter', order: 2, hidden: false },
  { id: 'meal', builtinKey: 'tiles.meal', name: null, icon: 'bowl', color: 'apricot', order: 3, hidden: false },
  { id: 'snack', builtinKey: 'tiles.snack', name: null, icon: 'snack', color: 'lilac', order: 4, hidden: false },
  { id: 'sweets', builtinKey: 'tiles.sweets', name: null, icon: 'cookie', color: 'rose', order: 5, hidden: false },
  { id: 'dairy', builtinKey: 'tiles.dairy', name: null, icon: 'milk', color: 'sky', order: 6, hidden: false },
  { id: 'drink', builtinKey: 'tiles.drink', name: null, icon: 'cup', color: 'latte', order: 7, hidden: false },
]
