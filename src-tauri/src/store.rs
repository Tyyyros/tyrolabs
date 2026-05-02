use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

use crate::models::{Clip, Collection};

pub const STORE_FILE: &str = "clipboard_history.json";
pub const HISTORY_KEY: &str = "history";
pub const MAX_HISTORY: usize = 200;

pub fn load_history(app: &AppHandle) -> Vec<Clip> {
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
/// Returns a list of hashes for images that were removed.
pub fn truncate_history(history: &mut Vec<Clip>) -> Vec<String> {
    let mut removed_hashes = Vec::new();

    // Partition in-place: grouped items move to the end, ungrouped to the beginning
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
    // Re-insert grouped items
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

pub const COLLECTIONS_KEY: &str = "groups";

pub fn load_collections(app: &AppHandle) -> Vec<Collection> {
    let store = match app.store(STORE_FILE) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    store
        .get(COLLECTIONS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub fn save_collections(app: &AppHandle, collections: &Vec<Collection>) {
    if let Ok(store) = app.store(STORE_FILE) {
        let _ = store.set(
            COLLECTIONS_KEY,
            serde_json::to_value(collections).unwrap_or_default(),
        );
        let _ = store.save();
    }
}
