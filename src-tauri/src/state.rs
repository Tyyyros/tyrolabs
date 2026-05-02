use crate::models::{Clip, Collection};
use std::sync::{Arc, Mutex};

/// Shared state to let the frontend tell the watcher to ignore
/// the next clipboard change (when the app itself copies text).
pub struct SuppressState(pub Arc<Mutex<Option<String>>>);

pub struct AppState {
    pub clips: Mutex<Vec<Clip>>,
    pub collections: Mutex<Vec<Collection>>,
}
