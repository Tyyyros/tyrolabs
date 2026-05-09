use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_store::StoreExt;

use crate::services::store::STORE_FILE;

const SETTINGS_KEY: &str = "app.settings";

/// Lit la langue persistée pour étiqueter le menu tray dans la langue courante
/// (fallback FR). Le menu tray étant construit une seule fois au boot, il
/// reflète la langue active au démarrage : changer la langue à chaud
/// nécessite un redémarrage pour mettre les libellés à jour.
fn read_language(app: &tauri::App) -> String {
    let Ok(store) = app.store(STORE_FILE) else {
        return "fr".to_string();
    };
    store
        .get(SETTINGS_KEY)
        .and_then(|v| v.get("language").and_then(|l| l.as_str()).map(String::from))
        .unwrap_or_else(|| "fr".to_string())
}

struct Labels {
    open: &'static str,
    capture: &'static str,
    capture_normal: &'static str,
    capture_delayed: &'static str,
    capture_ocr: &'static str,
    settings: &'static str,
    quit: &'static str,
    tooltip: &'static str,
}

fn labels(lang: &str) -> Labels {
    if lang == "en" {
        Labels {
            open: "Open TyroLabs",
            capture: "Capture",
            capture_normal: "Normal capture",
            capture_delayed: "Delayed capture (5s)",
            capture_ocr: "OCR capture",
            settings: "Settings",
            quit: "Quit",
            tooltip: "TyroLabs V2",
        }
    } else {
        Labels {
            open: "Ouvrir TyroLabs",
            capture: "Capture",
            capture_normal: "Capture normale",
            capture_delayed: "Capture différée (5s)",
            capture_ocr: "Capture OCR",
            settings: "Paramètres",
            quit: "Quitter",
            tooltip: "TyroLabs V2",
        }
    }
}

pub fn setup_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let l = labels(&read_language(app));

    let open_i = MenuItem::with_id(app, "open", l.open, true, None::<&str>)?;

    let capture_normal_i = MenuItem::with_id(
        app,
        "capture-normal",
        l.capture_normal,
        true,
        Some("Alt+C"),
    )?;
    let capture_delayed_i = MenuItem::with_id(
        app,
        "capture-delayed",
        l.capture_delayed,
        true,
        None::<&str>,
    )?;
    let capture_ocr_i =
        MenuItem::with_id(app, "capture-ocr", l.capture_ocr, true, None::<&str>)?;
    let capture_submenu = Submenu::with_id_and_items(
        app,
        "capture",
        l.capture,
        true,
        &[&capture_normal_i, &capture_delayed_i, &capture_ocr_i],
    )?;

    let settings_i = MenuItem::with_id(app, "settings", l.settings, true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", l.quit, true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &open_i,
            &PredefinedMenuItem::separator(app)?,
            &capture_submenu,
            &PredefinedMenuItem::separator(app)?,
            &settings_i,
            &PredefinedMenuItem::separator(app)?,
            &quit_i,
        ],
    )?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip(l.tooltip)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = app.emit("open-settings", ());
                }
            }
            "capture-normal" => {
                let _ = app.emit_to("main", "tray://capture-normal", ());
            }
            "capture-delayed" => {
                let _ = app.emit_to("main", "tray://capture-delayed", ());
            }
            "capture-ocr" => {
                let _ = app.emit_to("main", "tray://capture-ocr", ());
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let is_visible = window.is_visible().unwrap_or(false);
                    if is_visible {
                        let _ = window.hide();
                    } else {
                        let _ = window.unminimize();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
