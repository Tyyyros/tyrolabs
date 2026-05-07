//! Outil Notes : éditeur hybride RTE/Markdown avec collections et médias.

pub mod commands;
pub mod media;
pub mod state;
pub mod storage;

pub use commands::*;
pub use state::NotesState;
