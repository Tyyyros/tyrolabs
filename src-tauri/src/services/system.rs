//! Commandes système transverses (info OS, ouverture de fichiers, fenêtre).
//! Réutilisables par tous les outils.

use serde::Serialize;
use sysinfo::System;

use crate::error::{ToolError, ToolResult};

#[tauri::command]
pub fn is_production_build() -> bool {
    !cfg!(debug_assertions)
}

#[tauri::command]
pub fn set_always_on_top(window: tauri::WebviewWindow, value: bool) -> ToolResult<()> {
    window
        .set_always_on_top(value)
        .map_err(|e| ToolError::Message(e.to_string()))
}

#[tauri::command]
pub fn open_file_or_url(path: String) -> ToolResult<()> {
    if path.contains("&&") || path.contains('|') || path.contains(';') || path.contains('`') {
        return Err(ToolError::InvalidInput("chemin invalide".into()));
    }
    std::process::Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_in_paint(path: String) -> ToolResult<()> {
    if !path.ends_with(".png") && !path.ends_with(".jpg") && !path.ends_with(".bmp") {
        return Err(ToolError::InvalidInput(
            "format d'image non supporté".into(),
        ));
    }
    std::process::Command::new("mspaint")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
pub struct SysInfoResult {
    pub cpu: String,
    pub mem_total: String,
    pub os_version: String,
    pub host: String,
}

#[tauri::command]
pub fn get_system_info() -> SysInfoResult {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".into());
    let cpu_cores = sys.cpus().len();
    let cpu_freq = sys.cpus().first().map(|c| c.frequency()).unwrap_or(0);

    let mem_gb = sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0;

    SysInfoResult {
        cpu: format!("{} ({} cores, {} MHz)", cpu_brand, cpu_cores, cpu_freq),
        mem_total: format!("{:.1} GB", mem_gb),
        os_version: System::long_os_version().unwrap_or_else(|| "Unknown OS".into()),
        host: System::host_name().unwrap_or_else(|| "Unknown Host".into()),
    }
}
