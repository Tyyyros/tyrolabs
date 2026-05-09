use arboard::Clipboard;
use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

use crate::models::{now_date_time, Clip};
use crate::tools::clipboard::state::{ClipboardState, SuppressNext};
use crate::tools::clipboard::storage::{
    delete_image_file, hash_image_bytes, save_history, truncate_history,
};
#[cfg(windows)]
use crate::tools::clipboard::win_files::{get_clipboard_image_bytes, get_clipboard_image_files};

/// Processus partagé pour ajouter une image (RGBA brut) à l'historique :
/// dédoublonnage, suppression "next-paste", écriture disque, emission
/// d'event. Renvoie `true` si l'image a été ajoutée (nouvelle), `false` si
/// elle a été ignorée (doublon, suppression, ou capture désactivée).
fn process_image_clip(
    app: &AppHandle,
    suppress: &Arc<Mutex<SuppressNext>>,
    last_image_hash: &mut String,
    rgba_bytes: &[u8],
    width: u32,
    height: u32,
) -> bool {
    let img_hash = hash_image_bytes(rgba_bytes);
    if img_hash == *last_image_hash {
        return false;
    }
    *last_image_hash = img_hash.clone();

    {
        let mut sup = suppress.lock().expect("suppress lock poisoned");
        if sup.image_hash.as_deref() == Some(img_hash.as_str()) {
            sup.image_hash = None;
            return false;
        }
    }

    let state = app.state::<ClipboardState>();
    let settings = state
        .settings
        .lock()
        .expect("clipboard settings lock poisoned")
        .clone();
    if !settings.capture_enabled {
        return false;
    }

    let dims = format!("{}x{}", width, height);

    let center_idx = ((height / 2) * width + (width / 2)) as usize * 4;
    let mut hue: u32 = 220;
    if center_idx + 2 < rgba_bytes.len() {
        let r = rgba_bytes[center_idx] as f32;
        let g = rgba_bytes[center_idx + 1] as f32;
        let b = rgba_bytes[center_idx + 2] as f32;
        hue = rgb_to_hue(r, g, b) as u32;
    }

    if let Ok(app_data) = app.path().app_data_dir() {
        let img_dir = app_data.join("images");
        let _ = std::fs::create_dir_all(&img_dir);
        let file_path = img_dir.join(format!("{}.png", img_hash));
        if let Some(dyn_img) =
            image::ImageBuffer::<image::Rgba<u8>, _>::from_raw(width, height, rgba_bytes.to_vec())
        {
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
        pinned: false,
        hash: Some(img_hash.clone()),
        dims: Some(dims),
        hue: Some(hue),
        collection_id: None,
        sort_order: 0,
    };

    let mut history = state.clips.lock().expect("clips lock poisoned");
    if !history.is_empty() && history[0].hash.as_deref() == Some(&img_hash) {
        return false;
    }
    history.insert(0, clip.clone());
    let removed = truncate_history(&mut history, settings.max_history);
    for h in removed {
        delete_image_file(app, &h);
    }
    save_history(app, &history);
    drop(history);

    let _ = app.emit("clipboard://new-item", &clip);
    true
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

pub fn start_clipboard_watcher(
    app: AppHandle,
    last_text: Arc<Mutex<String>>,
    suppress: Arc<Mutex<SuppressNext>>,
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

            // 1) Bitmap clipboard data (CF_BITMAP / CF_DIB) — apps qui copient
            //    une image en mémoire (browsers, Snipping Tool, Paint…).
            if let Ok(img) = clipboard.get_image() {
                let w = img.width as u32;
                let h = img.height as u32;
                let bytes = img.bytes.into_owned();
                if process_image_clip(&app, &suppress, &mut last_image_hash, &bytes, w, h) {
                    continue;
                }
                // Bitmap présent mais doublon : on ne tente pas le texte
                // (le presse-papier n'a pas de texte associé dans ce cas).
                continue;
            }

            // 2) Formats custom encodés (PNG, JPEG, GIF, WebP, BMP, TIFF)
            //    — utilisés par les apps modernes (browsers, Notion, Claude,
            //    Slack, Discord, web apps via HTML5 Clipboard API). Elles
            //    écrivent un stream encodé au lieu de — ou en plus de —
            //    CF_DIB ; arboard ne lit pas ces formats. `image` détecte
            //    le format via les magic bytes.
            #[cfg(windows)]
            {
                if let Some(encoded) = get_clipboard_image_bytes() {
                    if let Ok(dyn_img) = image::load_from_memory(&encoded) {
                        let rgba = dyn_img.to_rgba8();
                        let w = rgba.width();
                        let h = rgba.height();
                        if process_image_clip(
                            &app,
                            &suppress,
                            &mut last_image_hash,
                            rgba.as_raw(),
                            w,
                            h,
                        ) {
                            continue;
                        }
                        continue;
                    }
                }
            }

            // 3) Liste de fichiers (CF_HDROP) — utilisateur copie une image
            //    depuis l'Explorateur Windows. On lit le 1er fichier image
            //    de la liste, on le décode en RGBA, puis même flow.
            #[cfg(windows)]
            {
                if let Some(file) = get_clipboard_image_files().into_iter().next() {
                    if let Ok(file_bytes) = std::fs::read(&file) {
                        if let Ok(dyn_img) = image::load_from_memory(&file_bytes) {
                            let rgba = dyn_img.to_rgba8();
                            let w = rgba.width();
                            let h = rgba.height();
                            if process_image_clip(
                                &app,
                                &suppress,
                                &mut last_image_hash,
                                rgba.as_raw(),
                                w,
                                h,
                            ) {
                                continue;
                            }
                            // Doublon : on ne re-tente pas le texte non plus.
                            continue;
                        }
                    }
                }
            }

            let Ok(raw_text) = clipboard.get_text() else {
                continue;
            };
            if raw_text.trim().is_empty() {
                continue;
            }

            {
                let mut sup = suppress.lock().unwrap();
                if sup.text.as_deref() == Some(raw_text.as_str()) {
                    sup.text = None;
                    let mut last = last_text.lock().unwrap();
                    *last = raw_text;
                    continue;
                }
            }

            let mut last = last_text.lock().unwrap();
            if *last == raw_text {
                continue;
            }
            *last = raw_text.clone();
            drop(last);

            let state = app.state::<ClipboardState>();
            let settings = state.settings.lock().unwrap().clone();
            if !settings.capture_enabled {
                continue;
            }

            let mut history = state.clips.lock().unwrap();

            if history.first().map(|c| c.text.as_str()) == Some(raw_text.as_str()) {
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
                text: raw_text.clone(),
                date,
                time,
                clip_type,
                pinned: false,
                hash: None,
                dims: None,
                hue: None,
                collection_id: None,
                sort_order: 0,
            };

            history.insert(0, clip.clone());
            let removed = truncate_history(&mut history, settings.max_history);
            for hash in removed {
                delete_image_file(&app, &hash);
            }
            save_history(&app, &history);

            let _ = app.emit("clipboard://new-item", &clip);
        }
    });
}
