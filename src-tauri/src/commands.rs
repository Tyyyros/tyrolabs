use crate::capture::get_open_windows;
use crate::models::{now_date_time, Clip, Collection, WindowRect};
use crate::state::{AppState, SuppressState};
use crate::store::{delete_image_file, save_collections, save_history, truncate_history};
use arboard::Clipboard;
use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use std::path::PathBuf;
use sysinfo::System;
use tauri::Emitter;
use tauri::{AppHandle, Manager};

fn resolve_image_path(app: &AppHandle, hash: &str) -> Result<PathBuf, String> {
    if hash.is_empty()
        || !hash
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return Err("Hash d'image invalide".into());
    }

    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let file_path = app_data.join("images").join(format!("{hash}.png"));
    if file_path.exists() {
        Ok(file_path)
    } else {
        Err("Image introuvable dans le dossier local".into())
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct CaptureContext {
    pub screenshot: String,
    pub windows: Vec<WindowRect>,
}

#[tauri::command]
pub async fn get_capture_context(app: tauri::AppHandle) -> Result<CaptureContext, String> {
    let main = app.get_webview_window("main");
    if let Some(main) = &main {
        let _ = main.hide();
    }

    tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;

    let result = (|| -> Result<CaptureContext, String> {
        let screens = screenshots::Screen::all().map_err(|e| e.to_string())?;
        let primary = screens.get(0).ok_or("Aucun écran trouvé")?;
        let image = primary.capture().map_err(|e| e.to_string())?;

        let mut buffer = std::io::Cursor::new(Vec::new());
        image
            .write_to(&mut buffer, screenshots::image::ImageFormat::Png)
            .map_err(|e| e.to_string())?;

        let b64 = general_purpose::STANDARD.encode(buffer.into_inner());
        let screenshot = format!("data:image/png;base64,{}", b64);

        let windows = get_open_windows();

        Ok(CaptureContext {
            screenshot,
            windows,
        })
    })();

    if let Some(main) = &main {
        let _ = main.show();
    }

    result
}

#[tauri::command]
pub async fn save_capture_area(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let screens = screenshots::Screen::all().map_err(|e| e.to_string())?;
    let primary = screens.get(0).ok_or("Aucun écran trouvé")?;

    if width == 0 || height == 0 {
        return Err("Dimensions invalides".into());
    }

    let image = primary
        .capture_area(x, y, width, height)
        .map_err(|e| e.to_string())?;
    let (date, time) = now_date_time();
    let id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let now = chrono::Local::now();
    let name = now.format("capture_%d%m%y_%H%M%S").to_string();
    let hash = format!("cap_{}", id);

    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let img_dir = app_data.join("images");
    std::fs::create_dir_all(&img_dir).map_err(|e| e.to_string())?;
    let file_path = img_dir.join(format!("{}.png", hash));

    image.save(&file_path).map_err(|e| e.to_string())?;

    let hue = 210; // Default blue-ish

    let clip = Clip {
        id,
        text: name,
        date,
        time,
        clip_type: "image".to_string(),
        pinned: false,
        hash: Some(hash),
        dims: Some(format!("{}x{}", width, height)),
        hue: Some(hue),
        collection_id: None,
        sort_order: 0,
    };

    let mut history = state.clips.lock().expect("clips lock poisoned");
    history.insert(0, clip.clone());
    let removed = truncate_history(&mut history);
    for hash in removed {
        delete_image_file(&app, &hash);
    }
    save_history(&app, &history);
    let _ = app.emit("clipboard://new-item", &clip);

    Ok(())
}

#[tauri::command]
pub async fn open_capture_overlay(app: AppHandle) -> Result<(), String> {
    // Check if window already exists
    if let Some(win) = app.get_webview_window("capture") {
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(());
    }

    let _ = tauri::WebviewWindowBuilder::new(
        &app,
        "capture",
        tauri::WebviewUrl::App("/capture".into()),
    )
    .transparent(true)
    .decorations(false)
    .fullscreen(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn is_production_build() -> bool {
    !cfg!(debug_assertions)
}

#[tauri::command]
pub fn set_always_on_top(window: tauri::WebviewWindow, value: bool) -> Result<(), String> {
    window.set_always_on_top(value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn suppress_next(state: tauri::State<'_, SuppressState>, text: String) {
    let mut guard = state.0.lock().unwrap();
    *guard = Some(text);
}

#[tauri::command]
pub fn reorder_clip(app: AppHandle, state: tauri::State<'_, AppState>, id: u64) {
    let mut history = state.clips.lock().unwrap();
    if let Some(pos) = history.iter().position(|c| c.id == id) {
        let clip = history.remove(pos);
        history.insert(0, clip);
        save_history(&app, &history);
    }
}

#[tauri::command]
pub fn get_history(state: tauri::State<'_, AppState>) -> Vec<Clip> {
    state.clips.lock().unwrap().clone()
}

#[tauri::command]
pub fn clear_history(app: AppHandle, state: tauri::State<'_, AppState>) {
    let mut history = state.clips.lock().unwrap();
    // Identify image clips to delete
    let to_remove: Vec<String> = history
        .iter()
        .filter(|c| c.collection_id.is_none() && c.hash.is_some())
        .map(|c| c.hash.as_ref().unwrap().clone())
        .collect();

    for hash in to_remove {
        delete_image_file(&app, &hash);
    }

    // Preserve grouped (permanent) items
    history.retain(|c| c.collection_id.is_some());
    save_history(&app, &history);
}

#[tauri::command]
pub fn toggle_pinned(app: AppHandle, state: tauri::State<'_, AppState>, id: u64) {
    let mut history = state.clips.lock().unwrap();
    if let Some(clip) = history.iter_mut().find(|c| c.id == id) {
        clip.pinned = !clip.pinned;
    }
    save_history(&app, &history);
}

#[tauri::command]
pub fn delete_clip(app: AppHandle, state: tauri::State<'_, AppState>, id: u64) {
    let mut history = state.clips.lock().unwrap();
    if let Some(pos) = history.iter().position(|c| c.id == id) {
        let clip = history.remove(pos);
        if let Some(hash) = clip.hash {
            delete_image_file(&app, &hash);
        }
    }
    save_history(&app, &history);
}

#[tauri::command]
pub fn delete_clips(app: AppHandle, state: tauri::State<'_, AppState>, ids: Vec<u64>) {
    let mut history = state.clips.lock().unwrap();
    for id in ids {
        if let Some(pos) = history.iter().position(|c| c.id == id) {
            let clip = history.remove(pos);
            if let Some(hash) = clip.hash {
                delete_image_file(&app, &hash);
            }
        }
    }
    save_history(&app, &history);
}

#[tauri::command]
pub fn update_clip(app: AppHandle, state: tauri::State<'_, AppState>, id: u64, text: String) {
    let mut history = state.clips.lock().unwrap();
    if let Some(clip) = history.iter_mut().find(|c| c.id == id) {
        clip.text = text;
    }
    save_history(&app, &history);
}

#[tauri::command]
pub fn add_manual_clip(app: AppHandle, state: tauri::State<'_, AppState>, text: String) {
    let mut history = state.clips.lock().unwrap();
    let (date, time) = now_date_time();
    let id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let clip = Clip {
        id,
        text: text.clone(),
        date,
        time,
        clip_type: "text".to_string(),
        pinned: false,
        hash: None,
        dims: None,
        hue: None,
        collection_id: None,
        sort_order: 0,
    };

    history.insert(0, clip.clone());
    truncate_history(&mut history);
    save_history(&app, &history);

    let _ = app.emit("clipboard://new-item", &clip);
}

#[tauri::command]
pub fn open_file_or_url(path: String) -> Result<(), String> {
    // Reject paths with suspicious shell metacharacters
    if path.contains("&&") || path.contains('|') || path.contains(';') || path.contains('`') {
        return Err("Chemin invalide".into());
    }
    // On Windows, explorer is a safe way to open URLs and files without cmd.exe
    std::process::Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_in_paint(path: String) -> Result<(), String> {
    // Only allow paths that look like valid image file paths
    if !path.ends_with(".png") && !path.ends_with(".jpg") && !path.ends_with(".bmp") {
        return Err("Format d'image non supporté".into());
    }
    // Spawning mspaint directly without a shell is safer
    std::process::Command::new("mspaint")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Returns the absolute filesystem path for an image hash.
/// Used by the frontend to build an `asset://` URI via `convertFileSrc`
/// and to pass real paths to mspaint.
#[tauri::command]
pub fn get_image_path(app: AppHandle, hash: String) -> Result<String, String> {
    let file_path = resolve_image_path(&app, &hash)?;
    Ok(file_path.to_string_lossy().into_owned())
}

/// Copies the actual image bitmap to the system clipboard (not text).
#[tauri::command]
pub fn copy_image_to_clipboard(app: AppHandle, hash: String) -> Result<(), String> {
    let file_path = resolve_image_path(&app, &hash)?;
    let img = image::open(&file_path).map_err(|e| e.to_string())?;
    let rgba = img.to_rgba8();
    let (w, h) = (rgba.width() as usize, rgba.height() as usize);
    let bytes = rgba.into_raw();
    let img_data = arboard::ImageData {
        width: w,
        height: h,
        bytes: std::borrow::Cow::Owned(bytes),
    };
    let mut cb = Clipboard::new().map_err(|e| e.to_string())?;
    cb.set_image(img_data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn start_screen_capture(delay: u64) -> Result<(), String> {
    if delay > 0 {
        tokio::time::sleep(tokio::time::Duration::from_secs(delay)).await;
    }
    std::process::Command::new("explorer")
        .arg("ms-screenclip:")
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ──── Collection commands ────────────────────────────────────────────

#[tauri::command]
pub fn get_collections(state: tauri::State<'_, AppState>) -> Vec<Collection> {
    state.collections.lock().unwrap().clone()
}

#[tauri::command]
pub fn create_collection(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    icon: String,
    color: String,
    origin_tab: String,
) -> Collection {
    let collection = Collection::new(name, icon, color, origin_tab);
    let mut collections = state.collections.lock().unwrap();
    collections.push(collection.clone());
    save_collections(&app, &collections);
    collection
}

#[tauri::command]
pub fn update_collection(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    icon: String,
    color: String,
) {
    let mut collections = state.collections.lock().unwrap();
    if let Some(c) = collections.iter_mut().find(|c| c.id == id) {
        c.name = name;
        c.icon = icon;
        c.color = color;
    }
    save_collections(&app, &collections);
}

#[tauri::command]
pub fn delete_collection(app: AppHandle, state: tauri::State<'_, AppState>, id: String) {
    {
        let mut collections = state.collections.lock().expect("collections lock poisoned");
        collections.retain(|c| c.id != id);
        save_collections(&app, &collections);
    } // drop collections lock before acquiring clips lock

    // Ungroup all clips that were in this collection
    let mut history = state.clips.lock().expect("clips lock poisoned");
    for clip in history.iter_mut() {
        if clip.collection_id.as_deref() == Some(&id) {
            clip.collection_id = None;
            clip.sort_order = 0;
        }
    }
    save_history(&app, &history);
}

#[tauri::command]
pub fn set_clip_collection(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    clip_id: u64,
    collection_id: String,
    sort_order: i32,
) {
    let mut history = state.clips.lock().unwrap();
    if let Some(clip) = history.iter_mut().find(|c| c.id == clip_id) {
        clip.collection_id = Some(collection_id);
        clip.sort_order = sort_order;
    }
    save_history(&app, &history);
}

#[tauri::command]
pub fn set_clips_collection(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    clip_ids: Vec<u64>,
    collection_id: String,
) {
    let mut history = state.clips.lock().unwrap();
    for cid in clip_ids {
        if let Some(clip) = history.iter_mut().find(|c| c.id == cid) {
            clip.collection_id = Some(collection_id.clone());
        }
    }
    save_history(&app, &history);
}

#[tauri::command]
pub fn ungroup_clip(app: AppHandle, state: tauri::State<'_, AppState>, clip_id: u64) {
    let mut history = state.clips.lock().unwrap();
    if let Some(clip) = history.iter_mut().find(|c| c.id == clip_id) {
        clip.collection_id = None;
        clip.sort_order = 0;
    }
    save_history(&app, &history);
}

#[tauri::command]
pub fn reorder_clips_in_collection(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    clip_ids: Vec<u64>,
) {
    let mut history = state.clips.lock().unwrap();
    for (i, cid) in clip_ids.iter().enumerate() {
        if let Some(clip) = history.iter_mut().find(|c| c.id == *cid) {
            clip.sort_order = i as i32;
        }
    }
    save_history(&app, &history);
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

