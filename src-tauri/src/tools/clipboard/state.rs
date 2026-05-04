use crate::models::{Clip, Collection};
use std::sync::{Arc, Mutex};

/// Permet au frontend d'indiquer au watcher d'ignorer
/// la prochaine modification du presse-papiers (quand l'app copie elle-même).
pub struct SuppressState(pub Arc<Mutex<Option<String>>>);

/// État runtime de l'outil Clipboard.
pub struct ClipboardState {
    pub clips: Mutex<Vec<Clip>>,
    pub collections: Mutex<Vec<Collection>>,
}
