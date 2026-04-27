# TyroLabs Toolbox

> **Desktop clipboard manager** — Application de bureau légère et rapide construite avec Tauri v2, React 19 et Rust.

---

## ✨ Fonctionnalités

- 📋 **Historique clipboard** — Capture automatique de tout ce que vous copiez
- 📝 **Onglet Texte** — Historique et gestion des textes copiés
- 🔗 **Onglet Liens** — Détection et organisation automatique des URLs
- 🖼️ **Onglet Images** — Historique des images copiées
- ⭐ **Favoris** — Épinglez vos éléments les plus utilisés
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

## 🚀 Installation & Développement

### Prérequis

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) (dernière version stable)
- [Tauri CLI v2](https://tauri.app/start/prerequisites/)

### Lancer en développement

```bash
npm install
npm run tauri dev
```

### Build de production

```bash
npm run tauri build
```

Le binaire compilé se trouvera dans `src-tauri/target/release/`.

---

## ⚙️ Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Lance Vite en mode dev (frontend seul) |
| `npm run build` | Build TypeScript + Vite |
| `npm run tauri dev` | Lance l'app Tauri complète en développement |
| `npm run tauri build` | Compile l'app desktop pour la production |

---

## 👤 Auteur

**Tyyyros** — [github.com/Tyyyros](https://github.com/Tyyyros)
