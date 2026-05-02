# TyroLabs_V2 - project context

TyroLabs is a Windows desktop clipboard manager. It is not currently organized
as a generic multi-tool registry; the active product surface is clipboard
history, collections, images, capture and system/tray UI.

## Stack

- Tauri v2 for the native desktop shell.
- Rust backend.
- React 19 + TypeScript frontend.
- Tailwind CSS v3 plus inline theme tokens.
- Vite 7 build.
- Local SVG icon set in `src/components/icons.tsx`.
- Lucide React is available for settings-level controls.
- `@dnd-kit/core` and `@dnd-kit/sortable` for drag and drop.
- Official Tauri autostart plugin for Windows startup launch control.

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
|   +-- hooks/
|   |   +-- useAutostart.ts
|   +-- lib/
|       +-- clipboard-store.ts
|       +-- colors.ts
|       +-- theme.tsx
+-- src-tauri/
    +-- tauri.conf.json
    +-- capabilities/
    |   +-- autostart.json
    |   +-- default.json
    +-- src/
        +-- main.rs
        +-- lib.rs
        +-- capture.rs
        +-- clipboard.rs
        +-- commands.rs
        +-- models.rs
        +-- state.rs
        +-- store.rs
        +-- tray.rs
```

## Backend Conventions

- `src-tauri/src/lib.rs` owns the Tauri builder, managed state and
  `tauri::generate_handler!` command registry.
- `src-tauri/src/state.rs` defines shared in-memory state:
  clipboard clips and collections are held in `AppState` behind `Mutex`.
- `src-tauri/src/store.rs` synchronizes that state with the JSON store.
- `src-tauri/src/clipboard.rs` watches the OS clipboard and emits
  `clipboard://new-item` after inserting new clips.
- `src-tauri/src/commands.rs` exposes IPC commands used by the frontend.
- `src-tauri/src/capture.rs` contains Windows window enumeration for the
  capture overlay.
- Avoid `unwrap()` for user-driven data and external IO. `expect(...)` is
  acceptable only for internal invariants such as poisoned mutexes.
- IPC command names in Rust must stay synchronized with frontend `invoke`
  string literals. TypeScript does not catch command-name drift.

## Frontend Conventions

- `src/lib/clipboard-store.ts` is the main frontend bridge to backend commands.
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

- The app is an advanced clipboard manager with text, links, images and
  favorites views.
- Collections are supported with drag and drop and persisted by the backend.
- Images are stored under the app data directory and served through Tauri's
  `asset://` protocol.
- Image garbage collection deletes files removed from history or truncated by
  the history limit.
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
