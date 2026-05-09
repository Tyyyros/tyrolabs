//! Helpers Windows pour combler les lacunes d'`arboard` :
//!
//! - **CF_HDROP** : liste de fichiers (Ctrl+C dans l'Explorateur).
//! - **Formats custom `PNG` / `image/png`** : utilisés par les apps modernes
//!   (browsers, Notion, Claude, Slack, Discord, web apps) qui mettent un
//!   PNG-stream brut au lieu de — ou en plus de — CF_DIB. arboard ne lit
//!   que CF_DIB/CF_DIBV5 ; on lit ces formats à la main et on retombe sur
//!   le pipeline image standard via `image::load_from_memory`.

#![cfg(windows)]

use std::path::PathBuf;

use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::{HGLOBAL, HWND};
use windows::Win32::System::DataExchange::{
    CloseClipboard, GetClipboardData, IsClipboardFormatAvailable, OpenClipboard,
    RegisterClipboardFormatW,
};
use windows::Win32::System::Memory::{GlobalLock, GlobalSize, GlobalUnlock};
use windows::Win32::System::Ole::CF_HDROP;
use windows::Win32::UI::Shell::{DragQueryFileW, HDROP};

const IMAGE_EXTS: &[&str] = &[
    "png", "jpg", "jpeg", "jfif", "gif", "webp", "bmp", "tif", "tiff",
];

fn has_image_ext(path: &std::path::Path) -> bool {
    match path.extension().and_then(|e| e.to_str()) {
        Some(ext) => IMAGE_EXTS
            .iter()
            .any(|known| known.eq_ignore_ascii_case(ext)),
        None => false,
    }
}

/// Renvoie les chemins de fichiers image actuellement dans le presse-papier
/// (CF_HDROP). Vide si le format n'est pas présent ou si aucun fichier n'est
/// une image. Sans IO disque — on ne fait que parser la liste.
pub fn get_clipboard_image_files() -> Vec<PathBuf> {
    let mut paths: Vec<PathBuf> = Vec::new();

    unsafe {
        // Vérification rapide : le format CF_HDROP est-il présent ?
        if IsClipboardFormatAvailable(CF_HDROP.0 as u32).is_err() {
            return paths;
        }

        // OpenClipboard avec HWND null = on prend ownership "libre".
        // Si une autre app détient le presse-papier, ça échoue silencieusement.
        if OpenClipboard(Some(HWND::default())).is_err() {
            return paths;
        }

        let handle = match GetClipboardData(CF_HDROP.0 as u32) {
            Ok(h) => h,
            Err(_) => {
                let _ = CloseClipboard();
                return paths;
            }
        };

        let hdrop = HDROP(handle.0);

        // 0xFFFFFFFF demande le nombre total de fichiers.
        let count = DragQueryFileW(hdrop, 0xFFFFFFFF, None);
        for i in 0..count {
            // Premier appel : longueur (sans le \0 final).
            let len = DragQueryFileW(hdrop, i, None);
            if len == 0 {
                continue;
            }
            // Buffer de longueur len+1 pour le \0.
            let mut buf = vec![0u16; (len as usize) + 1];
            let written = DragQueryFileW(hdrop, i, Some(&mut buf));
            if written == 0 {
                continue;
            }
            buf.truncate(written as usize);
            let path_str = String::from_utf16_lossy(&buf);
            paths.push(PathBuf::from(path_str));
        }

        let _ = CloseClipboard();
    }

    paths.into_iter().filter(|p| has_image_ext(p)).collect()
}

/// Tente de lire les bytes d'une image encodée sur le presse-papier via
/// l'un des formats custom courants (PNG, JPEG, GIF, WebP, BMP, TIFF).
/// Renvoie `None` si aucun n'est présent ou si la lecture échoue. Les
/// bytes sont le contenu binaire prêt à passer à `image::load_from_memory`,
/// qui détecte le format réel via les magic bytes — l'ordre des candidats
/// privilégie juste les formats les plus courants en premier.
///
/// Pourquoi ce détour : les apps modernes (browsers, Notion, Claude,
/// Slack, Discord, web apps via HTML5 Clipboard API) écrivent souvent
/// l'image sous un format custom au lieu de — ou en plus de — CF_DIB.
/// `arboard::get_image()` ne lit que CF_DIB/CF_DIBV5 et rate ces cas.
pub fn get_clipboard_image_bytes() -> Option<Vec<u8>> {
    // PNG et image/png en tête : c'est ce que la majorité des apps Web et
    // Electron mettent. Les autres sont des fallbacks pour apps legacy ou
    // apps qui copient directement le format source (JPEG photo, GIF…).
    let candidates: &[PCWSTR] = &[
        w!("PNG"),
        w!("image/png"),
        w!("image/jpeg"),
        w!("JFIF"),
        w!("image/gif"),
        w!("GIF"),
        w!("image/webp"),
        w!("image/bmp"),
        w!("image/tiff"),
    ];

    for &name in candidates {
        let id = unsafe { RegisterClipboardFormatW(name) };
        if id == 0 {
            continue;
        }
        let available = unsafe { IsClipboardFormatAvailable(id) }.is_ok();
        if !available {
            continue;
        }
        if let Some(bytes) = unsafe { read_clipboard_format_bytes(id) } {
            if !bytes.is_empty() {
                return Some(bytes);
            }
        }
    }

    None
}

/// Lit le contenu brut d'un format clipboard arbitraire (par id). La
/// fonction gère ouverture/fermeture du presse-papier et le verrouillage
/// global. Doit rester `unsafe` car elle interagit avec des handles et
/// pointeurs Windows.
unsafe fn read_clipboard_format_bytes(format_id: u32) -> Option<Vec<u8>> {
    if OpenClipboard(Some(HWND::default())).is_err() {
        return None;
    }

    let handle = match GetClipboardData(format_id) {
        Ok(h) => h,
        Err(_) => {
            let _ = CloseClipboard();
            return None;
        }
    };

    let hglobal = HGLOBAL(handle.0);
    let size = GlobalSize(hglobal);
    if size == 0 {
        let _ = CloseClipboard();
        return None;
    }

    let ptr = GlobalLock(hglobal) as *const u8;
    if ptr.is_null() {
        let _ = CloseClipboard();
        return None;
    }

    let bytes = std::slice::from_raw_parts(ptr, size).to_vec();
    let _ = GlobalUnlock(hglobal);
    let _ = CloseClipboard();
    Some(bytes)
}
