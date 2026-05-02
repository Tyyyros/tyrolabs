use crate::models::WindowRect;
use windows::core::BOOL;
use windows::Win32::Foundation::{HWND, LPARAM, RECT};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowLongW, GetWindowRect, GetWindowTextW, IsWindowVisible, GWL_EXSTYLE,
    WS_EX_TOOLWINDOW,
};

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

extern "system" fn enum_window_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let windows = unsafe { &mut *(lparam.0 as *mut Vec<WindowRect>) };

    unsafe {
        if IsWindowVisible(hwnd).as_bool() {
            let mut rect = RECT::default();
            if GetWindowRect(hwnd, &mut rect).is_ok() {
                let width = rect.right - rect.left;
                let height = rect.bottom - rect.top;

                // Filter out empty or too small windows
                if width > 10 && height > 10 {
                    // Filter out tool windows
                    let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
                    if (ex_style as u32 & WS_EX_TOOLWINDOW.0) == 0 {
                        let mut text: [u16; 512] = [0; 512];
                        let len = GetWindowTextW(hwnd, &mut text);
                        let title = if len > 0 {
                            String::from_utf16_lossy(&text[..len as usize])
                        } else {
                            "".to_string()
                        };

                        windows.push(WindowRect {
                            x: rect.left,
                            y: rect.top,
                            width,
                            height,
                            title,
                        });
                    }
                }
            }
        }
    }

    BOOL::from(true)
}
