use std::io::BufWriter;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;
use tauri::{AppHandle, Manager};

use crate::error::{ToolError, ToolResult};
use crate::models::{now_date_time, Clip, WindowRect};
use crate::tools::capture::state::{CaptureState, MonitorRect, StagedCapture};
use crate::tools::capture::windows::get_open_windows;
use crate::tools::clipboard::state::ClipboardState;
use crate::tools::clipboard::storage::{delete_image_file, save_history, truncate_history};

const STAGING_FILE: &str = "_staging.png";
const CAPTURES_DIR: &str = "captures";
/// Délai après `minimize()` pour laisser DWM rafraîchir le buffer écran.
/// Avec les transitions DWM désactivées sur la fenêtre principale (cf. lib.rs),
/// le minimize est instantané, donc 30 ms suffit.
const HIDE_REDRAW_MS: u64 = 30;

/// Capture le screenshot d'un moniteur et l'écrit en PNG **fast compression**
/// (~3-5× plus rapide que le PNG par défaut). Renvoie aussi l'image RGBA en
/// mémoire pour permettre un crop ultérieur sans re-décodage disque.
fn capture_monitor_to_disk(
    screen: &screenshots::Screen,
    path: &Path,
) -> ToolResult<image::RgbaImage> {
    use image::codecs::png::{CompressionType, FilterType, PngEncoder};
    use image::ExtendedColorType;
    use image::ImageEncoder;

    let scr = screen
        .capture()
        .map_err(|e| ToolError::Message(e.to_string()))?;
    let w = scr.width();
    let h = scr.height();
    // screenshots-rs gère déjà la conversion BGRA→RGBA en interne ; on récupère
    // le buffer en RGBA prêt à l'emploi.
    let raw = scr.into_raw();

    let img = image::RgbaImage::from_raw(w, h, raw)
        .ok_or_else(|| ToolError::Message("dimensions de screenshot invalides".into()))?;

    let file = BufWriter::new(std::fs::File::create(path).map_err(|e| e.to_string())?);
    PngEncoder::new_with_quality(file, CompressionType::Fast, FilterType::NoFilter)
        .write_image(
            img.as_raw(),
            img.width(),
            img.height(),
            ExtendedColorType::Rgba8,
        )
        .map_err(|e| ToolError::Message(e.to_string()))?;

    Ok(img)
}

/// Capture le moniteur courant, énumère les fenêtres visibles, prépare l'overlay.
/// L'overlay (pré-spawné caché au boot) est repositionné puis notifié via event ;
/// il se montre lui-même une fois l'image préchargée (pas de flash).
#[tauri::command]
pub async fn prepare_capture(
    app: AppHandle,
    capture: tauri::State<'_, CaptureState>,
) -> ToolResult<()> {
    // 1. Identifier le moniteur courant via la fenêtre principale.
    let main = app
        .get_webview_window("main")
        .ok_or(ToolError::Message("fenêtre principale introuvable".into()))?;
    let monitor = main
        .current_monitor()
        .map_err(|e| ToolError::Message(e.to_string()))?
        .ok_or(ToolError::Message("moniteur courant inconnu".into()))?;

    let scale = monitor.scale_factor();
    let mpos = *monitor.position();
    let msize = *monitor.size();

    // 2. Réduire la fenêtre principale (la pousse dans la barre des tâches).
    //    Avec DWMWA_TRANSITIONS_FORCEDISABLED défini sur main au boot, c'est
    //    instantané — pas d'animation de minimize à attendre.
    let was_visible = main.is_visible().unwrap_or(false);
    if was_visible {
        let _ = main.minimize();
        std::thread::sleep(Duration::from_millis(HIDE_REDRAW_MS));
    }

    // 3. Screenshot + énumération.
    let result = (|| -> ToolResult<StagedCapture> {
        let screens = screenshots::Screen::all().map_err(|e| e.to_string())?;
        let screen = screens
            .iter()
            .find(|s| s.display_info.x == mpos.x && s.display_info.y == mpos.y)
            .or_else(|| screens.first())
            .ok_or(ToolError::Message("aucun écran détecté".into()))?;

        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|e| ToolError::Message(e.to_string()))?;
        let staging_dir = app_data.join(CAPTURES_DIR);
        std::fs::create_dir_all(&staging_dir).map_err(|e| e.to_string())?;
        let staging_path = staging_dir.join(STAGING_FILE);

        let rgba = capture_monitor_to_disk(screen, &staging_path)?;

        let mright = mpos.x + msize.width as i32;
        let mbottom = mpos.y + msize.height as i32;
        let local_windows: Vec<WindowRect> = get_open_windows()
            .into_iter()
            .filter_map(|w| {
                if w.x + w.width <= mpos.x
                    || w.x >= mright
                    || w.y + w.height <= mpos.y
                    || w.y >= mbottom
                {
                    return None;
                }
                Some(WindowRect {
                    x: w.x - mpos.x,
                    y: w.y - mpos.y,
                    width: w.width,
                    height: w.height,
                    title: w.title,
                })
            })
            .collect();

        Ok(StagedCapture {
            image_path: staging_path.to_string_lossy().into_owned(),
            windows: local_windows,
            monitor: MonitorRect {
                x: mpos.x,
                y: mpos.y,
                width: msize.width,
                height: msize.height,
                scale,
            },
            image: Some(Arc::new(rgba)),
        })
    })();

    let staged = match result {
        Ok(s) => s,
        Err(e) => {
            // En cas d'échec, restaurer la fenêtre principale.
            if was_visible {
                let _ = main.unminimize();
                let _ = main.show();
                let _ = main.set_focus();
            }
            return Err(e);
        }
    };

    *capture
        .staging
        .lock()
        .expect("capture staging poisoned") = Some(staged.clone());

    // 4. Repositionner l'overlay sur le moniteur capturé.
    //    On passe par les coords LOGIQUES de Tauri (et non Physical) : c'est le
    //    même référentiel que celui que le webview utilise pour 100vw / innerWidth,
    //    ce qui élimine les mismatchs DPI multi-écran (PhysicalSize peut être
    //    interprété avec le DPI du mauvais moniteur sur certains setups).
    let overlay = app
        .get_webview_window("capture")
        .ok_or(ToolError::Message("overlay capture introuvable".into()))?;

    let logical_pos: tauri::LogicalPosition<f64> = mpos.to_logical(scale);
    let logical_size: tauri::LogicalSize<f64> = msize.to_logical(scale);

    let _ = overlay.set_position(tauri::Position::Logical(logical_pos));
    let _ = overlay.set_size(tauri::Size::Logical(logical_size));

    let _ = app.emit_to("capture", "capture-ready", ());

    Ok(())
}

/// Renvoie la capture préparée à l'overlay (chemin du PNG + fenêtres locales).
#[tauri::command]
pub fn get_capture_data(capture: tauri::State<'_, CaptureState>) -> ToolResult<StagedCapture> {
    capture
        .staging
        .lock()
        .expect("capture staging poisoned")
        .clone()
        .ok_or(ToolError::Message("aucune capture préparée".into()))
}

/// Annule la capture en cours (Esc dans l'overlay).
#[tauri::command]
pub fn cancel_capture(capture: tauri::State<'_, CaptureState>) {
    if let Some(staged) = capture
        .staging
        .lock()
        .expect("capture staging poisoned")
        .take()
    {
        let _ = std::fs::remove_file(&staged.image_path);
    }
}

/// Découpe la capture préparée à la zone donnée (coords logiques locales au moniteur)
/// et l'enregistre comme nouveau clip image dans l'historique.
/// Crop direct depuis le RGBA en mémoire — pas de re-décodage disque.
#[tauri::command]
pub async fn save_capture_area(
    app: AppHandle,
    clip_state: tauri::State<'_, ClipboardState>,
    capture: tauri::State<'_, CaptureState>,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> ToolResult<()> {
    if width == 0 || height == 0 {
        return Err(ToolError::InvalidInput("dimensions invalides".into()));
    }

    let staged = capture
        .staging
        .lock()
        .expect("capture staging poisoned")
        .take()
        .ok_or(ToolError::Message("aucune capture préparée".into()))?;

    let rgba = staged
        .image
        .as_ref()
        .ok_or(ToolError::Message("image staging absente en mémoire".into()))?
        .clone();

    // Le frontend envoie déjà des coords en pixels **physiques** (dérivées du
    // ratio réel viewport/monitor pour éviter tout drift de subpixel rendering).
    // On clamp directement dans les bornes de l'image.
    let img_w = rgba.width() as i64;
    let img_h = rgba.height() as i64;
    let cx = (x as i64).clamp(0, img_w.saturating_sub(1));
    let cy = (y as i64).clamp(0, img_h.saturating_sub(1));
    let cw = (width as i64).min(img_w - cx).max(1) as u32;
    let ch = (height as i64).min(img_h - cy).max(1) as u32;

    // crop_imm renvoie une SubImage view (zéro copie), to_image() copie juste la zone.
    let cropped =
        image::imageops::crop_imm(&*rgba, cx as u32, cy as u32, cw, ch).to_image();

    let (date, time) = now_date_time();
    let id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let now = chrono::Local::now();
    let name = now.format("capture_%d%m%y_%H%M%S").to_string();
    let hash = format!("cap_{}", id);

    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| ToolError::Message(e.to_string()))?;
    let img_dir = app_data.join("images");
    std::fs::create_dir_all(&img_dir).map_err(|e| e.to_string())?;
    let file_path = img_dir.join(format!("{}.png", hash));
    cropped.save(&file_path).map_err(|e| e.to_string())?;

    let clip = Clip {
        id,
        text: name,
        date,
        time,
        clip_type: "image".to_string(),
        pinned: false,
        hash: Some(hash),
        dims: Some(format!("{}x{}", cw, ch)),
        hue: Some(210),
        collection_id: None,
        sort_order: 0,
    };

    {
        let mut history = clip_state.clips.lock().expect("clips lock poisoned");
        history.insert(0, clip.clone());
        let removed = truncate_history(&mut history);
        for h in removed {
            delete_image_file(&app, &h);
        }
        save_history(&app, &history);
    }

    let _ = app.emit("clipboard://new-item", &clip);
    let _ = std::fs::remove_file(&staged.image_path);

    // Restaurer la fenêtre principale et notifier le frontend pour qu'il bascule
    // sur l'onglet Images.
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.unminimize();
        let _ = main.show();
        let _ = main.set_focus();
    }
    let _ = app.emit_to("main", "capture://done", ());

    Ok(())
}
