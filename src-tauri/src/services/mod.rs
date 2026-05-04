//! Services transverses, partagés entre tous les outils.
//! Pas de logique métier — uniquement de l'infrastructure
//! (persistance, system tray, primitives OS, etc.).

pub mod store;
pub mod system;
pub mod tray;
