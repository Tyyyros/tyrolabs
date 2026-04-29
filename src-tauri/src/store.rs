use tauri::AppHandle;
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
        let _ = store.set(HISTORY_KEY, serde_json::to_value(history).unwrap_or_default());
        let _ = store.save();
    }
}

/// Truncate history while preserving grouped (permanent) items.
pub fn truncate_history(history: &mut Vec<Clip>) {
    let grouped: Vec<Clip> = history.iter().filter(|c| c.collection_id.is_some()).cloned().collect();
    let mut ungrouped: Vec<Clip> = history.iter().filter(|c| c.collection_id.is_none()).cloned().collect();
    ungrouped.truncate(MAX_HISTORY);
    *history = ungrouped;
    // Re-insert grouped items at their original positions or at front
    for g in grouped {
        if !history.iter().any(|c| c.id == g.id) {
            history.push(g);
        }
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
        let _ = store.set(COLLECTIONS_KEY, serde_json::to_value(collections).unwrap_or_default());
        let _ = store.save();
    }
}
