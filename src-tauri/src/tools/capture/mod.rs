//! Outil Capture : screenshot du moniteur courant + overlay de sélection
//! (fenêtre ou région libre). Alimente l'historique du Clipboard.

pub mod commands;
pub mod state;
pub mod windows;

pub use commands::*;
pub use state::CaptureState;
