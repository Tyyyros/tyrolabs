//! Persistance partagée entre outils via `tauri-plugin-store`.
//!
//! Convention de nommage des clés : `<tool_id>.<key>` (ex. `clipboard.history`,
//! futur `notes.entries`, etc.) afin que les outils cohabitent dans le même
//! fichier sans collision.

use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

/// Fichier de persistance partagé par tous les outils.
/// Conservé sous ce nom pour compatibilité avec les installations existantes.
pub const STORE_FILE: &str = "clipboard_history.json";

/// Migre une clé legacy vers une clé namespacée si nécessaire.
/// Idempotent : ne fait rien si la clé namespacée existe déjà.
pub fn migrate_key(app: &AppHandle, legacy: &str, current: &str) {
    let Ok(store) = app.store(STORE_FILE) else {
        return;
    };
    if store.get(current).is_some() {
        return;
    }
    if let Some(value) = store.get(legacy) {
        let _ = store.set(current, value);
        store.delete(legacy);
        let _ = store.save();
    }
}
