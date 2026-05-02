mod capture;
mod clipboard;
mod commands;
mod models;
mod state;
mod store;
mod tray;

use crate::store::{load_collections, load_history};
use state::{AppState, SuppressState};
use std::sync::{Arc, Mutex};
use tauri::{Manager, PhysicalPosition, WindowEvent};
use tauri_plugin_autostart::ManagerExt;

const AUTOSTART_ARG: &str = "--autostart";

fn launched_from_autostart() -> bool {
    std::env::args().any(|arg| arg == AUTOSTART_ARG)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let last_text = Arc::new(Mutex::new(String::new()));
    let suppress = Arc::new(Mutex::new(None::<String>));
    let silent_autostart = launched_from_autostart();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .arg(AUTOSTART_ARG)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(SuppressState(Arc::clone(&suppress)))
        .invoke_handler(tauri::generate_handler![
            commands::is_production_build,
            commands::set_always_on_top,
            commands::get_history,
            commands::clear_history,
            commands::toggle_pinned,
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
            commands::reorder_clips_in_collection,
            commands::delete_clips,
            commands::set_clips_collection,
            commands::get_capture_context,
            commands::save_capture_area,
            commands::open_capture_overlay,
            commands::add_manual_clip,
            commands::get_system_info
        ])
        .setup(move |app| {
            // Load initial data into memory
            let history = load_history(app.handle());
            let collections = load_collections(app.handle());
            app.manage(AppState {
                clips: Mutex::new(history),
                collections: Mutex::new(collections),
            });

            let app_handle = app.handle().clone();
            let last = Arc::clone(&last_text);
            let sup = Arc::clone(&suppress);
            clipboard::start_clipboard_watcher(app_handle, last, sup);
            tray::setup_tray(app)?;

            if !cfg!(debug_assertions) {
                let autolaunch = app.autolaunch();
                if autolaunch.is_enabled().unwrap_or(false) {
                    let _ = autolaunch.disable();
                    let _ = autolaunch.enable();
                }
            }

            // ── Position the window bottom-right with a margin ──
            if let Some(window) = app.get_webview_window("main") {
                let margin = 20i32;
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let monitor_pos = monitor.position();
                    let monitor_size = monitor.size();
                    let scale = monitor.scale_factor();
                    let win_w = (800.0 * scale) as i32;
                    let win_h = (500.0 * scale) as i32;
                    let x = monitor_pos.x + monitor_size.width as i32
                        - win_w
                        - (margin as f64 * scale) as i32;
                    let y = monitor_pos.y + monitor_size.height as i32
                        - win_h
                        - (margin as f64 * scale) as i32
                        - 48; // 48px for taskbar
                    let _ = window.set_position(PhysicalPosition::new(x, y));
                }
                if !silent_autostart {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                let _ = window.hide();
                api.prevent_close();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("erreur lors du lancement de Tauri");
}
