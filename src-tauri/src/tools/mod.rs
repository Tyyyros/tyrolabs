//! Registre des outils. Chaque sous-module est un outil isolé qui expose
//! ses commandes Tauri via `pub use commands::*` dans son `mod.rs`.

pub mod capture;
pub mod clipboard;
pub mod notes;
