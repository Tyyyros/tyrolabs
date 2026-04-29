use arboard::Clipboard;
use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

use crate::models::{Clip, now_date_time};
use crate::store::{load_history, save_history, truncate_history};

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
                        collection_id: None,
                        sort_order: 0,
                    };

                    let mut history = load_history(&app);
                    if !history.is_empty() && history[0].hash.as_deref() == Some(&img_hash) {
                        continue;
                    }
                    history.insert(0, clip.clone());
                    truncate_history(&mut history);
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
                collection_id: None,
                sort_order: 0,
            };

            history.insert(0, clip.clone());
            truncate_history(&mut history);
            save_history(&app, &history);

            let _ = app.emit("clipboard://new-item", &clip);
        }
    });
}
