use crate::models::{Collection, Note};
use std::sync::Mutex;

/// État runtime de l'outil Notes.
///
/// Un seul silo de collections (contrairement à Clipboard qui en a trois) :
/// les notes sont mono-type. Les médias sont stockés à part dans
/// `<app_data>/notes_assets/`.
pub struct NotesState {
    pub notes: Mutex<Vec<Note>>,
    pub collections: Mutex<Vec<Collection>>,
}
