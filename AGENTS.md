# TyroLabs_V2 — contexte projet

Toolbox Windows modulaire et responsive. Chaque "outil" est une unité autonome qui vit côté backend Rust **et** côté frontend React, branchée par un registre unique de chaque côté.

## Stack

- **Tauri v2** (backend Rust, fenêtre native Windows)
- **React + TypeScript** (frontend)
- **Tailwind CSS** (styling)
- **lucide-react** (icônes)
- **Vite** (build)

## Structure de dossiers

```
TyroLabs_V2/
├── src/                          # Frontend React
│   ├── App.tsx                   # sélection d'outil + routing minimal
│   ├── components/
│   │   ├── layout/               # Layout, TitleBar, Sidebar
│   │   ├── ui/                   # Card, Button, etc. (réutilisables)
│   │   └── tools/<nom>/          # 1 dossier par outil
│   ├── lib/
│   │   ├── tools.ts              # ⭐ registre frontend des outils
│   │   └── invoke.ts             # wrapper typé autour de tauri::invoke
│   └── types/
│
└── src-tauri/                    # Backend Rust
    ├── tauri.conf.json           # decorations: false → barre de titre custom
    ├── capabilities/default.json # ACL Tauri v2 (window controls + drag)
    └── src/
        ├── main.rs               # 4 lignes → appelle lib::run()
        ├── lib.rs                # ⭐ Builder + liste invoke_handler!
        ├── error.rs              # ToolError + impl Serialize
        ├── state.rs              # AppState (champs Mutex)
        └── tools/
            ├── mod.rs            # pub mod <nom>;
            └── <nom>/
                ├── mod.rs        # entrées #[tauri::command]
                └── *.rs          # logique pure, testable cargo test
```

## Convention : ajouter un outil

Pas de dispatcher central qui grossit. Pour un nouvel outil `<nom>` :

1. **Backend** — créer `src-tauri/src/tools/<nom>/mod.rs` avec `#[tauri::command] pub async fn ...` (et la logique pure dans des sous-fichiers).
2. Déclarer dans `src-tauri/src/tools/mod.rs` : `pub mod <nom>;`.
3. Ajouter chaque commande dans le `tauri::generate_handler![...]` de `src-tauri/src/lib.rs`.
4. **Frontend** — créer `src/components/tools/<nom>/<Nom>Tool.tsx`.
5. Enregistrer dans `src/lib/tools.ts` (id, label, icône Lucide, composant).

## Règles transverses

- **Erreurs** : tout chemin renvoie `Result<T, ToolError>`. Ajouter une variante dans `error.rs` plutôt qu'un nouveau type d'erreur ad hoc.
- **État partagé** : champs dans `AppState` (`Mutex` pour court, `tokio::sync::RwLock` pour long-running concurrent).
- **Logique pure** : dans des fichiers séparés des commandes Tauri pour pouvoir la tester sans booter Tauri.
- **Aucun `unwrap()`** sur les entrées utilisateur ; `expect("...")` réservé aux invariants internes (mutex empoisonné, etc.).

## Conventions UI

- Barre de titre custom (`decorations: false`).
- Zone draggable via `data-tauri-drag-region` sur le fond de la barre.
- Contrôles fenêtre via `getCurrentWindow().{minimize, toggleMaximize, close}()` (depuis `@tauri-apps/api/window`).
- Thème sombre par défaut : `bg-zinc-950`, `text-zinc-100`, accents `indigo-600`.
- Chaque outil rend dans une `<Card>` dans le panneau principal.

## Outils

| Outil | Statut    | Module backend                        | Composant frontend                                  |
|-------|-----------|---------------------------------------|----------------------------------------------------|
| hash  | 🚧 prévu | `src-tauri/src/tools/hash/`           | `src/components/tools/hash/HashTool.tsx`           |

## État du repo

- Code source local : `C:\Users\lambe\TyroLabs_V2`
- Repo public GitHub : https://github.com/Tyyyros/tyrolabs
- **État actuel** : L'application a évolué en un gestionnaire de presse-papier avancé (Clipboard Manager) avec un backend modulaire (`models`, `store`, `clipboard`, `commands`, `tray`). L'interface a été enrichie d'onglets (Text, Links, Images, Favs) et d'un système de **Collections** (anciennement Groupes) avec support du Drag-and-Drop (`@dnd-kit/core`).
- La capture d'écran est intégrée et les images sont servies localement via le protocole `asset://` de Tauri pour des performances optimales.

## Règle de synchro (instruction utilisateur)

Toute évolution significative de l'app (nouvel outil, nouveau module, changement de structure, changement de stack, décision d'archi) doit être reflétée **simultanément** dans :

1. Le README de `Tyyyros/tyrolabs` sur GitHub
2. Ce fichier `AGENTS.md`

Pas de cosmétique (typo, virgule) — uniquement les changements porteurs de sens.
