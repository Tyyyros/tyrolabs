use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

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
