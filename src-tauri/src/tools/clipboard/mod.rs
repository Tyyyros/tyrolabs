//! Outil Clipboard : watcher du presse-papiers, historique, collections.

pub mod commands;
pub mod state;
pub mod storage;
pub mod watcher;
#[cfg(windows)]
pub mod win_files;

pub use commands::*;
pub use state::{ClipboardState, SuppressNext, SuppressState};
pub use watcher::start_clipboard_watcher;
