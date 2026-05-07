//! Stockage disque des médias (images insérées dans les notes ou couvertures).
//!
//! Les fichiers vivent dans `<app_data>/notes_assets/<hash>.<ext>`. Le hash est
//! le même schéma que l'outil clipboard (`hash_image_bytes`), mais le dossier
//! est distinct pour éviter toute collision avec le GC d'images clipboard.

use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::error::{ToolError, ToolResult};
use crate::tools::clipboard::storage::hash_image_bytes;

const ASSETS_DIR: &str = "notes_assets";

fn sanitize_ext(ext: &str) -> ToolResult<String> {
    let trimmed = ext.trim().trim_start_matches('.').to_ascii_lowercase();
    if trimmed.is_empty()
        || trimmed.len() > 6
        || !trimmed.chars().all(|c| c.is_ascii_alphanumeric())
    {
        return Err(ToolError::InvalidInput("extension invalide".into()));
    }
    Ok(trimmed)
}

fn sanitize_hash(hash: &str) -> ToolResult<()> {
    if hash.is_empty()
        || !hash
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err(ToolError::InvalidInput("hash invalide".into()));
    }
    Ok(())
}

fn assets_dir(app: &AppHandle) -> ToolResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ToolError::Message(e.to_string()))?
        .join(ASSETS_DIR);
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

/// Persiste les bytes sur disque et retourne `(hash, ext_normalisée)`.
pub fn save_note_asset(
    app: &AppHandle,
    bytes: &[u8],
    ext: &str,
) -> ToolResult<(String, String)> {
    if bytes.is_empty() {
        return Err(ToolError::InvalidInput("contenu vide".into()));
    }
    let ext = sanitize_ext(ext)?;
    let hash = hash_image_bytes(bytes);
    let dir = assets_dir(app)?;
    let path = dir.join(format!("{hash}.{ext}"));
    if !path.exists() {
        std::fs::write(&path, bytes)?;
    }
    Ok((hash, ext))
}

pub fn note_asset_path(app: &AppHandle, hash: &str, ext: &str) -> ToolResult<PathBuf> {
    sanitize_hash(hash)?;
    let ext = sanitize_ext(ext)?;
    let path = assets_dir(app)?.join(format!("{hash}.{ext}"));
    if path.exists() {
        Ok(path)
    } else {
        Err(ToolError::NotFound("asset notes introuvable".into()))
    }
}

/// Tente de supprimer un asset. Silencieux si introuvable ou hash invalide.
pub fn delete_note_asset(app: &AppHandle, hash: &str, ext: &str) {
    if sanitize_hash(hash).is_err() {
        return;
    }
    let Ok(ext) = sanitize_ext(ext) else { return };
    if let Ok(dir) = assets_dir(app) {
        let _ = std::fs::remove_file(dir.join(format!("{hash}.{ext}")));
    }
}

/// Extrait toutes les paires (hash, ext) référencées dans le body d'une note.
/// Recherche les patterns `note-asset://<hash>.<ext>` (utilisés en RTE et MD).
pub fn extract_asset_refs(body: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let needle = "note-asset://";
    let bytes = body.as_bytes();
    let mut i = 0;
    while i + needle.len() <= bytes.len() {
        if &bytes[i..i + needle.len()] == needle.as_bytes() {
            let start = i + needle.len();
            // lire hash : alphanum, _, -
            let mut j = start;
            while j < bytes.len() {
                let c = bytes[j] as char;
                if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                    j += 1;
                } else {
                    break;
                }
            }
            if j < bytes.len() && bytes[j] == b'.' {
                let hash = body[start..j].to_string();
                let ext_start = j + 1;
                let mut k = ext_start;
                while k < bytes.len() {
                    let c = bytes[k] as char;
                    if c.is_ascii_alphanumeric() {
                        k += 1;
                    } else {
                        break;
                    }
                }
                if k > ext_start {
                    let ext = body[ext_start..k].to_string();
                    out.push((hash, ext));
                    i = k;
                    continue;
                }
            }
        }
        i += 1;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::extract_asset_refs;

    #[test]
    fn extracts_hash_and_ext_from_markdown() {
        let body = "![alt](note-asset://img_12345.png) more text ![](note-asset://abc-9.jpg)";
        let refs = extract_asset_refs(body);
        assert_eq!(
            refs,
            vec![
                ("img_12345".to_string(), "png".to_string()),
                ("abc-9".to_string(), "jpg".to_string()),
            ]
        );
    }

    #[test]
    fn ignores_malformed_refs() {
        // note-asset:// vide → ignoré
        // note-asset://no_ext → pas de point → ignoré
        // note-asset://has.png stop sur les chars non alphanum (espace ici)
        let body = "note-asset:// note-asset://no_ext note-asset://has.png trailing";
        let refs = extract_asset_refs(body);
        assert_eq!(refs, vec![("has".to_string(), "png".to_string())]);
    }
}
