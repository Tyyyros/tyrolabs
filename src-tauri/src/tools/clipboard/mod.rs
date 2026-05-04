//! Outil Clipboard : watcher du presse-papiers, historique, collections.

pub mod commands;
pub mod state;
pub mod storage;
pub mod watcher;

pub use commands::*;
pub use state::{ClipboardState, SuppressState};
pub use watcher::start_clipboard_watcher;
