#[tauri::command]
fn set_always_on_top(window: tauri::WebviewWindow, value: bool) -> Result<(), String> {
    window.set_always_on_top(value).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_always_on_top])
        .run(tauri::generate_context!())
        .expect("erreur lors du lancement de Tauri");
}
