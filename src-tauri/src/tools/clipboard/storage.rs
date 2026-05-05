//! Persistance et opérations sur la liste des clips et des collections.
//!
//! Les collections sont stockées dans **trois clés distinctes** (silos) :
//! - `clipboard.collections.text`
//! - `clipboard.collections.image`
//! - `clipboard.collections.link`
//!
//! Une migration automatique partitionne l'ancienne clé unifiée
//! `clipboard.collections` (qui portait un champ `origin_tab` par entrée) vers
//! les trois silos au premier load post-pivot.

use serde::Deserialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

use crate::models::{Clip, Collection};
use crate::services::store::{migrate_key, STORE_FILE};

pub const MAX_HISTORY: usize = 200;

const HISTORY_KEY: &str = "clipboard.history";

// Anciennes clés (avant namespacing) — migrées au premier load.
const LEGACY_HISTORY_KEY: &str = "history";
const LEGACY_COLLECTIONS_UNIFIED_KEY: &str = "clipboard.collections";
const LEGACY_COLLECTIONS_GROUPS_KEY: &str = "groups";

/// Identifie un silo de collections.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CollectionSilo {
    Text,
    Image,
    Link,
}

impl CollectionSilo {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "text" => Some(Self::Text),
            "image" | "images" => Some(Self::Image),
            "link" | "links" => Some(Self::Link),
            _ => None,
        }
    }

    pub fn store_key(self) -> &'static str {
        match self {
            Self::Text => "clipboard.collections.text",
            Self::Image => "clipboard.collections.image",
            Self::Link => "clipboard.collections.link",
        }
    }
}

// ── History ──────────────────────────────────────────────────────────

pub fn load_history(app: &AppHandle) -> Vec<Clip> {
    migrate_key(app, LEGACY_HISTORY_KEY, HISTORY_KEY);
    let store = match app.store(STORE_FILE) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    store
        .get(HISTORY_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub fn save_history(app: &AppHandle, history: &Vec<Clip>) {
    if let Ok(store) = app.store(STORE_FILE) {
        let _ = store.set(
            HISTORY_KEY,
            serde_json::to_value(history).unwrap_or_default(),
        );
        let _ = store.save();
    }
}

/// Truncate history while preserving grouped (permanent) items.
/// Returns the list of hashes for images that were removed.
pub fn truncate_history(history: &mut Vec<Clip>) -> Vec<String> {
    let mut removed_hashes = Vec::new();

    let (mut ungrouped, grouped): (Vec<_>, Vec<_>) = std::mem::take(history)
        .into_iter()
        .partition(|c| c.collection_id.is_none());

    if ungrouped.len() > MAX_HISTORY {
        let removed = ungrouped.split_off(MAX_HISTORY);
        for r in removed {
            if let Some(h) = r.hash {
                removed_hashes.push(h);
            }
        }
    }

    *history = ungrouped;
    for g in grouped {
        if !history.iter().any(|c| c.id == g.id) {
            history.push(g);
        }
    }

    removed_hashes
}

pub fn delete_image_file(app: &AppHandle, hash: &str) {
    if let Ok(app_data) = app.path().app_data_dir() {
        let file_path = app_data.join("images").join(format!("{}.png", hash));
        let _ = std::fs::remove_file(file_path);
    }
}

// ── Collections (silo-bound) ─────────────────────────────────────────

/// Migre l'ancienne liste unifiée `clipboard.collections` (entrées avec
/// `origin_tab`) vers les trois clés silos. Idempotent — ne fait rien si la
/// clé legacy n'existe plus, ou si les clés silos ont déjà été peuplées.
///
/// Chaîne complète (anciens vers nouveaux) :
/// `groups` → `clipboard.collections` (déjà géré par `migrate_key`) →
/// `clipboard.collections.{text,image,link}` (cette fonction).
fn migrate_unified_collections(app: &AppHandle) {
    // Étape 1 : promouvoir l'ancienne clé `groups` vers la clé unifiée si besoin.
    migrate_key(
        app,
        LEGACY_COLLECTIONS_GROUPS_KEY,
        LEGACY_COLLECTIONS_UNIFIED_KEY,
    );

    let Ok(store) = app.store(STORE_FILE) else {
        return;
    };

    // Si déjà migré (au moins un silo populé), on ne touche pas.
    let has_silo_data = [
        CollectionSilo::Text,
        CollectionSilo::Image,
        CollectionSilo::Link,
    ]
    .iter()
    .any(|silo| store.get(silo.store_key()).is_some());

    if has_silo_data {
        // On peut quand même nettoyer la clé unifiée si elle traîne encore.
        if store.get(LEGACY_COLLECTIONS_UNIFIED_KEY).is_some() {
            store.delete(LEGACY_COLLECTIONS_UNIFIED_KEY);
            let _ = store.save();
        }
        return;
    }

    let Some(value) = store.get(LEGACY_COLLECTIONS_UNIFIED_KEY) else {
        return;
    };

    /// Schéma minimal pour relire l'ancienne forme avec le champ `origin_tab`.
    #[derive(Deserialize)]
    struct UnifiedCollection {
        id: String,
        name: String,
        icon: String,
        color: String,
        #[serde(default)]
        origin_tab: String,
    }

    let Ok(items) = serde_json::from_value::<Vec<UnifiedCollection>>(value) else {
        return;
    };

    let (mut text, mut image, mut link) = (Vec::new(), Vec::new(), Vec::new());
    for item in items {
        let collection = Collection {
            id: item.id,
            name: item.name,
            icon: item.icon,
            color: item.color,
        };
        match item.origin_tab.as_str() {
            "image" | "images" => image.push(collection),
            "link" | "links" => link.push(collection),
            _ => text.push(collection), // par défaut → texte
        }
    }

    let _ = store.set(
        CollectionSilo::Text.store_key(),
        serde_json::to_value(&text).unwrap_or_default(),
    );
    let _ = store.set(
        CollectionSilo::Image.store_key(),
        serde_json::to_value(&image).unwrap_or_default(),
    );
    let _ = store.set(
        CollectionSilo::Link.store_key(),
        serde_json::to_value(&link).unwrap_or_default(),
    );
    store.delete(LEGACY_COLLECTIONS_UNIFIED_KEY);
    let _ = store.save();
}

pub fn load_collections(app: &AppHandle, silo: CollectionSilo) -> Vec<Collection> {
    migrate_unified_collections(app);
    let Ok(store) = app.store(STORE_FILE) else {
        return vec![];
    };
    store
        .get(silo.store_key())
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub fn save_collections(app: &AppHandle, silo: CollectionSilo, collections: &Vec<Collection>) {
    if let Ok(store) = app.store(STORE_FILE) {
        let _ = store.set(
            silo.store_key(),
            serde_json::to_value(collections).unwrap_or_default(),
        );
        let _ = store.save();
    }
}
