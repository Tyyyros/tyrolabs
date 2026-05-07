//! Énumération des top-level windows en z-order (la plus haute en premier),
//! avec rect **visible** (frame DWM, sans l'ombre invisible) et détection
//! des éléments shell Windows (taskbar, Start, Search, etc.).

use crate::models::WindowRect;
use std::ffi::c_void;
use windows::core::BOOL;
use windows::Win32::Foundation::{HWND, LPARAM, RECT};
use windows::Win32::Graphics::Dwm::{
    DwmGetWindowAttribute, DWMWA_CLOAKED, DWMWA_EXTENDED_FRAME_BOUNDS,
};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetClassNameW, GetWindow, GetWindowLongW, GetWindowRect, GetWindowTextW, IsIconic,
    IsWindowVisible, GWL_EXSTYLE, GW_OWNER, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
};

/// Classes de fenêtres shell qu'on veut **toujours** inclure même si elles
/// sont marquées tool-window, sans titre, ou owned.
const SHELL_CLASSES: &[&str] = &[
    "Shell_TrayWnd",              // barre des tâches principale
    "Shell_SecondaryTrayWnd",     // barre des tâches sur écran secondaire
    "Windows.UI.Core.CoreWindow", // Start, Search, Cortana, Action Center, notif
    "ApplicationFrameWindow",     // host UWP (Calc, Photos, Settings, etc.)
];

/// Retourne les top-level windows visibles à l'utilisateur, du plus haut z-order
/// au plus bas. Coordonnées en **virtual desktop absolu**.
pub fn get_open_windows() -> Vec<WindowRect> {
    let mut windows: Vec<WindowRect> = Vec::new();

    unsafe {
        let _ = EnumWindows(
            Some(enum_window_callback),
            LPARAM(&mut windows as *mut _ as isize),
        );
    }

    windows
}

unsafe fn class_name(hwnd: HWND) -> String {
    let mut buf = [0u16; 256];
    let len = GetClassNameW(hwnd, &mut buf);
    if len > 0 {
        String::from_utf16_lossy(&buf[..len as usize])
    } else {
        String::new()
    }
}

unsafe fn window_title(hwnd: HWND) -> String {
    let mut buf = [0u16; 512];
    let len = GetWindowTextW(hwnd, &mut buf);
    if len > 0 {
        String::from_utf16_lossy(&buf[..len as usize])
    } else {
        String::new()
    }
}

/// Récupère le rect *visible* d'une fenêtre (sans l'ombre DWM Win10/11).
/// Fallback sur GetWindowRect si DWM échoue.
unsafe fn visible_frame(hwnd: HWND) -> Option<RECT> {
    let mut frame = RECT::default();
    let res = DwmGetWindowAttribute(
        hwnd,
        DWMWA_EXTENDED_FRAME_BOUNDS,
        &mut frame as *mut _ as *mut c_void,
        std::mem::size_of::<RECT>() as u32,
    );
    if res.is_ok() {
        return Some(frame);
    }
    let mut r = RECT::default();
    GetWindowRect(hwnd, &mut r).ok().map(|_| r)
}

fn friendly_title(class: &str, current_title: &str) -> String {
    if !current_title.is_empty() {
        return current_title.to_string();
    }
    match class {
        "Shell_TrayWnd" => "Barre des tâches".into(),
        "Shell_SecondaryTrayWnd" => "Barre des tâches (écran secondaire)".into(),
        "Windows.UI.Core.CoreWindow" => "Élément Windows".into(),
        "ApplicationFrameWindow" => "Application Windows".into(),
        _ => String::new(),
    }
}

extern "system" fn enum_window_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let windows = unsafe { &mut *(lparam.0 as *mut Vec<WindowRect>) };

    unsafe {
        // Filtres durs : non-visible, minimisé, ou cloaked.
        if !IsWindowVisible(hwnd).as_bool() || IsIconic(hwnd).as_bool() {
            return BOOL::from(true);
        }
        let mut cloaked = 0u32;
        let _ = DwmGetWindowAttribute(
            hwnd,
            DWMWA_CLOAKED,
            &mut cloaked as *mut _ as *mut c_void,
            std::mem::size_of::<u32>() as u32,
        );
        if cloaked != 0 {
            return BOOL::from(true);
        }

        let class = class_name(hwnd);
        let is_shell = SHELL_CLASSES.iter().any(|c| *c == class);
        let title = window_title(hwnd);

        // Pour les fenêtres normales : exiger un titre + filtrer tool-window/owned.
        // Pour les fenêtres shell : bypass.
        if !is_shell {
            if title.is_empty() {
                return BOOL::from(true);
            }
            let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
            let is_tool_window = (ex_style & WS_EX_TOOLWINDOW.0) != 0;
            let is_app_window = (ex_style & WS_EX_APPWINDOW.0) != 0;
            let has_owner = GetWindow(hwnd, GW_OWNER)
                .map(|h| h.0 as isize != 0)
                .unwrap_or(false);
            if is_tool_window || (has_owner && !is_app_window) {
                return BOOL::from(true);
            }
        }

        let Some(rect) = visible_frame(hwnd) else {
            return BOOL::from(true);
        };
        let width = rect.right - rect.left;
        let height = rect.bottom - rect.top;
        if width <= 10 || height <= 10 {
            return BOOL::from(true);
        }

        let final_title = friendly_title(&class, &title);
        if final_title.is_empty() {
            // Fenêtre shell sans label connu : on l'ignore plutôt que d'afficher rien.
            return BOOL::from(true);
        }

        windows.push(WindowRect {
            x: rect.left,
            y: rect.top,
            width,
            height,
            title: final_title,
        });
    }

    BOOL::from(true)
}
