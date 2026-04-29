# TyroLabs Toolbox

> **Desktop clipboard manager** — Application de bureau légère et rapide construite avec Tauri v2, React 19 et Rust.

---

## ✨ Fonctionnalités

- 📋 **Historique clipboard** — Capture automatique de tout ce que vous copiez
- 📝 **Onglet Texte** — Historique et gestion des textes copiés
- 🔗 **Onglet Liens** — Détection et organisation automatique des URLs
- 🖼️ **Onglet Images** — Historique des images copiées
- ⭐ **Favoris** — Épinglez vos éléments les plus utilisés
- 🗂️ **Collections** — Groupez vos éléments via Drag & Drop avec persistance garantie
- 🎨 **Thèmes** — Personnalisation visuelle de l'interface
- 🪟 **Overlay system** — Accès rapide via overlay flottant

---

## 🏗️ Stack technique

| Couche | Technologie |
|---|---|
| **Framework desktop** | [Tauri v2](https://tauri.app) |
| **Backend** | Rust |
| **Frontend** | React 19 + TypeScript |
| **Build tool** | Vite 7 |
| **Styles** | Tailwind CSS v3 |
| **Icônes** | Lucide React |

---

## 🚀 Installation & Lancement

### Étape 1 — Installer les prérequis

#### Node.js (>= 18)
Télécharge la version LTS sur [nodejs.org](https://nodejs.org/)

#### Rust
```bash
# Windows / macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
Redémarre ton terminal après l'installation.

#### Windows uniquement
- **Microsoft C++ Build Tools** — requis pour compiler Rust : [Télécharger ici](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  - Lors de l'installation, coche **"Desktop development with C++"**
- **WebView2** — déjà présent sur Windows 10/11, sinon [Télécharger ici](https://developer.microsoft.com/microsoft-edge/webview2/)

#### Tauri CLI
```bash
npm install -g @tauri-apps/cli
```

---

### Étape 2 — Cloner le repo

```bash
git clone https://github.com/Tyyyros/tyrolabs.git
cd tyrolabs
npm install
```

---

### Étape 3 — Lancer en développement

```bash
npm run tauri dev
```

> ⚠️ **La première compilation Rust peut prendre 3 à 5 minutes** — Cargo télécharge et compile toutes les dépendances. Les lancements suivants seront quasi-instantanés grâce au cache.

L'application s'ouvre automatiquement. Le frontend Vite tourne sur `http://localhost:1420` avec hot-reload activé.

---

### Étape 4 — Build de production (optionnel)

```bash
npm run tauri build
```

Le binaire compilé sera dans :
- **Windows** → `src-tauri/target/release/bundle/msi/` ou `nsis/`
- **macOS** → `src-tauri/target/release/bundle/dmg/`
- **Linux** → `src-tauri/target/release/bundle/appimage/`

---

## ⚙️ Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Lance Vite en mode dev (frontend seul, sans Tauri) |
| `npm run build` | Build TypeScript + Vite |
| `npm run tauri dev` | Lance l'app Tauri complète en développement |
| `npm run tauri build` | Compile l'app desktop pour la production |

---

## 📁 Structure du projet

```
tyrolabs/
├── src/                        # Frontend React/TypeScript
│   ├── App.tsx                 # Composant racine
│   ├── main.tsx                # Entry point React
│   ├── themes.ts               # Système de thèmes
│   ├── types.ts                # Types TypeScript
│   ├── index.css               # Styles globaux (Tailwind)
│   ├── components/
│   │   ├── tabs/               # Onglets principaux
│   │   │   ├── TextTab.tsx
│   │   │   ├── LinksTab.tsx
│   │   │   ├── ImagesTab.tsx
│   │   │   └── FavsTab.tsx
│   │   ├── layout/
│   │   ├── overlays/
│   │   └── ui/
│   ├── data/
│   └── lib/
├── src-tauri/                  # Backend Rust (Tauri)
│   ├── src/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 👤 Auteur

**Tyyyros** — [github.com/Tyyyros](https://github.com/Tyyyros)
