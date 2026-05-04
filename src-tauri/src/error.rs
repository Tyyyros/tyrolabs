use serde::{Serialize, Serializer};
use std::fmt;

/// Erreur unifiée renvoyée par toutes les commandes Tauri.
/// Sérialisée en simple string côté frontend.
#[derive(Debug)]
#[allow(dead_code)] // certaines variantes seront consommées par des outils à venir
pub enum ToolError {
    Message(String),
    Io(std::io::Error),
    Serde(serde_json::Error),
    Tauri(tauri::Error),
    InvalidInput(String),
    NotFound(String),
}

impl fmt::Display for ToolError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ToolError::Message(s) => write!(f, "{s}"),
            ToolError::Io(e) => write!(f, "I/O: {e}"),
            ToolError::Serde(e) => write!(f, "serialization: {e}"),
            ToolError::Tauri(e) => write!(f, "tauri: {e}"),
            ToolError::InvalidInput(s) => write!(f, "invalid input: {s}"),
            ToolError::NotFound(s) => write!(f, "not found: {s}"),
        }
    }
}

impl std::error::Error for ToolError {}

impl Serialize for ToolError {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

impl From<String> for ToolError {
    fn from(s: String) -> Self { Self::Message(s) }
}
impl From<&str> for ToolError {
    fn from(s: &str) -> Self { Self::Message(s.to_string()) }
}
impl From<std::io::Error> for ToolError {
    fn from(e: std::io::Error) -> Self { Self::Io(e) }
}
impl From<serde_json::Error> for ToolError {
    fn from(e: serde_json::Error) -> Self { Self::Serde(e) }
}
impl From<tauri::Error> for ToolError {
    fn from(e: tauri::Error) -> Self { Self::Tauri(e) }
}

pub type ToolResult<T> = Result<T, ToolError>;
