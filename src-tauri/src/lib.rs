mod error;
mod models;
mod services;
mod tools;

use std::sync::{Arc, Mutex};
use tauri::{Manager, PhysicalPosition, WindowEvent};
use tauri_plugin_autostart::ManagerExt;

use crate::services::system;
use crate::services::tray;
use crate::tools::capture::{self, CaptureState};
use crate::tools::clipboard::storage::{load_collections, load_history, CollectionSilo};
use crate::tools::clipboard::{self, ClipboardState, SuppressState};

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
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(SuppressState(Arc::clone(&suppress)))
        .invoke_handler(tauri::generate_handler![
            // services/system : primitives OS partagées
            system::is_production_build,
            system::set_always_on_top,
            system::open_file_or_url,
            system::open_in_paint,
            system::get_system_info,
            // tools/clipboard
            clipboard::get_history,
            clipboard::toggle_pinned,
            clipboard::delete_clip,
            clipboard::delete_clips,
            clipboard::update_clip,
            clipboard::suppress_next,
            clipboard::reorder_clip,
            clipboard::add_manual_clip,
            clipboard::get_image_path,
            clipboard::copy_image_to_clipboard,
            clipboard::get_collections,
            clipboard::create_collection,
            clipboard::update_collection,
            clipboard::delete_collection,
            clipboard::set_clip_collection,
            clipboard::set_clips_collection,
            clipboard::ungroup_clip,
            clipboard::reorder_clips_in_collection,
            // tools/capture
            capture::prepare_capture,
            capture::get_capture_data,
            capture::cancel_capture,
            capture::save_capture_area,
        ])
        .setup(move |app| {
            // Load initial data into memory
            let history = load_history(app.handle());
            let text_collections = load_collections(app.handle(), CollectionSilo::Text);
            let image_collections = load_collections(app.handle(), CollectionSilo::Image);
            let link_collections = load_collections(app.handle(), CollectionSilo::Link);
            app.manage(ClipboardState {
                clips: Mutex::new(history),
                text_collections: Mutex::new(text_collections),
                image_collections: Mutex::new(image_collections),
                link_collections: Mutex::new(link_collections),
            });
            app.manage(CaptureState::default());

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

                // Désactive les animations DWM (minimize/restore/maximize) sur la
                // fenêtre principale → minimize avant capture est instantané.
                #[cfg(windows)]
                unsafe {
                    use windows::core::BOOL;
                    use windows::Win32::Foundation::HWND;
                    use windows::Win32::Graphics::Dwm::{
                        DwmSetWindowAttribute, DWMWA_TRANSITIONS_FORCEDISABLED,
                    };
                    if let Ok(tauri_hwnd) = window.hwnd() {
                        // Tauri tire windows 0.61 ; on linke 0.62 → conversion par le pointeur sous-jacent.
                        let hwnd = HWND(tauri_hwnd.0 as _);
                        let disable = BOOL::from(true);
                        let _ = DwmSetWindowAttribute(
                            hwnd,
                            DWMWA_TRANSITIONS_FORCEDISABLED,
                            &disable as *const _ as *const std::ffi::c_void,
                            std::mem::size_of::<BOOL>() as u32,
                        );
                    }
                }

                if !silent_autostart {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            // ── Pré-spawn de l'overlay de capture (caché) ──
            // À chaque déclenchement on ne fait que repositionner + show().
            // Évite le coût de création de webview à chaque capture (~100-150 ms).
            let _ = tauri::WebviewWindowBuilder::new(
                app,
                "capture",
                tauri::WebviewUrl::App("/capture".into()),
            )
            .inner_size(800.0, 600.0)
            .position(0.0, 0.0)
            .transparent(true)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .visible(false)
            .build()?;

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. }
                if window.label() == "main" || window.label() == "capture" =>
            {
                let _ = window.hide();
                api.prevent_close();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("erreur lors du lancement de Tauri");
}
