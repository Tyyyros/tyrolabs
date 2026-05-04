use arboard::Clipboard;
use std::path::PathBuf;
use tauri::Emitter;
use tauri::{AppHandle, Manager};

use crate::error::{ToolError, ToolResult};
use crate::models::{now_date_time, Clip, Collection};
use crate::tools::clipboard::state::{ClipboardState, SuppressState};
use crate::tools::clipboard::storage::{
    delete_image_file, save_collections, save_history, truncate_history,
};

fn resolve_image_path(app: &AppHandle, hash: &str) -> ToolResult<PathBuf> {
    if hash.is_empty()
        || !hash
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return Err(ToolError::InvalidInput("hash d'image invalide".into()));
    }

    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| ToolError::Message(e.to_string()))?;
    let file_path = app_data.join("images").join(format!("{hash}.png"));
    if file_path.exists() {
        Ok(file_path)
    } else {
        Err(ToolError::NotFound(
            "image introuvable dans le dossier local".into(),
        ))
    }
}

#[tauri::command]
pub fn suppress_next(state: tauri::State<'_, SuppressState>, text: String) {
    let mut guard = state.0.lock().unwrap();
    *guard = Some(text);
}

#[tauri::command]
pub fn reorder_clip(app: AppHandle, state: tauri::State<'_, ClipboardState>, id: u64) {
    let mut history = state.clips.lock().unwrap();
    if let Some(pos) = history.iter().position(|c| c.id == id) {
        let clip = history.remove(pos);
        history.insert(0, clip);
        save_history(&app, &history);
    }
}

#[tauri::command]
pub fn get_history(state: tauri::State<'_, ClipboardState>) -> Vec<Clip> {
    state.clips.lock().unwrap().clone()
}

#[tauri::command]
pub fn toggle_pinned(app: AppHandle, state: tauri::State<'_, ClipboardState>, id: u64) {
    let mut history = state.clips.lock().unwrap();
    if let Some(clip) = history.iter_mut().find(|c| c.id == id) {
        clip.pinned = !clip.pinned;
    }
    save_history(&app, &history);
}

#[tauri::command]
pub fn delete_clip(app: AppHandle, state: tauri::State<'_, ClipboardState>, id: u64) {
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
pub fn delete_clips(app: AppHandle, state: tauri::State<'_, ClipboardState>, ids: Vec<u64>) {
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
pub fn update_clip(
    app: AppHandle,
    state: tauri::State<'_, ClipboardState>,
    id: u64,
    text: String,
) {
    let mut history = state.clips.lock().unwrap();
    if let Some(clip) = history.iter_mut().find(|c| c.id == id) {
        clip.text = text;
    }
    save_history(&app, &history);
}

#[tauri::command]
pub fn add_manual_clip(app: AppHandle, state: tauri::State<'_, ClipboardState>, text: String) {
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

/// Returns the absolute filesystem path for an image hash.
/// Used by the frontend to build an `asset://` URI via `convertFileSrc`.
#[tauri::command]
pub fn get_image_path(app: AppHandle, hash: String) -> ToolResult<String> {
    let file_path = resolve_image_path(&app, &hash)?;
    Ok(file_path.to_string_lossy().into_owned())
}

/// Copies the actual image bitmap to the system clipboard (not text).
#[tauri::command]
pub fn copy_image_to_clipboard(app: AppHandle, hash: String) -> ToolResult<()> {
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

// ──── Collections ────────────────────────────────────────────────────

#[tauri::command]
pub fn get_collections(state: tauri::State<'_, ClipboardState>) -> Vec<Collection> {
    state.collections.lock().unwrap().clone()
}

#[tauri::command]
pub fn create_collection(
    app: AppHandle,
    state: tauri::State<'_, ClipboardState>,
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
    state: tauri::State<'_, ClipboardState>,
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
pub fn delete_collection(app: AppHandle, state: tauri::State<'_, ClipboardState>, id: String) {
    {
        let mut collections = state.collections.lock().expect("collections lock poisoned");
        collections.retain(|c| c.id != id);
        save_collections(&app, &collections);
    }

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
    state: tauri::State<'_, ClipboardState>,
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
    state: tauri::State<'_, ClipboardState>,
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
pub fn ungroup_clip(app: AppHandle, state: tauri::State<'_, ClipboardState>, clip_id: u64) {
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
    state: tauri::State<'_, ClipboardState>,
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
