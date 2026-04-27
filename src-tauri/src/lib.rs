#[tauri::command]
fn set_always_on_top(window: tauri::Window, value: bool) {
    let _ = window.set_always_on_top(value);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_always_on_top])
        .run(tauri::generate_context!())
        .expect("erreur lors du lancement de Tauri");
}
