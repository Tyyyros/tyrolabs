mod clipboard;
mod commands;
mod models;
mod state;
mod store;
mod tray;

use std::sync::{Arc, Mutex};
use state::SuppressState;
use tauri::WindowEvent;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let last_text = Arc::new(Mutex::new(String::new()));
    let suppress = Arc::new(Mutex::new(None::<String>));

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(SuppressState(Arc::clone(&suppress)))
        .invoke_handler(tauri::generate_handler![
            commands::set_always_on_top,
            commands::get_history,
            commands::clear_history,
            commands::toggle_fav,
            commands::delete_clip,
            commands::update_clip,
            commands::suppress_next,
            commands::reorder_clip,
            commands::open_file_or_url,
            commands::open_in_paint,
            commands::get_image_path,
            commands::copy_image_to_clipboard,
            commands::start_screen_capture,
            commands::get_collections,
            commands::create_collection,
            commands::update_collection,
            commands::delete_collection,
            commands::set_clip_collection,
            commands::ungroup_clip,
            commands::reorder_clips_in_collection
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let last = Arc::clone(&last_text);
            let sup = Arc::clone(&suppress);
            clipboard::start_clipboard_watcher(app_handle, last, sup);
            tray::setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("erreur lors du lancement de Tauri");
}
