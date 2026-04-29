# Modernization Bundle Design

**Date:** 2026-04-29
**Scope:** Single spec covering three coordinated workstreams: daedalOS → maeveOS rebrand, Yarn 4 audit, BrowserFS → ZenFS migration.

## Goals

1. Complete the daedalOS → maeveOS rebrand across user-facing strings, configuration, and Docker tags.
2. Finish the in-progress Yarn 4 migration: lock the Yarn binary, fix `.gitignore` gaps, sweep for Yarn 1-isms.
3. Replace BrowserFS (unmaintained, git-sourced) with ZenFS (maintained, npm-published) without changing user-facing FS behavior.

## Non-goals

- Preserving existing user data across the migration. The fork is pre-release; a fresh start is acceptable. Old `"browserfs"` IndexedDB stores will be orphaned, not migrated.
- Replacing third-party vendored bundles such as `public/Program Files/BoxedWine/browserfs.boxedwine.js`. Those are emulator build artifacts unrelated to our FS layer.
- Updating upstream-pointing README links (e.g., screenshot URL, GitHub references). Left as placeholders until the user provides replacements.
- Any Rust integration (separate roadmap: D → A → C, deferred).

## Approach

Three sequential phases on a single branch, one or more commits per phase, so each phase is independently bisectable and revertable.

Order:
1. **Rebrand** — string-level changes, lowest risk, clears the namespace.
2. **Yarn 4 cleanup** — build-infra only, clean tree before the architectural change.
3. **BrowserFS → ZenFS** — the architectural change.

## Phase 1 — Rebrand

### Literal string replacements (`daedalOS` / `daedalos` → `maeveOS` / `maeveos`)

- `README.md` — title heading and `docker build -t daedalos` examples
- `Dockerfile` — `WORKDIR daedalOS`
- `e2e/constants.ts` — `BASE_APP_TITLE = "daedalOS"`
- `utils/constants.ts`
- `scripts/rssBuilder.js`
- `components/apps/Browser/config.ts`

### Non-string changes

- `package.json.author.url` → `""` (blank, per user direction).
- `contexts/fileSystem/core.ts:126,149` — leave `"browserfs"` IDB probe string alone; that string is BrowserFS's *internal* IDB database name, not ours, and it is replaced wholesale in Phase 3.

### Out of scope

- README screenshot URL and other upstream `DustinBrett/daedalOS` links: untouched until the user provides replacement assets.
- `CLAUDE.md`'s "(a fork of daedalOS)" provenance line: kept intentionally as historical context.
- Vendored third-party emulator bundles under `public/Program Files/` and `public/System/BrowserFS/`: not modified in this phase.

### Verification

- `yarn dev` boots successfully.
- `grep -ri daedalos` returns only the upstream README links and the CLAUDE.md provenance line.

## Phase 2 — Yarn 4 cleanup

Repo is already at Yarn 4.14.1 with `nodeLinker: node-modules`. This phase finishes the migration.

### `.gitignore` additions

Standard Yarn Berry pattern:

```
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
```

Currently nothing under `.yarn/` is gitignored, so the 1.3 MB machine-specific `.yarn/install-state.gz` would otherwise be committed.

### Pin the Yarn release

- Run `yarn set version 4.14.1` to ensure `.yarn/releases/yarn-4.14.1.cjs` exists.
- Add `yarnPath: .yarn/releases/yarn-4.14.1.cjs` to `.yarnrc.yml`.
- Combined with the existing `packageManager: yarn@4.14.1` in `package.json`, this guarantees every machine and CI runner uses the identical Yarn binary.

### Yarn-1-ism sweep

- `package.json` scripts (`yarn build:prebuild`, `yarn build`, etc.) — already Berry-compatible, no change.
- `update` script (`yarn upgrade-interactive --latest`) — built-in to Berry 4.x, no change.
- `.github/workflows/main.yml` — if it uses `yarn install --frozen-lockfile`, switch to `yarn install --immutable`.
- `lint-staged` — invokes binaries directly, no change needed.

### Verification

- `yarn install --immutable` succeeds with a clean `.yarn/`.
- `yarn dev` and `yarn build` still run.

## Phase 3 — BrowserFS → ZenFS

### Dependency swap

In `package.json`:

- Add: `@zenfs/core`, `@zenfs/dom` (provides `Fetch`, `IndexedDB`), `@zenfs/archives` (provides `Zip`, `Iso`).
- Remove: the `browserfs` git-sourced dependency.

In `.yarnrc.yml`:

- Drop the `https://github.com/jvilk/*` entry from `approvedGitRepositories` (no longer needed).
- Keep `Schneegans` and `photopea` entries (still in use elsewhere).

### Rewrites under `contexts/fileSystem/`

#### `FileSystemConfig.ts`
Replace the BrowserFS `MountableFileSystem(OverlayFS(HTTPRequest, IndexedDB))` config with ZenFS's `Overlay`:

- `readable`: `Fetch` backend pointed at the regenerated static index
- `writable`: `IndexedDB` backend with `storeName: "maeveos"` when persisting, or `InMemory` for memory-only mode

The new `storeName: "maeveos"` is what realises the Q1 "fresh start" decision — the old `"browserfs"` IDB is left orphaned, not migrated.

#### `useAsyncFs.ts`
ZenFS ships a native `fs/promises`-shaped API, so this becomes a thin pass-through that calls ZenFS's `configure(...)` and re-exports the promise FS. Exported function names stay stable to avoid churn at call sites.

#### `core.ts`
- Keep `supportsIndexedDB` and `hasIndexedDB` — they use native `window.indexedDB`, independent of BrowserFS.
- Replace `fs9pToBfs` with whatever loader the rewritten `Fetch` backend requires. If ZenFS's `Fetch` reads the index file directly given a URL, no helper is needed.

#### `functions.ts`
The `rootFs._getFs("/")` and `OverlayFS`/`HTTPRequest` introspection used to detect "is the writable layer empty?" must move to ZenFS's mount API. **Risk:** if ZenFS does not expose the equivalent introspection, fall back to listing the writable root and checking for non-stub entries. Confirm during implementation before finalizing.

#### `useFileSystemContextState.ts`
Replace runtime mounts:
- `HTTPRequest.Create(...)` → `mount(path, await resolveMountConfig({backend: Fetch, ...}))`
- `IsoFS.Create({data})` → `mount(path, await resolveMountConfig({backend: Iso, data}))` from `@zenfs/archives`
- `ZipFS.Create({zipData})` → `mount(path, await resolveMountConfig({backend: Zip, data: zipData}))` from `@zenfs/archives`

### Static index regeneration

- Rewrite `scripts/fs2json.js` to emit ZenFS `Fetch` backend index format directly (per Q3-A). Schema must be confirmed against `@zenfs/dom` source before writing.
- Output path moves: `public/.index/fs.9p.json` → `public/.index/fs.json`. Private build emits `public/.index/fs.private.json`.
- `package.json` `build:fs:public` and `build:fs:private` script paths updated accordingly.

### Consumer updates (~20 files)

Type imports of the form `import type X from "browserfs/dist/node/backend/Y"` need replacing across:

- `utils/search.ts` (currently imports `IndexedDBFileSystem` type)
- `components/system/Files/FileManager/{useFolder.ts,functions.ts}`
- `components/system/Files/FileEntry/{functions.ts,ColumnRow.tsx}`
- `components/system/Taskbar/Search/{functions.ts,ResultEntry.tsx,Details.tsx}`
- `components/system/Dialogs/Properties/useStats.ts`
- `components/apps/Terminal/processGit.ts`
- `contexts/process/directory.ts`
- `contexts/session/useSessionContextState.ts`

Most are stat-shape types and `BFSCallback<T>` callbacks. They map to ZenFS's standard `Stats` and the promise API (callbacks → `await`ed calls).

### Cleanup

- `public/System/BrowserFS/browserfs.min.js` and `extrafs.min.js`: grep for runtime references; if nothing loads them, delete.
- `public/Program Files/BoxedWine/browserfs.boxedwine.js`: leave (third-party emulator bundle, unrelated to our FS layer).
- Remove now-dead side-effect imports of `"browserfs"`.

### Verification

- `yarn build:prebuild` produces a valid `public/.index/fs.json` consumable by ZenFS `Fetch`.
- `yarn dev` boots, file explorer lists `/`.
- Write a `.txt` via Monaco Editor → refresh page → file persists (IDB writable layer working).
- Open a `.zip` → ZipFS mount lists archive contents.
- Open a `.iso` → IsoFS mount lists ISO contents.
- `yarn test` (Jest) passes — no FS-layer changes expected to affect existing unit tests.
- `yarn e2e` (Playwright) passes — exercises file-system flows end-to-end.

### Risks

1. **ZenFS Overlay introspection parity.** The "writable layer empty?" detection in `functions.ts` depends on a BrowserFS internal accessor. Mitigation noted above.
2. **Fetch index format schema.** Must be confirmed against `@zenfs/dom` source before rewriting `fs2json.js`. Schema mismatch produces a silent-failure FS at boot.
3. **Synchronous BrowserFS callers.** ZenFS is async-first; any `fs.readFileSync`-style usage breaks. Grep during implementation to surface.
4. **Side-effect timing.** BrowserFS attached itself to `window.fs`/`window.process` via side-effect import; ZenFS's initialization is explicit. Any code that assumed those globals at import time needs to await `configure(...)` first.

## Phasing summary

| Phase | Files touched | Risk | Reversible |
|-------|---------------|------|------------|
| 1 — Rebrand | ~7 source files + `package.json` | Low | Trivially |
| 2 — Yarn cleanup | `.gitignore`, `.yarnrc.yml`, `.yarn/releases/`, possibly `.github/workflows/main.yml` | Low | Trivially |
| 3 — ZenFS | ~25 source files, `package.json`, `scripts/fs2json.js`, `.yarnrc.yml` | High | Via revert of phase commits |

## Out of scope (for future specs)

- Tauri shell wrapping maeveOS as a desktop app (Rust roadmap step D).
- Rust → WASM perf modules for image/compression utilities (Rust roadmap step A).
- Replacing further subsystems with Rust → WASM (Rust roadmap step C).
- Replacing upstream README links and screenshot with maeveOS-branded assets.
- Migrating any data from the orphaned `"browserfs"` IndexedDB store.
