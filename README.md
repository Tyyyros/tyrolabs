# TyroLabs Toolbox

Desktop clipboard manager for Windows, built with Tauri v2, Rust, React 19,
TypeScript and Vite 7.

## Features

- Clipboard history for text, code-like snippets, links and images.
- Text, links, images and favorites views.
- Collections with drag and drop through `@dnd-kit`.
- In-memory Rust state synchronized to a JSON store to avoid repeated disk reads.
- Image clipboard support with files stored under the app data directory and served through Tauri's `asset://` protocol.
- Automatic cleanup for image files removed from history or truncated by history limits.
- Screen capture overlay backed by Rust commands and a dedicated `/capture` webview.
- Windows startup launch control through the official Tauri autostart plugin.
- Custom title bar, tray integration and system info drawer.
- Theme switching through local theme tokens.

## Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri v2 |
| Backend | Rust |
| Frontend | React 19 + TypeScript |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v3 + inline theme tokens |
| Icons | Local SVG icon set in `src/components/icons.tsx` + Lucide React for settings controls |
| Drag and drop | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Startup integration | `tauri-plugin-autostart`, `@tauri-apps/plugin-autostart` |

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
|   +-- hooks/
|   |   +-- useAutostart.ts
|   +-- lib/
|       +-- clipboard-store.ts
|       +-- colors.ts
|       +-- theme.tsx
+-- src-tauri/
|   +-- src/
|   |   +-- capture.rs
|   |   +-- clipboard.rs
|   |   +-- commands.rs
|   |   +-- lib.rs
|   |   +-- models.rs
|   |   +-- state.rs
|   |   +-- store.rs
|   |   +-- tray.rs
|   +-- capabilities/
|   |   +-- autostart.json
|   |   +-- default.json
|   +-- Cargo.toml
|   +-- tauri.conf.json
+-- package.json
+-- vite.config.ts
+-- tailwind.config.js
```

## Architecture Notes

The backend owns clipboard history and collections through `AppState` in
`src-tauri/src/state.rs`. Commands in `src-tauri/src/commands.rs` mutate that
state and persist through `src-tauri/src/store.rs`.

The frontend talks to Rust through Tauri `invoke` calls in
`src/lib/clipboard-store.ts`. Runtime IPC command names must stay synchronized
with `tauri::generate_handler!` in `src-tauri/src/lib.rs`.

Image clips are identified by a hash and resolved to app-data files by Rust.
The frontend should use the backend path resolver before showing or opening
image files.

Autostart is managed by the official Tauri autostart plugin. The frontend uses
`src/hooks/useAutostart.ts`, and permissions are scoped through
`src-tauri/capabilities/autostart.json`.

## Author

Tyyyros - https://github.com/Tyyyros
