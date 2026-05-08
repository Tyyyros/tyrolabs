import { useEffect, useState } from "react";
import { C } from "../../lib/colors";
import { useTheme } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import type { StringKey } from "../../lib/strings";
import { Ic } from "../icons";
import type { CollectionSilo } from "../../types";

const SILO_LABEL_KEY: Record<CollectionSilo, StringKey> = {
  text: "collections.silo.text",
  image: "collections.silo.image",
  link: "collections.silo.link",
};

const PRESET_COLORS = [
  "#3B82F6", "#22C55E", "#F59E0B", "#EF4444",
  "#A78BFA", "#F472B6", "#06B6D4", "#84CC16",
];

const PRESET_ICONS = [
  "📝", "📁", "🔗", "⭐", "🎯", "💡", "🔧", "📌",
  "🎨", "📊", "🚀", "💬", "📋", "🗂️", "🏷️", "✨",
];

export function CreateCollectionModal({
  open,
  silo,
  onClose,
  onCreate,
}: {
  open: boolean;
  silo: CollectionSilo | null;
  onClose: () => void;
  onCreate: (name: string, icon: string, color: string) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("#3B82F6");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), icon, color);
    setName("");
    setIcon("📁");
    setColor("#3B82F6");
    onClose();
  };

  const [anim, setAnim] = useState(false);
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setAnim(true));
    } else {
      setAnim(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        opacity: anim ? 1 : 0,
        transition: "opacity 0.18s ease-out",
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: anim ? "scale(1) translateY(0)" : "scale(0.92) translateY(10px)",
            opacity: anim ? 1 : 0,
            transition: "all 0.18s ease-out",
            width: 340,
            background: "var(--bg)",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.t1 }}>
              {t("collections.create.title")}
              {silo && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    color: C.t3,
                    fontFamily: theme.fontMono,
                    letterSpacing: "0.02em",
                  }}
                >
                  — {t(SILO_LABEL_KEY[silo])}
                </span>
              )}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: C.t3,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Ic.X width={16} height={16} strokeWidth={theme.iconStroke} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name */}
            <div>
              <label style={{ fontSize: 11, color: C.t2, marginBottom: 5, display: "block" }}>{t("collections.create.name")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder={t("collections.create.name.placeholder")}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                style={{
                  width: "100%",
                  height: 34,
                  background: "var(--row-hov)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  color: C.t1,
                  fontSize: 13,
                  fontFamily: theme.fontUI,
                  padding: "0 10px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Icon */}
            <div>
              <label style={{ fontSize: 11, color: C.t2, marginBottom: 5, display: "block" }}>{t("collections.create.icon")}</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {PRESET_ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 5,
                      border: icon === ic ? `2px solid ${color}` : `1px solid ${C.border}`,
                      background: icon === ic ? `${color}15` : "transparent",
                      fontSize: 15,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.1s",
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label style={{ fontSize: 11, color: C.t2, marginBottom: 5, display: "block" }}>{t("collections.create.color")}</label>
              <div style={{ display: "flex", gap: 6 }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: c,
                      border: color === c ? "2px solid white" : "2px solid transparent",
                      cursor: "pointer",
                      transition: "border 0.1s",
                      boxShadow: color === c ? `0 0 8px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 7,
                border: `1px solid ${color}40`,
                background: `${color}08`,
              }}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 12, color: C.t1, fontFamily: theme.fontUI }}>
                {name || t("collections.create.preview")}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 24, padding: "0 18px 18px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: C.t2,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {t("collections.create.cancel")}
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              style={{
                padding: "8px 16px",
                background: name.trim() ? color : "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: name.trim() ? "pointer" : "not-allowed",
                fontSize: 13,
                fontWeight: 600,
                transition: "background 0.2s",
              }}
            >
              {t("collections.create.confirm")}
            </button>
          </div>
        </div>
      </div>
  );
}
