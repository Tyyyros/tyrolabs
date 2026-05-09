//! Préférences d'application transverses (langue, thème, etc.).
//!
//! Persistées dans le store partagé sous la clé `app.settings`. Lues au boot
//! par le frontend pour hydrater la langue active (I18nProvider) et le thème
//! actif (App).
//!
//! Le setter accepte un *patch partiel* : seuls les champs fournis sont
//! écrasés, les autres conservent leur valeur actuelle. Indispensable pour
//! que I18nProvider et App puissent persister leur préférence respective
//! sans se marcher dessus.

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::error::{ToolError, ToolResult};
use crate::services::store::STORE_FILE;

const KEY: &str = "app.settings";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppSettings {
    pub language: String,
    pub theme: String,
    /// Ordre custom des items de la sidebar (par id). `None` ⇒ ordre canonique.
    /// Les ids inconnus côté frontend sont ignorés au chargement, et les
    /// canoniques absents sont append à la fin (résilient aux ajouts futurs).
    #[serde(default)]
    pub sidebar_order: Option<Vec<String>>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            language: "fr".into(),
            theme: "command".into(),
            sidebar_order: None,
        }
    }
}

#[derive(Deserialize, Default)]
pub struct AppSettingsPatch {
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub theme: Option<String>,
    #[serde(default)]
    pub sidebar_order: Option<Vec<String>>,
}

fn load(app: &AppHandle) -> ToolResult<AppSettings> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| ToolError::Message(format!("store: {e}")))?;
    Ok(store
        .get(KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default())
}

#[tauri::command]
pub fn get_app_settings(app: AppHandle) -> ToolResult<AppSettings> {
    load(&app)
}

#[tauri::command]
pub fn set_app_settings(app: AppHandle, settings: AppSettingsPatch) -> ToolResult<()> {
    let mut current = load(&app)?;
    if let Some(language) = settings.language {
        current.language = language;
    }
    if let Some(theme) = settings.theme {
        current.theme = theme;
    }
    if let Some(sidebar_order) = settings.sidebar_order {
        current.sidebar_order = Some(sidebar_order);
    }
    let store = app
        .store(STORE_FILE)
        .map_err(|e| ToolError::Message(format!("store: {e}")))?;
    store.set(KEY, serde_json::to_value(&current)?);
    store
        .save()
        .map_err(|e| ToolError::Message(format!("store save: {e}")))?;
    Ok(())
}
