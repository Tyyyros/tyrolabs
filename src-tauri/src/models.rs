use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

fn default_origin() -> String {
    "text".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    #[serde(default = "default_origin")]
    pub origin_tab: String,
}

impl Collection {
    pub fn new(name: String, icon: String, color: String, origin_tab: String) -> Self {
        let id = format!(
            "col_{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        );
        Self { id, name, icon, color, origin_tab }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clip {
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dims: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hue: Option<u32>,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "group_id")]
    pub collection_id: Option<String>,
    #[serde(default)]
    pub sort_order: i32,
}

use chrono::Local;

pub fn now_date_time() -> (String, String) {
    let now = Local::now();
    (
        now.format("%d/%m").to_string(),
        now.format("%H:%M").to_string(),
    )
}
