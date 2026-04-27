use arboard::Clipboard;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use tauri_plugin_store::StoreExt;

/// Shared state to let the frontend tell the watcher to ignore
/// the next clipboard change (when the app itself copies text).
struct SuppressState(Arc<Mutex<Option<String>>>);

const STORE_FILE: &str = "clipboard_history.json";
const HISTORY_KEY: &str = "history";
const MAX_HISTORY: usize = 200;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clip {
    pub id: u64,
    #[serde(default)]
    pub text: String,
    pub date: String,
    pub time: String,
    #[serde(rename = "type")]
    pub clip_type: String,
    #[serde(default)]
    pub fav: bool,
    #[serde(default)]
    pub pinned: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dims: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hue: Option<u32>,
}

fn now_date_time() -> (String, String) {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let mins_total = secs / 60;
    let hours = (mins_total / 60) % 24;
    let mins = mins_total % 60;
    let days = secs / 86400;
    let day = (days % 30) + 1;
    let month = ((days / 30) % 12) + 1;
    (
        format!("{:02}/{:02}", day, month),
        format!("{:02}:{:02}", hours, mins),
    )
}

fn load_history(app: &AppHandle) -> Vec<Clip> {
    let store = match app.store(STORE_FILE) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    store
        .get(HISTORY_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

fn save_history(app: &AppHandle, history: &Vec<Clip>) {
    if let Ok(store) = app.store(STORE_FILE) {
        let _ = store.set(HISTORY_KEY, serde_json::to_value(history).unwrap_or_default());
        let _ = store.save();
    }
}

#[tauri::command]
fn set_always_on_top(window: tauri::WebviewWindow, value: bool) -> Result<(), String> {
    window.set_always_on_top(value).map_err(|e| e.to_string())
}

#[tauri::command]
fn suppress_next(state: tauri::State<'_, SuppressState>, text: String) {
    let mut guard = state.0.lock().unwrap();
    *guard = Some(text);
}

#[tauri::command]
fn reorder_clip(app: AppHandle, id: u64) {
    let mut history = load_history(&app);
    if let Some(pos) = history.iter().position(|c| c.id == id) {
        let clip = history.remove(pos);
        history.insert(0, clip);
        save_history(&app, &history);
    }
}

#[tauri::command]
fn get_history(app: AppHandle) -> Vec<Clip> {
    load_history(&app)
}

#[tauri::command]
fn clear_history(app: AppHandle) {
    save_history(&app, &vec![]);
}

#[tauri::command]
fn toggle_fav(app: AppHandle, id: u64) {
    let mut history = load_history(&app);
    if let Some(clip) = history.iter_mut().find(|c| c.id == id) {
        clip.fav = !clip.fav;
    }
    save_history(&app, &history);
}

#[tauri::command]
fn delete_clip(app: AppHandle, id: u64) {
    let mut history = load_history(&app);
    history.retain(|c| c.id != id);
    save_history(&app, &history);
}

#[tauri::command]
fn update_clip(app: AppHandle, id: u64, text: String) {
    let mut history = load_history(&app);
    if let Some(clip) = history.iter_mut().find(|c| c.id == id) {
        clip.text = text;
    }
    save_history(&app, &history);
}

#[tauri::command]
fn open_file_or_url(path: String) -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/c", "start", "", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn open_in_paint(path: String) -> Result<(), String> {
    std::process::Command::new("mspaint")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_image_base64(app: AppHandle, hash: String) -> Result<String, String> {
    if let Ok(app_data) = app.path().app_data_dir() {
        let file_path = app_data.join("images").join(format!("{}.png", hash));
        if let Ok(bytes) = std::fs::read(file_path) {
            return Ok(STANDARD.encode(bytes));
        }
    }
    Err("Image non trouvée".into())
}

#[tauri::command]
fn start_screen_capture() -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/c", "start", "ms-screenclip:"])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn rgb_to_hue(r: f32, g: f32, b: f32) -> f32 {
    let r = r / 255.0;
    let g = g / 255.0;
    let b = b / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    if max == min {
        return 0.0;
    }
    let mut h = if max == r {
        (g - b) / (max - min)
    } else if max == g {
        2.0 + (b - r) / (max - min)
    } else {
        4.0 + (r - g) / (max - min)
    };
    h *= 60.0;
    if h < 0.0 {
        h += 360.0;
    }
    h
}

fn start_clipboard_watcher(
    app: AppHandle,
    last_text: Arc<Mutex<String>>,
    suppress: Arc<Mutex<Option<String>>>,
) {
    thread::spawn(move || {
        let mut clipboard = match Clipboard::new() {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[clipboard] Failed to init: {e}");
                return;
            }
        };

        let mut last_image_hash = String::new();

        loop {
            thread::sleep(Duration::from_millis(800));

            // Check for images first
            if let Ok(img) = clipboard.get_image() {
                use std::hash::{Hash, Hasher};
                use std::collections::hash_map::DefaultHasher;
                let mut hasher = DefaultHasher::new();
                img.bytes.hash(&mut hasher);
                let img_hash_num = hasher.finish();
                let img_hash = format!("img_{img_hash_num}");

                if img_hash != last_image_hash {
                    last_image_hash = img_hash.clone();

                    let width = img.width as u32;
                    let height = img.height as u32;
                    let dims = format!("{}x{}", width, height);

                    let center_idx = ((height / 2) * width + (width / 2)) as usize * 4;
                    let mut hue = 220;
                    if center_idx + 2 < img.bytes.len() {
                        let r = img.bytes[center_idx] as f32;
                        let g = img.bytes[center_idx + 1] as f32;
                        let b = img.bytes[center_idx + 2] as f32;
                        hue = rgb_to_hue(r, g, b) as u32;
                    }

                    if let Ok(app_data) = app.path().app_data_dir() {
                        let img_dir = app_data.join("images");
                        let _ = std::fs::create_dir_all(&img_dir);
                        let file_path = img_dir.join(format!("{}.png", img_hash));
                        if let Some(dyn_img) = image::ImageBuffer::<image::Rgba<u8>, _>::from_raw(width, height, img.bytes.into_owned()) {
                            let _ = dyn_img.save(&file_path);
                        }
                    }

                    let (date, time) = now_date_time();
                    let id = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis() as u64;

                    let clip = Clip {
                        id,
                        text: String::new(),
                        date,
                        time,
                        clip_type: "image".to_string(),
                        fav: false,
                        pinned: false,
                        hash: Some(img_hash.clone()),
                        dims: Some(dims),
                        hue: Some(hue),
                    };

                    let mut history = load_history(&app);
                    if !history.is_empty() && history[0].hash.as_deref() == Some(&img_hash) {
                        continue;
                    }
                    history.insert(0, clip.clone());
                    history.truncate(MAX_HISTORY);
                    save_history(&app, &history);

                    let _ = app.emit("clipboard://new-item", &clip);
                    continue;
                }
            }

            let Ok(text) = clipboard.get_text() else {
                continue;
            };
            let text = text.trim().to_string();
            if text.is_empty() {
                continue;
            }

            {
                let mut sup = suppress.lock().unwrap();
                if sup.as_deref() == Some(text.as_str()) {
                    *sup = None;
                    let mut last = last_text.lock().unwrap();
                    *last = text;
                    continue;
                }
            }

            let mut last = last_text.lock().unwrap();
            if *last == text {
                continue;
            }
            *last = text.clone();
            drop(last);

            let mut history = load_history(&app);

            if history.first().map(|c| c.text.as_str()) == Some(text.as_str()) {
                continue;
            }

            let (date, time) = now_date_time();
            let id = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            let clip_type = "text".to_string();

            let clip = Clip {
                id,
                text: text.clone(),
                date,
                time,
                clip_type,
                fav: false,
                pinned: false,
                hash: None,
                dims: None,
                hue: None,
            };

            history.insert(0, clip.clone());
            history.truncate(MAX_HISTORY);
            save_history(&app, &history);

            let _ = app.emit("clipboard://new-item", &clip);
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let last_text = Arc::new(Mutex::new(String::new()));
    let suppress = Arc::new(Mutex::new(None::<String>));

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(SuppressState(Arc::clone(&suppress)))
        .invoke_handler(tauri::generate_handler![
            set_always_on_top,
            get_history,
            clear_history,
            toggle_fav,
            delete_clip,
            update_clip,
            suppress_next,
            reorder_clip,
            open_file_or_url,
            open_in_paint,
            get_image_base64,
            start_screen_capture
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let last = Arc::clone(&last_text);
            let sup = Arc::clone(&suppress);
            start_clipboard_watcher(app_handle, last, sup);

            let quit_i = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    }
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
                                window.hide().unwrap();
                            } else {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                    }
                })
                .build(app)?;

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
