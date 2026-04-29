# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

maeveOS (a fork of daedalOS) — a desktop environment that runs entirely in the browser. Built on Next.js 15 + React 19 with TypeScript. Apps, file system, windowing, and persistence all run client-side.

## Commands

Package manager is **Yarn 4** (`packageManager: yarn@4.14.1`). Tests use Jest, e2e uses Playwright.

```bash
yarn install
yarn build:prebuild   # MUST run once before `yarn dev` — generates fs index, RSS, search index, preloaded icons, robots.txt
yarn dev              # next dev
yarn dev:ssl          # next dev --experimental-https
yarn build            # build:prebuild + next build
yarn serve            # serve out (production static)

yarn test             # jest (single test: yarn test path/to/file.test.ts -t "name")
yarn e2e              # playwright test
yarn e2e:ui           # playwright with UI

yarn eslint
yarn stylelint        # styled-components syntax via postcss-styled-syntax
yarn prettier
yarn unused-exports   # ts-prune
```

If `yarn install` fails with `digital envelope routines::unsupported`, set `NODE_OPTIONS=--openssl-legacy-provider`.

The prebuild step (`scripts/fs2json.js`) walks `public/` and emits `public/.index/fs.9p.json`, which is the static index BrowserFS reads at runtime — if you add files under `public/` that should appear in the OS file system, you must re-run `yarn build:fs:public` (or `yarn build:prebuild`) for them to show up.

## Architecture

### Provider stack (`pages/_app.tsx`)

The whole app is wrapped, in order: `ViewportProvider` → `ProcessProvider` → `FileSystemProvider` → `SessionProvider` → `ErrorBoundary` → `StyledApp` → `MenuProvider`. Each provider lives in `contexts/<name>/` and is built with the same pattern:

- `contexts/contextFactory.tsx` — generic `contextFactory(useContextState)` returns `{ Provider, useContext }`.
- `contexts/<name>/useXContextState.ts` — the hook that owns all state for that domain.
- `contexts/<name>/index.ts` — wires the factory, re-exports `XProvider` and `useX`.
- `contexts/<name>/functions.ts` — pure helpers used by the state hook.

When adding state that needs to be shared, extend the relevant `useXContextState` rather than introducing a new context.

### Process / app system

`contexts/process/directory.ts` is the **single source of truth for installed apps**. Each entry maps a process key to `{ Component: dynamic(() => import(...)), icon, title, defaultSize, libs, dependantLibs, singleton, ... }`. Apps live under `components/apps/<AppName>/` and are loaded via `next/dynamic`. `libs`/`dependantLibs` are script paths under `public/` that the window loader injects before mounting the component.

`components/system/Apps/AppsLoader` reads from process state and renders one `Window` per running process. `components/system/Window/` handles drag/resize (react-rnd), min/max/close, persisted geometry, and animations (motion).

Other `components/system/` areas: `Desktop`, `Taskbar`, `StartMenu`, `Menu` (context menus), `Files` (file explorer pieces), `Dialogs` (Properties, RunDialog, etc.).

To add an app: create `components/apps/Foo/index.tsx`, register it in `contexts/process/directory.ts`, drop the icon under `public/System/Icons/`.

### File system

BrowserFS, configured in `contexts/fileSystem/FileSystemConfig.ts` as a `MountableFileSystem` with `OverlayFS` over `HTTPRequest` (read-only, served from `public/` via the prebuilt 9P index) + `IndexedDB` (writable user layer). All FS reads go through the read-only HTTP layer first, all writes land in IndexedDB. Power → Clear session wipes the IDB layer.

`contexts/fileSystem/useAsyncFs.ts` exposes promisified `readFile`, `writeFile`, `mkdir`, etc. — prefer these over calling `fs.*` directly.

### Session persistence

`contexts/session/` persists window geometry, icon positions, sort order, wallpaper, recent files, etc. to localStorage/IDB. When changing process or window state shape, check the session migration path.

### Workers

Heavy work (clock rendering, image resize, HEIC decode, dynamic wallpapers) runs in Web Workers, often drawing into `OffscreenCanvas`. Worker entry files use the `.worker.ts` suffix in `utils/` and are wired via `hooks/useWorker.ts`. Wallpaper/screensaver effects are in `utils/closeEffect*.ts`, `utils/spotlightEffect.ts`, etc.

### Path aliases

`tsconfig.json` sets `baseUrl: "."`, so imports are absolute from the repo root: `import X from "components/..."`, `"contexts/..."`, `"hooks/..."`, `"utils/..."`. Relative imports across top-level dirs are blocked by `eslint-plugin-no-relative-import-paths`.

### Styling

Styled-components v6. Global styles in `styles/`. Stylelint runs against `.tsx` files using `postcss-styled-syntax`, so component-level CSS is linted in-place.

## Testing

- Unit tests: Jest + jsdom, in `__tests__/` mirroring source paths. `e2e/` is excluded from Jest.
- E2E: Playwright, config in `playwright.config.ts`, specs under `e2e/`.
- Single Jest test: `yarn test <path> -t "<name>"`. Single Playwright spec: `yarn e2e <file>`.

## Conventions enforced by tooling

- ESLint config extends Airbnb + Next + Prettier with sonarjs, unicorn, regexp, hooks, jsx-a11y, sort-keys, deprecation, unused-imports, and `no-relative-import-paths`. Object keys and TS interface keys are sorted — keep entries in `directory.ts` and similar maps alphabetical.
- `husky` + `lint-staged` run prettier, eslint --fix, and stylelint --fix on staged files; don't bypass with `--no-verify`.
- `ts-prune` (`yarn unused-exports`) is run in CI — exported symbols that aren't imported anywhere will fail the check.
