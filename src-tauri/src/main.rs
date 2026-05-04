#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Force per-monitor DPI awareness v2 avant tout : sans ça, sur les écrans
    // avec scale ≠ 100%, les API Win32 retournent des coords "virtualisées"
    // qui ne correspondent pas aux pixels physiques du screenshot, d'où des
    // décalages de 1-X pixels sur la sélection.
    #[cfg(windows)]
    unsafe {
        use windows::Win32::UI::HiDpi::{
            SetProcessDpiAwarenessContext, DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2,
        };
        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    }

    tyrolabs_toolbox_lib::run()
}
