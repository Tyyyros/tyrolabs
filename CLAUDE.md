# TyroLabs — contexte projet

Application desktop Windows : gestionnaire de presse-papiers avancé + module
Notes (éditeur hybride Rich Text / Markdown). Chaque "outil" est une unité
autonome qui vit côté backend Rust **et** côté frontend React, branchée par
un handler Tauri unique côté backend et par un onglet/registre côté frontend.

## Stack

- **Tauri v2** (backend Rust, fenêtre native Windows)
- **React 19 + TypeScript** (frontend)
- **Vite 7** (build)
- **Styles inline + tokens de thème** via CSS variables (pas de Tailwind, pas
  de framework CSS — tout passe par `useTheme()` et `C` dans
  `src/lib/colors.ts`)
- **i18n FR/EN** maison via `src/lib/i18n.tsx` + dico `src/lib/strings.ts` ;
  langue persistée via `services/app_settings.rs` (clé store `app.settings`)
- **Icônes locales SVG** dans `src/components/icons.tsx` (`Ic.*`)
- `@dnd-kit/core` pour le drag & drop
- **TipTap 2** pour l'éditeur RTE des Notes (seul éditeur, pas de mode Markdown)
- `tiptap-markdown` uniquement pour le pipeline d'export `.md`
- `tauri-plugin-store` pour la persistance JSON partagée
- `tauri-plugin-dialog` pour le save dialog (export `.md`)
- `tauri-plugin-autostart` pour le lancement Windows
- **Windows.Media.Ocr** (via `windows-rs` features `Media_Ocr` + `Graphics_Imaging`,
  bloquage via `windows-future::AsyncStatus`) pour l'OCR du tool Capture
- `zxcvbn` + `rand` + wordlist embarquée pour le tool Password generator
- `local-ip-address` + parsing `ipconfig` / `wmic` pour les diagnostics système

## Structure de dossiers

```
TyroLabs/
├── src/                                 # Frontend React
│   ├── App.tsx                          # routing onglets + DndContext global
│   ├── components/
│   │   ├── layout/                      # TitleBar, Sidebar, StatusBar
│   │   ├── overlays/                    # Settings, SysDrawer, EditorPanel, CtxMenu
│   │   ├── groups/                      # CollectionBar, CreateCollectionModal
│   │   ├── tabs/                        # TextTab, ImagesTab, LinksTab
│   │   ├── tools/notes/                 # Module Notes complet
│   │   │   ├── NotesPanel.tsx           # orchestrateur (sidebar + dashboard | éditeur)
│   │   │   ├── NotesSidebar.tsx         # collections (droppables) + tags
│   │   │   ├── NotesDashboard.tsx       # bento grid
│   │   │   ├── NoteCard.tsx             # carte (drag source)
│   │   │   ├── NoteEditor.tsx           # header + RTE
│   │   │   ├── TagPicker.tsx
│   │   │   └── editor/
│   │   │       ├── RichTextEditor.tsx   # TipTap (seul éditeur)
│   │   │       ├── FloatingToolbar.tsx  # bubble menu sur sélection
│   │   │       ├── SlashMenu.tsx        # popup React des commandes /
│   │   │       └── extensions/
│   │   │           ├── SlashCommand.ts  # extension TipTap (suggestion)
│   │   │           ├── ImagePaste.ts    # extension TipTap (paste/drop)
│   │   │           └── tippyLite.ts     # positionneur popup minimal
│   │   ├── ui/                          # Toggle, Toast (réutilisables)
│   │   └── icons.tsx                    # `Ic.*`
│   ├── hooks/
│   │   ├── useAppEvents.ts
│   │   ├── useAutostart.ts
│   │   ├── useClipboardSelection.ts
│   │   ├── useClipboardShortcuts.ts
│   │   ├── useClipboardViews.ts
│   │   ├── useNotesStore.ts             # IPC bridge Notes
│   │   ├── useNotesViews.ts             # filtrage collection/tags/recherche
│   │   └── useToast.ts
│   ├── lib/
│   │   ├── clipboard-store.ts           # IPC bridge clipboard
│   │   ├── colors.ts                    # tokens C.*
│   │   ├── theme.tsx                    # ThemeProvider + useTheme()
│   │   ├── i18n.tsx                     # I18nProvider + useI18n() + persistance
│   │   ├── strings.ts                   # dico FR / EN
│   │   ├── image-assets.ts              # cache hash → asset:// (clipboard)
│   │   ├── note-assets.ts               # cache hash → asset:// (notes) + saveNoteAsset
│   │   └── notes-conversion.ts          # TipTap JSON → Markdown pour export .md
│   ├── themes.ts                        # 10 thèmes (5 sombres / 5 clairs)
│   ├── types.ts                         # contrats partagés Rust↔TS
│   └── main.tsx
│
└── src-tauri/                           # Backend Rust
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/default.json        # ACL : window, store, dialog:save, autostart
    └── src/
        ├── main.rs                      # appelle lib::run()
        ├── lib.rs                       # Builder + .manage() + invoke_handler!
        ├── error.rs                     # ToolError + ToolResult<T>
        ├── models.rs                    # Clip, Collection, Note, NoteFormat, NotePatch
        ├── services/
        │   ├── app_settings.rs          # get/set_app_settings (langue, thème, sidebar_order — patch partiel)
        │   ├── store.rs                 # STORE_FILE + migrate_key
        │   ├── system.rs                # diagnostics OS + IP/MAC/DNS/GPU/Java/processes
        │   └── tray.rs                  # tray menu
        └── tools/
            ├── capture/                 # capture d'écran (mode image|ocr piloté par la sidebar) + ocr_capture_area (Windows.Media.Ocr)
            ├── clipboard/               # historique + collections (3 silos) + watcher multi-format (CF_DIB, PNG/JPEG/GIF/WebP/BMP/TIFF custom, CF_HDROP)
            ├── notes/                   # CRUD notes + collections + médias + export
            │   ├── mod.rs
            │   ├── state.rs             # NotesState : Mutex<Vec<Note>> + Mutex<Vec<Collection>>
            │   ├── storage.rs           # clés notes.entries / notes.collections
            │   ├── commands.rs          # 12 commandes Tauri
            │   └── media.rs             # save/get/delete asset + extract_asset_refs
            └── password/                # générateur (random + passphrase)
                ├── mod.rs
                ├── commands.rs          # generate_password / generate_passphrase
                └── wordlist.rs          # wordlist EFF-style embarquée
```

## Convention : ajouter un outil

Pas de dispatcher central qui grossit. Pour un nouvel outil `<nom>` :

1. **Backend** — créer `src-tauri/src/tools/<nom>/` avec `mod.rs`,
   `state.rs`, `storage.rs`, `commands.rs` (calque sur `clipboard/` ou
   `notes/`). Les commandes renvoient `ToolResult<T>`.
2. Déclarer dans `src-tauri/src/tools/mod.rs` : `pub mod <nom>;`.
3. Brancher l'état (`app.manage(<Nom>State { ... })`) dans le `setup` de
   `lib.rs`, et ajouter chaque commande dans `tauri::generate_handler![...]`.
4. **Frontend** — créer `src/components/tools/<nom>/<Nom>Panel.tsx` (ou un
   `tab` dans `src/components/tabs/` si l'outil partage la grille
   clipboard).
5. Ajouter l'id dans `TabId` (`src/types.ts`), l'item dans le `NAV` de
   `Sidebar.tsx`, l'icône dans `icons.tsx`, le rendu dans `App.tsx`.
6. Si l'outil consomme du DnD : étendre `handleDragStart` / `handleDragEnd`
   de `App.tsx` (un seul `DndContext` global).

## Règles transverses

- **Erreurs** : tout chemin renvoie `Result<T, ToolError>`. Ajouter une
  variante dans `error.rs` plutôt qu'un nouveau type d'erreur ad hoc.
- **État partagé** : champs `Mutex` dans la struct dédiée à l'outil,
  `app.manage()` au boot. Les outils n'accèdent pas à l'état des autres.
- **Persistance** : clé namespacée `<tool>.<key>` dans le fichier store
  partagé (`STORE_FILE` de `services/store.rs`). Une migration via
  `migrate_key` est attendue pour toute clé renommée.
- **Logique pure** : dans des fichiers séparés des commandes Tauri pour
  pouvoir tester sans booter Tauri (`cargo test`).
- **Aucun `unwrap()`** sur les entrées utilisateur ou IO externe ; `expect`
  réservé aux invariants internes (mutex empoisonné, etc.).
- **IPC** : les noms de commandes Rust (`#[tauri::command]`) doivent rester
  alignés avec les `invoke("<nom>", { ... })` côté frontend. TypeScript ne
  capture pas les drifts.

## Conventions UI

- Barre de titre custom (`decorations: false`), drag via
  `data-tauri-drag-region`.
- Contrôles fenêtre via `getCurrentWindow().{minimize, toggleMaximize, close}()`.
- **Styles inline + thème** : pas de Tailwind. Tous les styles passent par
  `useTheme()` et les tokens `C.*`. Les couleurs avec opacité utilisent
  `hexToRgba(theme.accent, 0.18)`.
- Icônes via `<Ic.<Name> />` — toutes locales, stroke configurable.

## Outils

| Outil     | Statut       | Module backend                | Composant frontend                              |
|-----------|--------------|-------------------------------|-------------------------------------------------|
| clipboard | ✅ livré     | `src-tauri/src/tools/clipboard/` | `src/components/tabs/{Text,Images,Links}Tab.tsx` |
| notes     | ✅ livré     | `src-tauri/src/tools/notes/`     | `src/components/tools/notes/NotesPanel.tsx`     |
| capture   | ✅ livré     | `src-tauri/src/tools/capture/`   | 2 boutons sidebar dédiés (Camera + ScanText) → webview `/capture` selon `mode` |
| password  | ✅ livré     | `src-tauri/src/tools/password/`  | `src/components/tools/password/PasswordPanel.tsx` |

L'onglet **Favoris** a été retiré — la fonction `pin` est conservée et fait
remonter les items épinglés en tête de leur onglet d'origine
(cf. `useClipboardViews.ts:pinnedFirst`).

Le panneau **Système** (`overlays/SysDrawer.tsx`) expose désormais Network /
System / Hardware / Runtimes / Processes — chaque ligne est copiable, les
processus listés peuvent être terminés (commande `kill_process`). L'IP
publique est résolue en lazy via `get_public_ip` (PowerShell + ipify).

Le service **`services/app_settings.rs`** persiste les préférences globales
(langue, thème, ordre de la sidebar) sous la clé store `app.settings`. Le
setter accepte un `AppSettingsPatch` avec champs optionnels et merge dans
l'état courant — `I18nProvider`, `App` (thème) et `Sidebar` (ordre)
hydratent indépendamment au boot et persistent leurs changements sans se
marcher dessus.

La **sidebar** (`layout/Sidebar.tsx`) est unifiée : un seul flot
drag-to-reorder via `@dnd-kit/sortable`, pas de séparateur. L'ordre est
stocké dans `app.settings.sidebar_order` ; les ids inconnus au chargement
sont ignorés et les canoniques manquants append en fin de liste (résilient
aux ajouts d'outils futurs). Le menu chevron du Camera est rendu via
`createPortal` à `document.body` pour échapper à l'`overflow-x: hidden`
de la sidebar.

Le **menu tray** (`services/tray.rs`) est construit au boot dans la langue
persistée et expose un sous-menu Capture (Normale / Différée / OCR) qui
émet `tray://capture-*` vers la fenêtre `main`.

L'**ajout d'un clip à une note** se fait via le menu contextuel des items
clipboard (texte / lien / image). Modal `NotePickerModal` (overlay centré
style Settings) avec recherche + récentes + "+ Nouvelle note". Multi-
sélection : tous les items du même type sont append en un seul update via
`appendToNoteBody` (pure, format-aware : TipTap JSON ou Markdown). Les
images du presse-papier sont réutilisées côté backend par
`clip_image_to_note_asset(hash)` (déduplication par hash dans
`save_note_asset`).

Les **images dans les notes** sont redimensionnables via l'extension
TipTap custom `ResizableImage` (override du node `image`, attribut `width`
persisté + NodeView avec poignée bottom-right style Notion). Le scope
`assetProtocol` de `tauri.conf.json` couvre `$APPDATA/notes_assets/**`.

Le **watcher du presse-papier** (`tools/clipboard/watcher.rs` +
`win_files.rs`, Windows-only) capture les images depuis trois sources, par
ordre de priorité : (1) CF_DIB / CF_DIBV5 via `arboard::get_image()`,
(2) formats custom encodés (`PNG`, `image/png`, `image/jpeg`, `JFIF`,
`image/gif`, `GIF`, `image/webp`, `image/bmp`, `image/tiff`) lus via
`RegisterClipboardFormatW` + `GlobalLock`, (3) CF_HDROP (Ctrl+C sur
fichier image dans l'Explorateur). Les bytes encodés sont décodés via
`image::load_from_memory` (auto-détection par magic bytes).

## État du repo

- Code source local : `C:\Users\lambe\TyroLabs`
- Repo public GitHub : https://github.com/Tyyyros/tyrolabs

## Règle de synchro (instruction utilisateur)

Toute évolution significative de l'app (nouvel outil, nouveau module,
changement de structure, changement de stack, décision d'archi) doit être
reflétée **simultanément** dans :

1. Le README de `Tyyyros/tyrolabs` sur GitHub
2. `AGENTS.md`
3. Ce fichier `CLAUDE.md`

Pas de cosmétique (typo, virgule) — uniquement les changements porteurs de
sens.
