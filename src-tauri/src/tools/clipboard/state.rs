use crate::models::{Clip, ClipboardSettings, Collection};
use std::sync::{Arc, Mutex};

/// Permet au frontend d'indiquer au watcher d'ignorer
/// la prochaine modification du presse-papiers (quand l'app copie elle-même).
#[derive(Default)]
pub struct SuppressNext {
    pub text: Option<String>,
    pub image_hash: Option<String>,
}

pub struct SuppressState(pub Arc<Mutex<SuppressNext>>);

/// État runtime de l'outil Clipboard.
///
/// Les collections sont cloisonnées par silo (text / image / link). Chaque silo
/// est totalement autonome — une opération sur l'un n'a aucun effet, même
/// invisible, sur les autres.
pub struct ClipboardState {
    pub clips: Mutex<Vec<Clip>>,
    pub settings: Mutex<ClipboardSettings>,
    pub text_collections: Mutex<Vec<Collection>>,
    pub image_collections: Mutex<Vec<Collection>>,
    pub link_collections: Mutex<Vec<Collection>>,
}
