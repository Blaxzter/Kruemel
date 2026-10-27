# Krümel

A small food diary as an offline-first PWA: tap a tile when you have eaten something, and that's it. No calories, no amounts, no judgement. All data stays on the device in IndexedDB (Dexie). There is no backend, no account and no analytics. German by default, English too.

Live at https://kruemel.fabraham.dev. `SPEC.md` is the source of truth for behaviour and copy. The approved mockups are in `design/*.dc.html`.

## Requirements

- Node 22 or newer
- pnpm 10 (`packageManager` in `package.json` pins the version; `corepack enable` picks it up)

```sh
pnpm install
pnpm dev
```

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | `vue-tsc` type check of the app, then `vite build` into `dist/` (with the service worker and manifest) |
| `pnpm preview` | Serves `dist/` |
| `pnpm typecheck` | `vue-tsc --build` over all three projects: app (`tsconfig.app.json`), unit tests (`tsconfig.test.json`), node configs and e2e (`tsconfig.node.json`) |
| `pnpm lint` | ESLint (flat config, eslint-plugin-vue, typescript-eslint) |
| `pnpm test` | Vitest unit and component tests (jsdom + fake-indexeddb) |
| `pnpm test:e2e` | Builds, then runs Playwright on a Pixel 7 touch profile against `vite preview`. `PORT=4400 pnpm test:e2e` uses another port; `E2E_REUSE_SERVER=1` reuses a running preview |
| `pnpm icons` | Regenerates the app icons in `public/` (sharp) |
| `pnpm run deploy` | Build + `wrangler deploy` |

`pnpm dlx knip` checks for unused files and exports (`knip.json` ignores the fontsource packages, which are imported from CSS).

## Deploy

```sh
pnpm run deploy
```

Write `pnpm run deploy`, not `pnpm deploy`: the bare form is pnpm's own workspace command and fails with `ERR_PNPM_CANNOT_DEPLOY`.

The site is a static-assets-only Cloudflare Worker (`wrangler.jsonc`): no script, Cloudflare serves `./dist` with single-page-app fallback on the custom domain `kruemel.fabraham.dev`. Security headers (CSP and friends) come from `public/_headers`.

## Architecture

```
src/
  domain/        pure logic, fully unit tested: day keys and day start, entries, tree growth,
                 Vielfalt (week grid, month mosaic, card petals), tiles, settings validation
  db/            Dexie schema and first-run seed
  stores/        singleton reactive stores over Dexie (settings, tiles, entries, water, today),
                 persistence request, backup export/import
  tree/          seeded space-colonization tree (port of design/TreeArt.dc.html): colonize,
                 layout, palettes, TreeView.vue
  components/    by screen: today/, week/, variety/, tiles/, settings/, intro/, ui/ (shared)
  views/         one component per route
  pwa/           install prompt and manual install guides, service worker updates
  locales/de, locales/en
                 one JSON file per namespace; both locales must have the same keys
                 (checked by tests/unit/i18n.test.ts)
tests/unit/      cross-cutting unit tests; tests/e2e/ Playwright specs
design/          HTML mockups of every screen
```

The setting `showColors` switches the Vielfalt card and page. It keeps its old name because it is stored on devices and in backups.

## Patched dependency: reka-ui

`reka-ui` (dialogs, toasts and other UI primitives) is pinned to exactly `2.10.5` and patched. `pnpm-workspace.yaml` lists `patches/reka-ui@2.10.5.patch` under `patchedDependencies`, so `pnpm install` applies it automatically.

Why: upstream `useHideOthers` kept a spent `aria-hidden` undo and ran it again on unmount. That unbalanced aria-hidden's counters, and after opening sheets on different routes the whole app stayed `aria-hidden` for screen readers. The patch runs each undo exactly once. The e2e test "sheets on different routes never leave the app hidden from assistive tech" (`tests/e2e/smoke.spec.ts`) is the regression check. No upstream issue is linked yet.

Before bumping reka-ui, check whether upstream has fixed `useHideOthers`. If it has, drop the patch file and its `pnpm-workspace.yaml` entry. If not, recreate the patch with `pnpm patch reka-ui@<version>` and `pnpm patch-commit`. Run the e2e test either way.
