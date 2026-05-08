# TyroLabs_V2 - project context

TyroLabs is a Windows desktop clipboard manager and notebook. The product
surface covers clipboard history (text/image/link silos with collections),
the Notes module (hybrid Rich Text / Markdown editor with bento dashboard,
tags, full-text search and per-note collections), screen capture and system
tray.

## Stack

- Tauri v2 for the native desktop shell.
- Rust backend.
- React 19 + TypeScript frontend.
- Inline theme tokens and CSS variables.
- In-house FR/EN i18n via `src/lib/i18n.tsx` + `src/lib/strings.ts`. Language is
  persisted server-side under `app.settings` (see `services/app_settings.rs`).
- Vite 7 build.
- Local SVG icon set in `src/components/icons.tsx`.
- `@dnd-kit/core` for drag and drop.
- TipTap 2 for the Notes Rich Text editor; `tiptap-markdown` only used for the `.md` export pipeline.
- `tauri-plugin-dialog` + `@tauri-apps/plugin-dialog` for the Markdown export save dialog.
- Official Tauri autostart plugin for Windows startup launch control.
- `windows-rs` (features `Media_Ocr` + `Graphics_Imaging` + `Security_Cryptography`)
  with `windows-future::AsyncStatus` for the in-capture OCR command.
- `zxcvbn` + `rand` for the Password generator strength meter and randomness;
  EFF-style wordlist embedded for the passphrase mode.
- `local-ip-address` plus `ipconfig`/`wmic` parsing for the System info panel.

## Current Structure

```text
TyroLabs_V2/
+-- src/
|   +-- App.tsx
|   +-- main.tsx
|   +-- themes.ts
|   +-- types.ts
|   +-- components/
|   |   +-- groups/
|   |   +-- layout/
|   |   +-- overlays/
|   |   +-- settings/
|   |   +-- tabs/
|   |   +-- ui/
|   +-- components/tools/notes/
|   |   +-- NotesPanel.tsx
|   |   +-- NotesSidebar.tsx
|   |   +-- NotesDashboard.tsx
|   |   +-- NoteCard.tsx
|   |   +-- NoteEditor.tsx
|   |   +-- TagPicker.tsx
|   |   +-- editor/
|   |       +-- RichTextEditor.tsx     (TipTap, only editor)
|   |       +-- FloatingToolbar.tsx
|   |       +-- SlashMenu.tsx
|   |       +-- extensions/
|   |           +-- ImagePaste.ts
|   |           +-- SlashCommand.ts
|   |           +-- tippyLite.ts
|   +-- hooks/
|   |   +-- useAutostart.ts
|   |   +-- useAppEvents.ts
|   |   +-- useClipboardSelection.ts
|   |   +-- useClipboardShortcuts.ts
|   |   +-- useClipboardViews.ts
|   |   +-- useNotesStore.ts
|   |   +-- useNotesViews.ts
|   |   +-- useToast.ts
|   +-- components/tools/password/
|   |   +-- PasswordPanel.tsx           (new — generator UI)
|   +-- lib/
|       +-- clips.ts
|       +-- clipboard-store.ts
|       +-- colors.ts
|       +-- i18n.tsx                    (new — I18nProvider, useI18n)
|       +-- strings.ts                  (new — FR/EN dictionary)
|       +-- image-assets.ts
|       +-- note-assets.ts
|       +-- notes-conversion.ts
|       +-- theme.tsx
+-- src-tauri/
    +-- tauri.conf.json
    +-- capabilities/
    |   +-- autostart.json
    |   +-- default.json
    +-- src/
        +-- main.rs
        +-- lib.rs
        +-- error.rs
        +-- models.rs
        +-- services/
        |   +-- app_settings.rs         (new — language preference)
        |   +-- store.rs
        |   +-- system.rs
        |   +-- tray.rs
        +-- tools/
            +-- capture/
            +-- clipboard/
            +-- notes/
            |   +-- mod.rs
            |   +-- state.rs
            |   +-- storage.rs
            |   +-- commands.rs
            |   +-- media.rs
            +-- password/               (new tool)
                +-- mod.rs
                +-- commands.rs
                +-- wordlist.rs
```

## Backend Conventions

- `src-tauri/src/lib.rs` owns the Tauri builder, managed state and
  `tauri::generate_handler!` command registry.
- `src-tauri/src/tools/clipboard/state.rs` defines shared in-memory clipboard
  state: clips, clipboard settings and collections are held behind `Mutex`.
- `src-tauri/src/tools/clipboard/storage.rs` synchronizes that state with the
  JSON store.
- `src-tauri/src/tools/clipboard/watcher.rs` watches the OS clipboard and emits
  `clipboard://new-item` after inserting new clips.
- `src-tauri/src/tools/clipboard/commands.rs` exposes clipboard IPC commands
  used by the frontend.
- `src-tauri/src/tools/capture/` contains screenshot capture commands and
  Windows window enumeration for the capture overlay.
- `src-tauri/src/tools/notes/` owns the Notes module: `state.rs`, `storage.rs`
  (keys `notes.entries` and `notes.collections` in the shared store),
  `commands.rs` (CRUD + asset save/path + export markdown + write file) and
  `media.rs` (asset save/delete and ref extraction for GC). Notes emit
  `notes://changed` and `notes://deleted`.
- Clipboard settings are persisted under `clipboard.settings` with
  `capture_enabled` and `max_history`.
- Avoid `unwrap()` for user-driven data and external IO. `expect(...)` is
  acceptable only for internal invariants such as poisoned mutexes.
- IPC command names in Rust must stay synchronized with frontend `invoke`
  string literals. TypeScript does not catch command-name drift.

## Frontend Conventions

- `src/lib/clipboard-store.ts` is the main frontend bridge to clipboard backend commands.
- `src/hooks/useNotesStore.ts` is the Notes IPC bridge (CRUD, collections, assets, export, file write).
- `src/hooks/useClipboardViews.ts` owns filtered text/image/link/favorites
  derivations.
- `src/hooks/useNotesViews.ts` owns notes filtering by collection / tags / search and tag aggregation.
- `src/hooks/useClipboardSelection.ts` owns single, multi and range selection.
- `src/lib/image-assets.ts` caches image hash to `asset://` URL resolution.
- `src/lib/note-assets.ts` mirrors that cache for note assets and exposes
  `saveNoteAsset` and the `note-asset://<hash>.<ext>` reference scheme used
  for backend GC.
- `src/lib/notes-conversion.ts` runs a headless TipTap editor with
  `tiptap-markdown` to convert TipTap JSON to Markdown on `.md` export.
  There is no in-app Markdown editor and no Markdown→TipTap path.
- `src/hooks/useAutostart.ts` owns the frontend autostart state machine.
- `src/types.ts` is the TypeScript contract for serialized Rust models.
- `collection_id` is the active frontend and serialized field name for clip
  collections. Rust may still accept legacy `group_id` on read, but it should
  serialize `collection_id`.
- `pinned` is the active favorite flag. Rust may accept legacy `fav` on read,
  but should not serialize `fav`.
- The custom title bar uses `data-tauri-drag-region`.
- Window controls use `getCurrentWindow().{minimize,toggleMaximize,close}()`.
- Main app route renders `App`; `/capture` renders `CaptureOverlay`.

## Product State

- The app is an advanced clipboard manager with text, links and images views.
  The dedicated "Favorites" tab has been removed; pinned items now float to
  the top of their original tab (see `useClipboardViews.ts:pinnedFirst`).
- Collections are supported with drag and drop and persisted by the backend.
- A Password generator tool ships its own tab (random charset and passphrase
  modes, strength meter via `zxcvbn`).
- The capture overlay supports two modes — "Image" (default, saves to clipboard
  history) and "OCR" (extracts text via `Windows.Media.Ocr` and copies it to
  the system clipboard via `arboard`).
- The System drawer shows full diagnostics (network / system / hardware /
  runtimes / processes), with per-line copy buttons and per-process kill.
  The `SYS_INFO` overtitle has been removed.
- UI is fully bilingual FR/EN via the new i18n layer; the language toggle
  lives in Settings and is persisted under `app.settings`.
- Images are stored under the app data directory and served through Tauri's
  `asset://` protocol.
- Image garbage collection deletes files removed from history or truncated by
  the history limit.
- The Notes module ships a Rich Text block editor (slash menu, floating
  toolbar) with a bento dashboard, per-note collections (drag and drop),
  tags, full-text search and Markdown export through the Tauri save dialog.
- Inline note media are stored under `<app_data>/notes_assets/` and garbage
  collected when notes change format or are deleted.
- Screen capture is integrated through a dedicated overlay window and Rust
  screenshot commands.
- Windows startup launch is managed through `tauri-plugin-autostart` with
  explicit capability permissions in `src-tauri/capabilities/autostart.json`.
- System commands avoid direct `cmd.exe` shell invocation.

## Repository

- Local source: `C:\Users\lambe\TyroLabs_V2`
- GitHub repository: https://github.com/Tyyyros/tyrolabs

## Sync Rule

Any meaningful app evolution, such as a new module, architecture change, stack
change, persisted data contract change or feature-level behavior change, must be
reflected in both:

1. The README for `Tyyyros/tyrolabs`.
2. This `AGENTS.md` file.

Do not update both files for cosmetic-only changes.
