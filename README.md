# TyroLabs Toolbox

Desktop clipboard manager for Windows, built with Tauri v2, Rust, React 19,
TypeScript and Vite 7.

## Features

- Clipboard history for text, code-like snippets, links and images. Pinned
  items float to the top of their tab (no separate "Favorites" tab). The
  watcher captures images from CF_DIB (decoded bitmaps), the encoded
  custom formats `PNG` / `image/png` / `image/jpeg` / `JFIF` / `image/gif` /
  `GIF` / `image/webp` / `image/bmp` / `image/tiff` (modern web apps,
  Notion, Claude, Slack, Discord), and CF_HDROP file lists (Ctrl+C on an
  image file in Explorer).
- Notes module with a Rich Text block editor (slash menu, floating toolbar), bento dashboard, tags, full-text search, per-note collections, and Markdown export. **Resizable images**: paste an image into a note (or use "Add to a note" from a clip) and drag the bottom-right handle to resize, Notion / Word style. Width persists in the document.
- **Add to a note** from the right-click context menu on any clip (text, link, image). Opens a centered picker with search + recent notes + "+ New note". Multi-selection of same-type items is honored — every selected clip is appended in one update, in visible order.
- Password generator tool: random charset mode (length, classes, custom chars,
  ambiguous-char filter) and passphrase mode (EFF-style wordlist, separator,
  digits, symbol). Strength meter via `zxcvbn`.
- Screen capture with two **dedicated sidebar buttons**: regular image
  capture (with normal / 5s-delayed sub-modes) and **OCR capture** that
  extracts text from the selected region via `Windows.Media.Ocr` and drops
  it into the clipboard. Mode is decided at trigger time — the overlay has
  no UI of its own beyond the selection rectangle.
- System info drawer with full diagnostics: hostname, local IPs, public IP
  (lazy), MAC addresses, DNS servers, OS, CPU, RAM, disks, GPU + driver,
  installed Java versions, top processes (with kill).
- Bilingual interface: full FR/EN i18n with the language toggle in Settings.
- Collections with drag and drop through `@dnd-kit/core` (clipboard silos and notes silo).
- In-memory Rust state synchronized to a JSON store to avoid repeated disk reads.
- Persisted clipboard settings for automatic capture and history limits.
- Image clipboard support with files stored under the app data directory and served through Tauri's `asset://` protocol.
- Inline image paste / drop in notes, persisted under `notes_assets/` and garbage collected when notes change or are deleted.
- Automatic cleanup for image files removed from history or truncated by history limits.
- Markdown export through the Tauri save dialog.
- Windows startup launch control through the official Tauri autostart plugin.
- Custom title bar, tray integration and system info drawer.
- Theme switching through local theme tokens. The selected theme and
  language are persisted across launches; scrollbars follow the active
  accent color.
- **Unified, sortable sidebar**: every navigation icon — clipboard tabs,
  Notes, Password, Capture (with normal/delayed/OCR sub-options), Settings,
  System — lives in a single drag-to-reorder column. Order persists per
  user.
- **System tray menu**: redesigned with a Capture submenu (Normal / Delayed
  / OCR) and labels in the active language at boot.

## Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri v2 |
| Backend | Rust |
| Frontend | React 19 + TypeScript |
| Build tool | Vite 7 |
| Styling | Inline theme tokens and CSS variables |
| Icons | Local SVG icon set in `src/components/icons.tsx` |
| Drag and drop | `@dnd-kit/core` |
| Notes Rich Text editor | TipTap 2 (`@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/suggestion`) |
| Notes Markdown export | `tiptap-markdown` (TipTap JSON → Markdown for `.md` export only) |
| Save dialog | `tauri-plugin-dialog`, `@tauri-apps/plugin-dialog` |
| Startup integration | `tauri-plugin-autostart`, `@tauri-apps/plugin-autostart` |
| OCR | `windows` (features `Media_Ocr` + `Graphics_Imaging` + `Security_Cryptography`) + `windows-future` |
| Password generator | `rand`, `zxcvbn`, embedded EFF-style wordlist |
| System diagnostics | `sysinfo`, `local-ip-address`, `ipconfig`/`wmic` parsing |
| i18n | In-house `useI18n()` hook + `STRINGS` dictionary (`src/lib/i18n.tsx`, `src/lib/strings.ts`) |

## Requirements

- Node.js 18 or newer
- Rust stable
- Microsoft C++ Build Tools on Windows
- WebView2 runtime on Windows

## Install

```bash
git clone https://github.com/Tyyyros/tyrolabs.git
cd tyrolabs
npm install
```

## Development

```bash
npm run tauri dev
```

The Vite frontend runs on `http://localhost:1420` when launched through Tauri.

## Build

```bash
npm run build
npm run tauri build
```

Production bundles are emitted under `src-tauri/target/release/bundle/`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run Vite only |
| `npm run build` | Type-check and build the frontend |
| `npm run tauri dev` | Run the full Tauri app in development |
| `npm run tauri build` | Build the desktop app |

## Project Structure

```text
tyrolabs/
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
|   |       +-- RichTextEditor.tsx
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
|   |   +-- PasswordPanel.tsx
|   +-- lib/
|       +-- clips.ts
|       +-- clipboard-store.ts
|       +-- colors.ts
|       +-- i18n.tsx
|       +-- strings.ts
|       +-- image-assets.ts
|       +-- note-assets.ts
|       +-- notes-conversion.ts
|       +-- theme.tsx
+-- src-tauri/
|   +-- src/
|   |   +-- error.rs
|   |   +-- lib.rs
|   |   +-- main.rs
|   |   +-- models.rs
|   |   +-- services/
|   |   |   +-- app_settings.rs
|   |   |   +-- store.rs
|   |   |   +-- system.rs
|   |   |   +-- tray.rs
|   |   +-- tools/
|   |       +-- capture/
|   |       +-- clipboard/
|   |       +-- notes/
|   |       +-- password/
|   +-- capabilities/
|   |   +-- autostart.json
|   |   +-- default.json
|   +-- Cargo.toml
|   +-- tauri.conf.json
+-- package.json
+-- vite.config.ts
```

## Architecture Notes

The backend owns clipboard history, clipboard settings and collections through
`ClipboardState` in `src-tauri/src/tools/clipboard/state.rs`. Commands in
`src-tauri/src/tools/clipboard/commands.rs` mutate that state and persist
through `src-tauri/src/tools/clipboard/storage.rs`.

The frontend talks to Rust through Tauri `invoke` calls in
`src/lib/clipboard-store.ts`. Runtime IPC command names must stay synchronized
with `tauri::generate_handler!` in `src-tauri/src/lib.rs`.

Clipboard settings are persisted under `clipboard.settings` in the shared store.
`capture_enabled` controls automatic watcher inserts, and `max_history` clamps
ungrouped history while preserving collection items.

Image clips are identified by a hash and resolved to app-data files by Rust.
The frontend caches resolved `asset://` URLs in `src/lib/image-assets.ts` before
showing image thumbnails.

Notes live under `src-tauri/src/tools/notes/`. They share the persistence file
(`clipboard_history.json`) but use disjoint keys (`notes.entries`,
`notes.collections`). Inline note media are stored under
`<app_data>/notes_assets/<hash>.<ext>` — the backend extracts referenced
hashes from each note body to garbage-collect orphaned files on update or
delete. Notes are edited as a single Rich Text format (TipTap JSON in `body`).
Markdown is only used at the boundary: on `.md` export the body is converted
through `tiptap-markdown` (`src/lib/notes-conversion.ts`).

Autostart is managed by the official Tauri autostart plugin. The frontend uses
`src/hooks/useAutostart.ts`, and permissions are scoped through
`src-tauri/capabilities/autostart.json`.

## Releases Link

https://github.com/Tyyyros/tyrolabs/releases/tag/v0.1.6

## Author

Tyyyros - https://github.com/Tyyyros

