use arboard::Clipboard;
use serde::{Deserialize, Serialize};
use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "clipboard_history.json";
const HISTORY_KEY: &str = "history";
const MAX_HISTORY: usize = 200;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextClip {
    pub id: u64,
    pub text: String,
    pub date: String,
    pub time: String,
    #[serde(rename = "type")]
    pub clip_type: String,
    pub fav: bool,
    pub pinned: bool,
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

fn load_history(app: &AppHandle) -> Vec<TextClip> {
    let store = match app.store(STORE_FILE) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    store
        .get(HISTORY_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

fn save_history(app: &AppHandle, history: &Vec<TextClip>) {
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
fn get_history(app: AppHandle) -> Vec<TextClip> {
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

fn start_clipboard_watcher(app: AppHandle, last_text: Arc<Mutex<String>>) {
    thread::spawn(move || {
        let mut clipboard = match Clipboard::new() {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[clipboard] Failed to init: {e}");
                return;
            }
        };

        loop {
            thread::sleep(Duration::from_millis(800));

            let Ok(text) = clipboard.get_text() else {
                continue;
            };
            let text = text.trim().to_string();
            if text.is_empty() {
                continue;
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

            let clip_type = if text.contains('\n') || text.starts_with("```") {
                "code"
            } else {
                "text"
            }
            .to_string();

            let clip = TextClip {
                id,
                text: text.clone(),
                date,
                time,
                clip_type,
                fav: false,
                pinned: false,
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

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            set_always_on_top,
            get_history,
            clear_history,
            toggle_fav,
            delete_clip,
            update_clip
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            let last = Arc::clone(&last_text);
            start_clipboard_watcher(app_handle, last);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erreur lors du lancement de Tauri");
}
