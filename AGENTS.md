# Marker Agent Notes

## Project summary
- Desktop markdown editor built with Tauri v2 (Rust backend) and a Vite + React frontend.
- Editing uses Tiptap with custom extensions, YAML front matter, and Markdown <-> HTML conversion.
- State persistence is split between Tauri store (`.apps.dat`) and `localStorage`.
- Tailwind v4 uses CSS-first config in `src/styles/globals.css`.

## Quick start
- Prereqs: Node + pnpm, Rust toolchain, Tauri system deps for your OS.
- Install JS deps: `pnpm install`
- Frontend only: `pnpm dev`
- Full app (Tauri shell): `pnpm tauri dev`
- File-tree frontend derivation test: `pnpm test:file-tree`
- Release version bump test: `pnpm test:bump-version`
- Release build: `pnpm tauri build`

## Repo layout
- `src/`: React app (UI, editor, state).
- `src/components/`: UI and features (Editor, Project, Settings, Main).
- `src/hooks/`: Tiptap editor setup (`useEditor`).
- `src/store/`: Zustand store + rehydration from Tauri store.
- `src/utils/`: Markdown conversion, file metadata, helpers.
- `src/styles/`: global styles and Tailwind v4 theme tokens.
- `src-tauri/`: Rust backend, Tauri config, menu, commands.
- `public/`: static assets.

## Frontend architecture
- Entry: `src/main.tsx` sets router + theme + settings dialog.
- Routing:
  - `/` renders `src/App.tsx` (project list).
  - `/project/:id` renders `src/Project.tsx` -> `src/components/Project/App.tsx`.
- Global state: `src/store/appStore.ts` (Zustand).
  - `projects`, `currProject`, `files`, `currFile`, `sortInfo`, `settings`.
  - `restoreState()` in `src/store/restoreState.ts` hydrates from Tauri store.
- File tree:
  - Native scan happens in Tauri and returns directories plus markdown files.
  - Frontend derivation in `src/utils/fileTree.ts` computes directory-only presentation flags such as `containsNoMarkdownFiles`.
  - The file-tree derivation test lives at `src/utils/fileTree.derive.test.ts` and runs via `pnpm test:file-tree`.
  - File metadata is fetched via a Tauri command (`get_file_metadata`).
- Editor:
  - `src/components/Editor/Editor.tsx` loads markdown, parses front matter, and writes back.
  - Tiptap setup in `src/hooks/useEditor.ts` with custom nodes and extensions.
  - `TableOfContents` extension manages heading ids + TOC data.
  - `Metadata` extension stores `projectDir`, `filePath`, and asset folder.
- Settings:
  - `src/components/Settings/AppSettings.tsx` opens via menu item.
  - Theme stored in `localStorage` (`ui-theme`); editor settings stored in store + `localStorage`.
- Publishing:
  - `src/components/Editor/Publish.tsx` runs `git add/commit/push` using Tauri shell API.

## Backend (Tauri)
- Entry: `src-tauri/src/main.rs`.
- Command:
  - `get_file_metadata(filepath)` returns created/updated timestamps.
- Plugins:
  - `tauri-plugin-store` for `.apps.dat` storage.
  - `tauri-plugin-fs`, `tauri-plugin-dialog`, `tauri-plugin-shell`, `tauri-plugin-updater`.
- Menu: `src-tauri/src/menu.rs` adds Settings menu item.
- Config: `src-tauri/tauri.conf.json` (v2 config + capabilities).

## Data flow (core edit loop)
1. Startup calls `restoreState()` -> load projects/sort/currProject from store.
2. Selecting a project reads the directory tree and populates `files`.
3. Selecting a file loads markdown -> parses YAML front matter -> converts to HTML -> sets Tiptap content.
4. Editor changes debounce-save (200ms), convert HTML -> Markdown, prepend YAML, and write to disk.

## Persistence
- Tauri store (app data):
  - `projects`, `currProject`, `sortInfo`, and `id` counter.
- `localStorage`:
  - `settings` (currently `showTOC`).
  - `ui-theme`.

## Known pitfalls / gotchas
- Tauri dev port alignment:
  - `pnpm dev` runs Vite on port `6275`.
  - `src-tauri/tauri.conf.json` is set to `devUrl: http://localhost:6275`.
  - Keep them in sync if you change the dev port.
- `createProject` id increment is string-based; it can produce ids like `01`, `011`, etc.
- Editor always writes YAML front matter; files without it will gain one.
- File tree is not live-watched; refresh happens on project load or add-file.
- The file-tree frontend test relies on Node's built-in test runner with `--experimental-strip-types`, so run it through `pnpm test:file-tree` instead of plain `node --test`.
- `Publish` runs `git` in the project directory; make sure a repo exists.
- Tailwind config lives in `src/styles/globals.css` via `@theme`; `components.json` keeps an empty `tailwind.config` for shadcn.
- Release version is duplicated in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`; use `pnpm bump:version <x.y.z>` to keep them aligned.
- The GitHub `Release` workflow is manual-only and derives the release tag as `vX.Y.Z` from those three version files after verifying they match.
- The workflow uses a non-matrix prepare job to fail if the tag already exists and to create the draft release once with GitHub-generated release notes.
- The matrix build jobs then upload platform binaries into that existing draft release, which avoids races around tag and release creation.
- Fork release automation is currently for downloadable binaries only. The Tauri updater is still configured against upstream and should not be treated as fork-owned auto-update infrastructure. The workflow therefore does not use Tauri updater signing secrets for now.

## Updating dependencies
- This is Tauri v2; use `@tauri-apps/plugin-*` + `tauri-plugin-*` versions together.
- Update `pnpm-lock.yaml` consistently after any dependency changes.
