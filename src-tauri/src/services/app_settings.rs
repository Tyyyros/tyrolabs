//! Préférences d'application transverses (langue, etc.).
//!
//! Persistées dans le store partagé sous la clé `app.settings`. Lues au boot
//! par le frontend (I18nProvider) pour hydrater la langue active.

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::error::{ToolError, ToolResult};
use crate::services::store::STORE_FILE;

const KEY: &str = "app.settings";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppSettings {
    pub language: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            language: "fr".into(),
        }
    }
}

#[tauri::command]
pub fn get_app_settings(app: AppHandle) -> ToolResult<AppSettings> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| ToolError::Message(format!("store: {e}")))?;
    Ok(store
        .get(KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default())
}

#[tauri::command]
pub fn set_app_settings(app: AppHandle, settings: AppSettings) -> ToolResult<()> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| ToolError::Message(format!("store: {e}")))?;
    store.set(KEY, serde_json::to_value(&settings)?);
    store
        .save()
        .map_err(|e| ToolError::Message(format!("store save: {e}")))?;
    Ok(())
}
