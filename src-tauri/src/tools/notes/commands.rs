use std::collections::HashSet;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::error::{ToolError, ToolResult};
use crate::models::{now_date_time, Collection, Note, NoteFormat, NotePatch};
use crate::tools::notes::media::{
    delete_note_asset, extract_asset_refs, note_asset_path, save_note_asset,
};
use crate::tools::notes::state::NotesState;
use crate::tools::notes::storage::{save_note_collections, save_notes};

const EVENT_CHANGED: &str = "notes://changed";

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn collection_exists(state: &tauri::State<'_, NotesState>, id: &str) -> bool {
    state
        .collections
        .lock()
        .expect("notes collections lock poisoned")
        .iter()
        .any(|c| c.id == id)
}

#[tauri::command]
pub fn get_notes(state: tauri::State<'_, NotesState>) -> Vec<Note> {
    state.notes.lock().unwrap().clone()
}

#[tauri::command]
pub fn create_note(
    app: AppHandle,
    state: tauri::State<'_, NotesState>,
    title: String,
    format: NoteFormat,
    collection_id: Option<String>,
    tags: Option<Vec<String>>,
) -> ToolResult<Note> {
    if let Some(ref cid) = collection_id {
        if !cid.is_empty() && !collection_exists(&state, cid) {
            return Err(ToolError::NotFound("collection introuvable".into()));
        }
    }

    let mut note = Note::new(
        title,
        format,
        collection_id.filter(|s| !s.is_empty()),
    );
    if let Some(t) = tags {
        note.tags = t;
    }

    let mut notes = state.notes.lock().unwrap();
    notes.insert(0, note.clone());
    save_notes(&app, &notes);
    let _ = app.emit(EVENT_CHANGED, &note);
    Ok(note)
}

#[tauri::command]
pub fn update_note(
    app: AppHandle,
    state: tauri::State<'_, NotesState>,
    id: String,
    patch: NotePatch,
) -> ToolResult<Note> {
    let mut notes = state.notes.lock().unwrap();
    let note = notes
        .iter_mut()
        .find(|n| n.id == id)
        .ok_or_else(|| ToolError::NotFound("note introuvable".into()))?;

    let prev_body = note.body.clone();
    let mut prev_cover: Option<(String, String)> = None;

    if let Some(t) = patch.title {
        note.title = t;
    }
    if let Some(b) = patch.body {
        note.body = b;
    }
    if let Some(f) = patch.format {
        note.format = f;
    }
    if let Some(t) = patch.tags {
        note.tags = t;
    }
    if let Some(p) = patch.pinned {
        note.pinned = p;
    }
    if let Some(c) = patch.cover_hash {
        if c.is_empty() {
            if let (Some(h), Some(e)) = (note.cover_hash.take(), note.cover_ext.take()) {
                prev_cover = Some((h, e));
            }
        } else {
            note.cover_hash = Some(c);
        }
    }
    if let Some(e) = patch.cover_ext {
        if e.is_empty() {
            note.cover_ext = None;
        } else {
            note.cover_ext = Some(e);
        }
    }
    if let Some(cid) = patch.collection_id {
        if cid.is_empty() {
            note.collection_id = None;
        } else if collection_exists(&state, &cid) {
            note.collection_id = Some(cid);
        } else {
            return Err(ToolError::NotFound("collection introuvable".into()));
        }
    }

    let (date, time) = now_date_time();
    note.date = date;
    note.time = time;
    note.updated_at = now_ms();
    let snapshot = note.clone();

    // GC : si le body a changé, supprimer les assets qui n'apparaissent plus.
    if prev_body != snapshot.body {
        let prev_refs: HashSet<_> = extract_asset_refs(&prev_body).into_iter().collect();
        let new_refs: HashSet<_> = extract_asset_refs(&snapshot.body).into_iter().collect();
        for orphan in prev_refs.difference(&new_refs) {
            // ne pas supprimer si une autre note référence le même asset
            let still_referenced = notes.iter().any(|n| {
                n.id != id
                    && extract_asset_refs(&n.body)
                        .iter()
                        .any(|r| r == orphan)
            });
            if !still_referenced {
                delete_note_asset(&app, &orphan.0, &orphan.1);
            }
        }
    }
    if let Some((h, e)) = prev_cover {
        let still_referenced = notes.iter().any(|n| {
            n.cover_hash.as_deref() == Some(&h) && n.cover_ext.as_deref() == Some(&e)
        });
        if !still_referenced {
            delete_note_asset(&app, &h, &e);
        }
    }

    save_notes(&app, &notes);
    let _ = app.emit(EVENT_CHANGED, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
pub fn delete_note(
    app: AppHandle,
    state: tauri::State<'_, NotesState>,
    id: String,
) -> ToolResult<()> {
    let mut notes = state.notes.lock().unwrap();
    let pos = notes
        .iter()
        .position(|n| n.id == id)
        .ok_or_else(|| ToolError::NotFound("note introuvable".into()))?;
    let removed = notes.remove(pos);

    // GC : assets référencés uniquement par cette note.
    let removed_refs: HashSet<_> = extract_asset_refs(&removed.body).into_iter().collect();
    for r in removed_refs {
        let still_referenced = notes.iter().any(|n| {
            extract_asset_refs(&n.body)
                .iter()
                .any(|other| other == &r)
        });
        if !still_referenced {
            delete_note_asset(&app, &r.0, &r.1);
        }
    }
    if let (Some(h), Some(e)) = (&removed.cover_hash, &removed.cover_ext) {
        let still_referenced = notes
            .iter()
            .any(|n| n.cover_hash.as_deref() == Some(h) && n.cover_ext.as_deref() == Some(e));
        if !still_referenced {
            delete_note_asset(&app, h, e);
        }
    }

    save_notes(&app, &notes);
    let _ = app.emit("notes://deleted", &id);
    Ok(())
}

#[tauri::command]
pub fn set_notes_collection(
    app: AppHandle,
    state: tauri::State<'_, NotesState>,
    note_ids: Vec<String>,
    collection_id: String,
) -> ToolResult<()> {
    let target = collection_id.clone();
    let clearing = target.is_empty();
    if !clearing && !collection_exists(&state, &target) {
        return Err(ToolError::NotFound("collection introuvable".into()));
    }

    let mut notes = state.notes.lock().unwrap();
    let id_set: HashSet<_> = note_ids.into_iter().collect();
    let now = now_ms();
    for note in notes.iter_mut() {
        if id_set.contains(&note.id) {
            note.collection_id = if clearing { None } else { Some(target.clone()) };
            note.sort_order = 0;
            note.updated_at = now;
        }
    }
    save_notes(&app, &notes);
    Ok(())
}

// ──── Collections ────────────────────────────────────────────────────

#[tauri::command]
pub fn get_note_collections(state: tauri::State<'_, NotesState>) -> Vec<Collection> {
    state.collections.lock().unwrap().clone()
}

#[tauri::command]
pub fn create_note_collection(
    app: AppHandle,
    state: tauri::State<'_, NotesState>,
    name: String,
    icon: String,
    color: String,
) -> ToolResult<Collection> {
    let collection = Collection::new(name, icon, color);
    let mut collections = state.collections.lock().unwrap();
    collections.push(collection.clone());
    save_note_collections(&app, &collections);
    Ok(collection)
}

#[tauri::command]
pub fn update_note_collection(
    app: AppHandle,
    state: tauri::State<'_, NotesState>,
    id: String,
    name: String,
    icon: String,
    color: String,
) -> ToolResult<()> {
    let mut collections = state.collections.lock().unwrap();
    let target = collections
        .iter_mut()
        .find(|c| c.id == id)
        .ok_or_else(|| ToolError::NotFound("collection introuvable".into()))?;
    target.name = name;
    target.icon = icon;
    target.color = color;
    save_note_collections(&app, &collections);
    Ok(())
}

#[tauri::command]
pub fn delete_note_collection(
    app: AppHandle,
    state: tauri::State<'_, NotesState>,
    id: String,
) -> ToolResult<()> {
    {
        let mut collections = state.collections.lock().unwrap();
        collections.retain(|c| c.id != id);
        save_note_collections(&app, &collections);
    }
    let mut notes = state.notes.lock().unwrap();
    for note in notes.iter_mut() {
        if note.collection_id.as_deref() == Some(&id) {
            note.collection_id = None;
            note.sort_order = 0;
        }
    }
    save_notes(&app, &notes);
    Ok(())
}

// ──── Médias ────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct SavedAsset {
    pub hash: String,
    pub ext: String,
}

#[tauri::command]
pub fn save_note_asset_cmd(
    app: AppHandle,
    bytes: Vec<u8>,
    ext: String,
) -> ToolResult<SavedAsset> {
    let (hash, ext) = save_note_asset(&app, &bytes, &ext)?;
    Ok(SavedAsset { hash, ext })
}

#[tauri::command]
pub fn get_note_asset_path(app: AppHandle, hash: String, ext: String) -> ToolResult<String> {
    let path = note_asset_path(&app, &hash, &ext)?;
    Ok(path.to_string_lossy().into_owned())
}

// ──── Export ────────────────────────────────────────────────────────

/// Retourne le contenu Markdown d'une note. Le frontend ouvre la dialog
/// `save` (plugin-dialog) puis appelle `write_note_to_file`.
#[tauri::command]
pub fn export_note_markdown(
    state: tauri::State<'_, NotesState>,
    id: String,
) -> ToolResult<String> {
    let notes = state.notes.lock().unwrap();
    let note = notes
        .iter()
        .find(|n| n.id == id)
        .ok_or_else(|| ToolError::NotFound("note introuvable".into()))?;

    match note.format {
        NoteFormat::Markdown => Ok(note.body.clone()),
        NoteFormat::RichText => {
            // V1 : retourner le JSON brut. La conversion riche est
            // gérée côté frontend (lib/notes-conversion.ts) pour l'export.
            Ok(note.body.clone())
        }
    }
}

/// Écrit un fichier texte à un chemin choisi par l'utilisateur.
/// Évite d'avoir à configurer un scope `fs:` permissif côté Tauri.
#[tauri::command]
pub fn write_note_to_file(path: String, content: String) -> ToolResult<()> {
    if path.is_empty() {
        return Err(ToolError::InvalidInput("chemin vide".into()));
    }
    std::fs::write(&path, content)?;
    Ok(())
}
