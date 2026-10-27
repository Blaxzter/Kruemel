export type TileColor = 'coral' | 'apricot' | 'butter' | 'lemon' | 'mint' | 'sky' | 'lilac' | 'rose' | 'latte'
export type IconName = 'apple' | 'carrot' | 'bread' | 'bowl' | 'noodles' | 'egg' | 'pizza' | 'cookie' | 'milk' | 'cup' | 'snack'
export type Mood = 'yum' | 'ok' | 'meh'
export type PartOfDay = 'morning' | 'midday' | 'evening'

export interface Tile {
  id: string                 // builtin ids: fruit, veg, bread, meal, snack, sweets, dairy, drink; custom: uuid
  builtinKey: string | null  // i18n key for builtin names (tiles.fruit); null for custom
  name: string | null        // custom name (or user rename of a builtin); wins over builtinKey when set
  icon: IconName
  color: TileColor
  order: number
  hidden: boolean
}
export interface Entry { id: string; tileId: string; at: number; dayKey: string; note?: string; mood?: Mood }
export interface WaterDay { dayKey: string; glasses: number }  // 0..8
export interface Settings {
  name: string                       // default ''
  dayStartHour: 0 | 3 | 4 | 5 | 6    // default 4
  logMode: 'quick' | 'describe'      // default 'quick'
  // showColors switches the Vielfalt card and page. It keeps its old name because it is stored in
  // IndexedDB and in backups; renaming it would need a migration for no visible gain.
  showWater: boolean; showTree: boolean; showColors: boolean   // default true
  theme: 'system' | 'light' | 'dark' // default 'system'
  locale: 'de' | 'en'                // default 'de'
  treeSeed: number                   // random 1..999 chosen at onboarding
  onboardingDone: boolean
}
