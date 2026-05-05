use crate::models::{Clip, Collection};
use std::sync::{Arc, Mutex};

/// Permet au frontend d'indiquer au watcher d'ignorer
/// la prochaine modification du presse-papiers (quand l'app copie elle-même).
pub struct SuppressState(pub Arc<Mutex<Option<String>>>);

/// État runtime de l'outil Clipboard.
///
/// Les collections sont cloisonnées par silo (text / image / link). Chaque silo
/// est totalement autonome — une opération sur l'un n'a aucun effet, même
/// invisible, sur les autres.
pub struct ClipboardState {
    pub clips: Mutex<Vec<Clip>>,
    pub text_collections: Mutex<Vec<Collection>>,
    pub image_collections: Mutex<Vec<Collection>>,
    pub link_collections: Mutex<Vec<Collection>>,
}
