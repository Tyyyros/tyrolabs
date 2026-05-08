//! État runtime de l'outil Capture.
//!
//! Au moment où l'utilisateur déclenche une capture, on prend un screenshot
//! du moniteur courant et on le stocke ici (chemin sur disque + liste des
//! fenêtres en coordonnées **locales au moniteur**). L'overlay le consomme
//! ensuite via `get_capture_data`.

use crate::models::WindowRect;
use image::RgbaImage;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CaptureMode {
    #[default]
    Image,
    Ocr,
}

#[derive(Clone, Serialize)]
pub struct MonitorRect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale: f64,
}

#[derive(Clone, Serialize)]
pub struct StagedCapture {
    /// Chemin absolu du PNG du moniteur capturé (consommé par l'overlay frontend).
    pub image_path: String,
    /// Fenêtres en **coordonnées locales** au moniteur capturé, en z-order top-first.
    pub windows: Vec<WindowRect>,
    pub monitor: MonitorRect,
    /// Mode déclenché côté sidebar : `image` → `save_capture_area`, `ocr` → `ocr_capture_area`.
    pub mode: CaptureMode,
    /// Image RGBA en mémoire pour découpage rapide dans `save_capture_area`
    /// (évite un re-décodage PNG depuis le disque). Non sérialisé vers le frontend.
    #[serde(skip)]
    pub image: Option<Arc<RgbaImage>>,
}

#[derive(Default)]
pub struct CaptureState {
    pub staging: Mutex<Option<StagedCapture>>,
}
