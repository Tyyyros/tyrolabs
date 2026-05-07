use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

pub const DEFAULT_CAPTURE_ENABLED: bool = true;
pub const DEFAULT_MAX_HISTORY: usize = 200;
pub const MIN_MAX_HISTORY: usize = 100;
pub const MAX_MAX_HISTORY: usize = 5000;

fn default_capture_enabled() -> bool {
    DEFAULT_CAPTURE_ENABLED
}

fn default_max_history() -> usize {
    DEFAULT_MAX_HISTORY
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardSettings {
    #[serde(default = "default_capture_enabled")]
    pub capture_enabled: bool,
    #[serde(default = "default_max_history")]
    pub max_history: usize,
}

impl Default for ClipboardSettings {
    fn default() -> Self {
        Self {
            capture_enabled: DEFAULT_CAPTURE_ENABLED,
            max_history: DEFAULT_MAX_HISTORY,
        }
    }
}

impl ClipboardSettings {
    pub fn normalized(mut self) -> Self {
        self.max_history = self.max_history.clamp(MIN_MAX_HISTORY, MAX_MAX_HISTORY);
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
}

impl Collection {
    pub fn new(name: String, icon: String, color: String) -> Self {
        let id = format!(
            "col_{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        );
        Self {
            id,
            name,
            icon,
            color,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Clip {
    pub id: u64,
    #[serde(default)]
    pub text: String,
    pub date: String,
    pub time: String,
    #[serde(rename = "type")]
    pub clip_type: String,

    #[serde(default)]
    pub pinned: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dims: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hue: Option<u32>,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection_id: Option<String>,
    #[serde(default)]
    pub sort_order: i32,
}

#[derive(Deserialize)]
struct ClipJson {
    pub id: u64,
    #[serde(default)]
    pub text: String,
    pub date: String,
    pub time: String,
    #[serde(rename = "type")]
    pub clip_type: String,
    #[serde(default)]
    pub fav: bool,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub hash: Option<String>,
    #[serde(default)]
    pub dims: Option<String>,
    #[serde(default)]
    pub hue: Option<u32>,
    #[serde(default)]
    #[serde(rename = "group_id", alias = "collection_id")]
    pub collection_id: Option<String>,
    #[serde(default)]
    pub sort_order: i32,
}

impl<'de> Deserialize<'de> for Clip {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let raw = ClipJson::deserialize(deserializer)?;

        Ok(Self {
            id: raw.id,
            text: raw.text,
            date: raw.date,
            time: raw.time,
            clip_type: raw.clip_type,
            pinned: raw.pinned || raw.fav,
            hash: raw.hash,
            dims: raw.dims,
            hue: raw.hue,
            collection_id: raw.collection_id,
            sort_order: raw.sort_order,
        })
    }
}

use chrono::Local;

// ── Notes ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NoteFormat {
    RichText,
    Markdown,
}

impl Default for NoteFormat {
    fn default() -> Self {
        NoteFormat::Markdown
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub format: NoteFormat,
    #[serde(default)]
    pub body: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub date: String,
    pub time: String,
    #[serde(default)]
    pub updated_at: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_ext: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub collection_id: Option<String>,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub sort_order: i32,
}

impl Note {
    pub fn new(title: String, format: NoteFormat, collection_id: Option<String>) -> Self {
        let (date, time) = now_date_time();
        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        Self {
            id: format!("note_{now_ms}"),
            title,
            format,
            body: String::new(),
            tags: Vec::new(),
            date,
            time,
            updated_at: now_ms as u64,
            cover_hash: None,
            cover_ext: None,
            collection_id,
            pinned: false,
            sort_order: 0,
        }
    }
}

/// Patch partiel pour `update_note` — chaque champ est optionnel.
/// Pour effacer `cover_hash` ou `collection_id`, passer la chaîne vide "".
#[derive(Debug, Clone, Default, Deserialize)]
pub struct NotePatch {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub format: Option<NoteFormat>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub cover_hash: Option<String>,
    #[serde(default)]
    pub cover_ext: Option<String>,
    #[serde(default)]
    pub collection_id: Option<String>,
    #[serde(default)]
    pub pinned: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WindowRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub title: String,
}

pub fn now_date_time() -> (String, String) {
    let now = Local::now();
    (
        now.format("%d/%m").to_string(),
        now.format("%H:%M").to_string(),
    )
}

#[cfg(test)]
mod tests {
    use super::Clip;

    #[test]
    fn deserializes_legacy_fav_into_pinned_without_reserializing_fav() {
        let clip: Clip = serde_json::from_str(
            r#"{
                "id": 1,
                "text": "legacy",
                "date": "01/01",
                "time": "10:00",
                "type": "text",
                "fav": true,
                "pinned": false
            }"#,
        )
        .expect("legacy clip should deserialize");

        assert!(clip.pinned);

        let serialized = serde_json::to_value(&clip).expect("clip should serialize");
        assert!(serialized.get("fav").is_none());
    }

    #[test]
    fn serializes_collection_id_and_accepts_legacy_group_id() {
        let clip: Clip = serde_json::from_str(
            r#"{
                "id": 2,
                "text": "grouped",
                "date": "01/01",
                "time": "10:00",
                "type": "text",
                "group_id": "col_1"
            }"#,
        )
        .expect("legacy group_id should deserialize");

        assert_eq!(clip.collection_id.as_deref(), Some("col_1"));

        let serialized = serde_json::to_value(&clip).expect("clip should serialize");
        assert_eq!(
            serialized.get("collection_id").and_then(|v| v.as_str()),
            Some("col_1")
        );
        assert!(serialized.get("group_id").is_none());
    }
}
