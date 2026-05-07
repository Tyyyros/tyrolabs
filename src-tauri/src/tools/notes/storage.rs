//! Persistance Notes : entrées et collections sous des clés namespacées
//! `notes.entries` et `notes.collections` dans le fichier de store partagé.

use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::models::{Collection, Note};
use crate::services::store::STORE_FILE;

const NOTES_KEY: &str = "notes.entries";
const COLLECTIONS_KEY: &str = "notes.collections";

pub fn load_notes(app: &AppHandle) -> Vec<Note> {
    let Ok(store) = app.store(STORE_FILE) else {
        return vec![];
    };
    store
        .get(NOTES_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub fn save_notes(app: &AppHandle, notes: &Vec<Note>) {
    if let Ok(store) = app.store(STORE_FILE) {
        let _ = store.set(NOTES_KEY, serde_json::to_value(notes).unwrap_or_default());
        let _ = store.save();
    }
}

pub fn load_note_collections(app: &AppHandle) -> Vec<Collection> {
    let Ok(store) = app.store(STORE_FILE) else {
        return vec![];
    };
    store
        .get(COLLECTIONS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub fn save_note_collections(app: &AppHandle, collections: &Vec<Collection>) {
    if let Ok(store) = app.store(STORE_FILE) {
        let _ = store.set(
            COLLECTIONS_KEY,
            serde_json::to_value(collections).unwrap_or_default(),
        );
        let _ = store.save();
    }
}
