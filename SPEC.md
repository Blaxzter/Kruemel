# Krümel: food diary PWA (build spec)

A tiny, friendly food diary for one person (German speaking). Open the app, tap a tile, done. **No calories, no macros, no numbers about food amounts, no judgement.** Everything stays on the device. The app is called "Krümel" (technical id `kruemel`), hosted at https://kruemel.fabraham.dev.

The approved visual design lives in `design/*.dc.html` (HTML mockups, 390x844 phone frames; the `<script>` at the bottom of each file holds sample data and behaviour). Treat them as the source of truth for layout, colours, typography, spacing, copy and behaviour. `design/canvas.json` lists them. Mapping:

| Design file | App screen |
|---|---|
| `Intro1..4.dc.html` | Onboarding (name + day start, how it works, tree, install) |
| `Main.dc.html` (+ `MainEmpty`) | Today (`/`) |
| `Describe.dc.html` | "Describe it" sheet (detailed logging mode) |
| `NewTile.dc.html` | New / edit tile sheet |
| `Week.dc.html` | Week (`/woche`). Its "Deine Farben" bar and "Farben" tab are replaced by the Vielfalt card and a two-item nav, see below |
| `Colors.dc.html` | Vielfalt (`/vielfalt`; was "Farben"). The page now has a back link and an intro text, see below |
| `Tree.dc.html` (+ `TreeEmpty`) | My tree (`/baum`) |
| `TreeArt.dc.html` | Tree drawing algorithm + rendering (port it faithfully) |
| `Settings.dc.html` | Settings (`/einstellungen`) |
| `TreeStages`, `SeedGallery` | Developer reference only, not app screens |

## Stack (decided)

- Vue 3 (`<script setup lang="ts">`), TypeScript strict, Vite, pnpm.
- vue-router (history mode), vue-i18n (Composition API, `legacy: false`), default locale `de`, fallback `de`, second locale `en`.
- Dexie (IndexedDB) for storage. No backend, no network requests at runtime, no analytics.
- vite-plugin-pwa (`registerType: 'prompt'` or autoUpdate with a gentle reload toast, precache everything, works fully offline).
- Fonts self-hosted via `@fontsource/fredoka` (500, 600) and `@fontsource/nunito` (500 to 800). No Google Fonts CDN.
- Vitest (+ @vue/test-utils, fake-indexeddb) for unit/component tests, Playwright for e2e smoke tests, ESLint (flat config, eslint-plugin-vue, typescript-eslint).
- Hosting: Cloudflare Workers static assets via `wrangler` (`assets.directory = ./dist`, SPA not-found handling). Provide `pnpm deploy` script; do not actually deploy.
- Always look up current library APIs with Context7 before using them (vite-plugin-pwa, vue-i18n, Dexie, wrangler config, Vitest, Playwright).

Required scripts: `dev`, `build` (includes `vue-tsc --noEmit`), `preview`, `typecheck`, `lint`, `test` (vitest run), `test:e2e` (playwright), `deploy` (wrangler deploy). All of `typecheck`, `lint`, `test`, `build` must pass.

## Source layout and ownership

Parallel builders each own a set of paths. Do not edit files you don't own except where stated; if you need something from another area, code against the contract below.

```
src/
  main.ts, App.vue, router.ts                 # scaffold
  i18n.ts                                     # scaffold: loads src/locales/<lang>/<ns>.json, namespaced by file name (t('today.title'))
  locales/{de,en}/common.json                 # scaffold (nav, generic buttons)
  locales/{de,en}/<ns>.json                   # each builder owns its namespace file(s)
  styles/tokens.css, styles/base.css          # scaffold: design tokens, light + dark
  components/ui/                              # scaffold: BottomNav.vue, BottomSheet.vue, ToastHost.vue, TileIcon.vue, AppHeader bits
  composables/useToast.ts                     # scaffold
  domain/  db/  stores/                       # DATA builder (scaffold writes typed stubs first)
  tree/                                       # TREE builder: colonize.ts, layout.ts, palettes.ts, TreeView.vue (+ tests)
  views/TodayView.vue, components/today/      # TODAY builder (also DescribeSheet, PartSheet)
  views/{Week,Colors,TreePage,Settings,Tiles,Intro}View.vue, components/{week,colors,settings,intro}/, pwa/   # SCREENS builder
tests/e2e/                                    # integration
```

## Data model (`src/domain/types.ts`)

```ts
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
  showWater: boolean; showTree: boolean; showColors: boolean   // default true
  theme: 'system' | 'light' | 'dark' // default 'system'
  locale: 'de' | 'en'                // default 'de'
  treeSeed: number                   // random 1..999 chosen at onboarding
  onboardingDone: boolean
}
```

Tile colours (soft background / strong dot), from the design:
coral #FFD3CB/#FF8F7E, mint #CDEFD6/#5FC67E, butter #FFE6B8/#F2BE55, apricot #FFD7B8/#FF9F5C, lilac #E4DCFF/#A893FF, rose #FFD1E6/#FF86BC, sky #D3E8FF/#73B1FF, latte #EBDCCB/#B9926A, lemon #FFF0A8/#E3C04A.

Builtin tiles (seeded on first run, in this order): fruit (apple, coral, "Obst"), veg (carrot, mint, "Gemüse"), bread (bread, butter, "Brot"), meal (bowl, apricot, "Warmes Essen"), snack (snack, lilac, "Snack"), sweets (cookie, rose, "Süßes"), dairy (milk, sky, "Milch & Co"), drink (cup, latte, "Kaffee & Tee").

## Domain rules (`src/domain/*`, pure functions, fully unit tested)

- `dayKey(date: Date, dayStartHour): string` -> local `YYYY-MM-DD` of `date - dayStartHour hours`. A snack at 00:30 with start 4 belongs to the previous day.
- `partOfDay(entry)`: by local clock hour of `at`: < 11 morning, < 17 midday, else evening. Hours before the day start (e.g. 00:00 to 03:59) count as evening of the previous day.
- `leafCount` = number of distinct dayKeys with at least one entry (water alone does not count). Flowers = floor(leaves / 7), apples = floor(leaves / 30), swing when leaves >= 60.
- Bird: shown on a day that has entries when the previous day with entries is >= 3 days earlier ("welcome back"). Never punish gaps: the tree never shrinks or loses anything.
- "Fresh" leaf: if today has at least one entry, the newest leaf gets the white outline + pop animation.
- Season from the current month: Mar to May spring, Jun to Aug summer, Sep to Nov autumn, Dec to Feb winter. Time of day from the clock: 5 to 9 morning, 9 to 17 day, 17 to 21 evening, else night.
- Vielfalt view: per tile, which of the last 7 dayKeys had an entry; month mosaic of the current month.
- Vielfalt card (`varietyPetals` in `src/domain/variety.ts`, rosette geometry in `src/components/week/rosette.ts`): one petal per row of the Vielfalt page's week grid (`weekMatrix`): every visible tile (built-in and custom) plus hidden tiles logged in the window, in tile order, filled when the tile was logged at least once in the last 7 dayKeys. Card and page share this function, so their n/total always agree.
- Today rolls over automatically (re-evaluate on visibilitychange and every minute).

## Store contract (`src/stores/*`, singleton composables backed by Dexie; data is small, keep it in memory, write through)

```ts
useSettings(): { settings: Readonly<Ref<Settings>>; ready: Ref<boolean>; update(patch: Partial<Settings>): Promise<void> }
useTiles():    { tiles: Readonly<Ref<Tile[]>>; visibleTiles: ComputedRef<Tile[]>; addTile(t: Omit<Tile,'id'|'order'>): Promise<Tile>;
                 updateTile(id: string, patch: Partial<Tile>): Promise<void>; moveTile(id: string, dir: -1 | 1): Promise<void>; deleteTile(id: string): Promise<void>;
                 tileLabel(t: Tile): string }   // resolves builtinKey via i18n unless name set
useEntries():  { entries: Readonly<Ref<Entry[]>>; addEntry(tileId: string, extra?: { note?: string; mood?: Mood }): Promise<Entry>;
                 updateEntry(id: string, patch: Partial<Pick<Entry,'note'|'mood'>>): Promise<void>; removeEntry(id: string): Promise<void> }
useWater():    { glassesFor(dayKey: string): number; setGlasses(dayKey: string, n: number): Promise<void> }
useToday():    { todayKey: Ref<string>; now: Ref<Date> }          // ticks each minute + on visibilitychange
useBackup():   { exportBlob(): Promise<Blob>; importFile(f: File): Promise<void> }   // versioned JSON {version:1, settings, tiles, entries, water}
initStores(): Promise<void>   // open DB, seed builtin tiles + default settings, request navigator.storage.persist() once onboarding is done
```
Deleting a tile with entries: hide it instead of deleting (keeps history colours); custom tiles without entries can be deleted.

## Screens and behaviour (follow the design files)

- **Onboarding** (`/willkommen`, shown until `onboardingDone`): 4 steps with dots and "Überspringen". Step 1 asks name and day start (Mitternacht/3/4/5/6, default 4). Step 3 shows the user's tree grown to 180 leaves (it grows in once, drawn grown under reduced motion); the mockup's 30 leaves looked unfinished. Step 4 install: show the "App installieren" button when `beforeinstallprompt` fired, otherwise the manual steps for the browser (iOS Share > "Zum Home-Bildschirm", Chrome ⋮ > "App installieren", Samsung Internet, Firefox, in-app browsers: open in the real browser first) plus "Später"; the button replaces the steps if the prompt arrives later. When already running standalone, skip the install step. Settings keeps an "App installieren" row (hidden once installed), because Chrome fires the prompt only after some use. The intro is exactly one screen high (route meta `fixedHeight`): the buttons stay on screen, the step pictures shrink on short screens and the step scrolls inside itself as a last resort. Finishing sets `onboardingDone`, picks `treeSeed`.
- **Today**: header (date, greeting by hour, name), tree pill with leaf count (hidden when showTree off) -> `/baum`, settings button. Summary card with Morgens/Mittags/Abends columns (max 3 items, else 2 + "+N mehr"); each column is a button opening a bottom sheet listing entries with time + delete. Tile grid (visible tiles + "Eigene" -> new tile sheet). Tap tile: quick mode -> add entry + toast "<Tile> eingetragen" with "Rückgängig" (3.5 s); describe mode -> Describe sheet (optional text with recent notes for this tile as chips, optional mood, "Speichern" / "Nur eintragen"). Water row (8 glasses, tap to set, tap the last filled one to unset) when showWater. Badge counts per tile for today.
  - **Tile edit mode** (`TileGrid.vue`, gestures in `components/today/useTileGestures.ts`, timing in `longPress.ts`). Enter: hold a tile for 500 ms without moving more than 10 px (a light vibration where supported; the long press logs nothing), a right click, the ContextMenu key or Shift+F10. In edit mode the tiles wiggle (not under reduced motion), badges give way to a pencil, a sticky bar shows "Kacheln bearbeiten" / "Tipp zum Ändern, zieh zum Verschieben." with "Fertig", and "Eigene" becomes "Neue Kachel". Tap a tile: the tile editor sheet opens right on Today, with the extra rows "Platz" (earlier/later), "Ausblenden" and, for unused custom tiles, "Löschen". Drag: with a finger, rest on a tile for 200 ms and then move it (8 px starts the drag); a floating copy follows the finger, the slot shows where it lands, and the order is saved on drop. A long press can flow straight into a drag. A swipe that starts moving at once stays a page scroll, so tiles keep the default touch-action and the grid blocks scrolling (touchmove preventDefault) only once a finger has rested. Leave: "Fertig", Esc (when no sheet is open), a tap anywhere outside the tiles (except in sheets and the toast), or leaving the page. Screen readers hear "Kacheln bearbeiten..." / "Bearbeiten beendet" and each move. Intro step 2 always shows "Halte eine Kachel gedrückt, um sie zu bearbeiten." on its own line, also on short screens.
- **Week**: last 7 days strip (tap a day to select, today highlighted dark), day detail grouped by part of day with water count, cards "Deine Vielfalt" (when showColors) and "Mein Baum" thumbnail (when showTree). The Vielfalt card is a small rosette: one petal per tile (as above) in the tile's dot colour, filled when logged at least once in the last 7 days, a dashed outline otherwise, the count "7/8" in the centre, caption "7 von 8 diese Woche. Je bunter, desto abwechslungsreicher." The whole card is one link to `/vielfalt` named "Deine Vielfalt, 7 von 8 Kacheln diese Woche". Calm: no red, no warnings, never "fehlt".
- **Vielfalt** (`/vielfalt`, en "Variety"; the old `/farben` redirects there; only when showColors, else back to Today): not a tab, reached from the Week card. Page header "Deine Vielfalt" with a back link to Woche, then "Jede Kachel hat ihre Farbe. Hier siehst du, wie abwechslungsreich du in letzter Zeit gegessen hast. Es gibt dabei kein richtig oder falsch.", then the week grid (tiles x 7 days) + month mosaic. Neutral wording, never "missing"/"you should".
- **Tree** (`/baum`): TreeView (time "auto", fresh leaf), heading "N Blätter" / "Noch ein Samen", next flower/apple text, legend, status card.
- **Settings**: logging mode, toggles (Wassergläser, Mein Baum, Vielfalt: hides the Week card and the page; stored as `showColors`), Neuer Tag ab, Aussehen (Auto/Hell/Dunkel), Sprache (Deutsch/English), Meine Kacheln (manage: rename, colour, icon, reorder up/down, hide/show, new), Tagebuch sichern (export JSON download + import with confirmation), Einführung nochmal ansehen. Footer: "Alles bleibt auf deinem Handy. Du brauchst kein Konto."
- Bottom nav: Heute / Woche only. Vielfalt is reached from its card on the Week screen, the tree from the Today pill and the Week card.
- Theme colour: index.html has one media-scoped `theme-color` meta per system theme (ground #F6F3FF / #15122A); a forced in-app theme sets both. The manifest uses the dark ground #15122A for theme_color and background_color, because an installed app's Android navigation bar takes the manifest colour, which has no dark variant; the field test asked for a dark bar in dark mode (brand violet looked like a bright strip there).
- Dark theme: same structure, define dark tokens (deep violet-navy ground, lighter cards, keep tile pastels slightly muted, text contrast >= 4.5:1).

## Tree (`src/tree/`)

Port `design/TreeArt.dc.html` faithfully as pure TS: seeded mulberry32 RNG, jittered crown blobs, attractor sampling, space colonization with grid lookup (DI 46, DK 9, D 6.5), forced trunk, `visibleAt`, growth scale, stable leaf-to-twig assignment, pipe-model widths, flowers/apples/swing/bird/seed state, palettes per season, time-of-day sky/sun/moon/stars/clouds/tint, CSS animations (sway, leaf pop, bird bob, clouds, stars) disabled under `prefers-reduced-motion`. **No falling leaves.** Memoize `colonize(seed)`. Render as one inline SVG in `TreeView.vue` with props `{ leaves, seed, season, time: 'auto'|..., size, bird, fresh }`. Unit tests: same seed -> identical output; leaf i's position never changes as leaves grow; leaf count rendered == input; leaves 0 -> seed state.

## Patched dependency: reka-ui

`reka-ui` is pinned to exactly `2.10.5` and patched through `pnpm-workspace.yaml` (`patchedDependencies` -> `patches/reka-ui@2.10.5.patch`, applied by `pnpm install`). The patch fixes `useHideOthers` (`dist/shared/useHideOthers.{js,cjs}`): upstream kept a spent `aria-hidden` undo and ran it a second time on unmount, which unbalanced aria-hidden's counters, so after sheets on different routes the whole app stayed `aria-hidden` for screen readers. The patched code releases each undo exactly once. The e2e test "sheets on different routes never leave the app hidden from assistive tech" (`tests/e2e/smoke.spec.ts`) guards it. Before bumping reka-ui: check whether upstream fixed `useHideOthers`; if so drop the patch and the entry in `pnpm-workspace.yaml`, otherwise regenerate the patch with `pnpm patch reka-ui@<new>` / `pnpm patch-commit`. Either way run that e2e test.

## Copy and i18n

German is the default. Use the German strings from the design files. Casual "du". House style for all copy: no em/en dashes, straight quotes, no filler, no judgement about food. English translations must match meaning and tone. Every user-visible string goes through vue-i18n (including aria-labels). Pluralisation via vue-i18n plural syntax.

## Quality bar

- Accessibility: real `<button>`/`<a>`/`<input>`+`<label>`, visible focus, touch targets >= 44px, contrast >= 4.5:1 in both themes, bottom sheets are proper dialogs (focus trap, Esc, return focus), `prefers-reduced-motion` respected, `lang` attribute follows locale.
- PWA: installable (manifest with name, icons 192/512/maskable, theme/background colour, `display: standalone`, start_url `/`), offline after first load, iOS meta tags + apple-touch-icon. Generate simple icons (violet rounded square with the tree pill leaf) as SVG and PNG.
- Performance: fast first load on a mid phone; tree computation memoized and off the critical path where possible.
- Privacy: zero runtime network requests besides the app's own origin.
