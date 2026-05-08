import { useEffect, useState } from "react";
import type { AnyClip, ItemType } from "../../types";
import { useTheme } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { C } from "../../lib/colors";
import { Ic } from "../icons";
import { WinBtn } from "../layout/WinBtn";

type EditableItem = AnyClip;

interface Props {
  item: EditableItem;
  itemType: ItemType;
  onSave: (id: number, text: string, itemType: ItemType, copyAfter?: boolean) => void;
  onClose: () => void;
}

export function EditorPanel({ item, itemType, onSave, onClose }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const initial = item.text || "";
  const [text, setText] = useState(initial);
  const [anim, setAnim] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setAnim(true));
  }, []);

  const handleClean = () => setText((t) => t.split('\n').map(l => l.trim()).filter(Boolean).join('\n'));
  const handleUpper = () => setText((t) => t.toUpperCase());
  const handleLower = () => setText((t) => t.toLowerCase());
  const handleTrim = () => setText((t) => t.replace(/[ \t]+/g, ' ').trim());

  return (
    <div
      style={{
        flexShrink: 0,
        background: "var(--bg)",
        borderTop: `1px solid ${C.border}`,
        boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
        transform: anim ? "translateY(0)" : "translateY(20px)",
        opacity: anim ? 1 : 0,
        transition: "all 0.2s ease-out",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
      }}
    >
        <div
          style={{
            padding: "10px 18px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {itemType === "image" ? t("editor.title.image") : itemType === "link" ? t("editor.title.link") : t("editor.title.text")}
          </span>
          <WinBtn onClick={onClose} title={t("common.close")}>
            <Ic.X width={16} height={16} strokeWidth={theme.iconStroke} />
          </WinBtn>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              minHeight: itemType === "image" ? 40 : 140,
              background: "var(--sidebar)",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.t1,
              fontSize: 13,
              fontFamily: theme.fontUI,
              padding: "10px 12px",
              outline: "none",
              resize: itemType === "image" ? "none" : "vertical",
              lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={handleClean}
                title={t("editor.tool.clean")}
                style={{
                  padding: "6px 8px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 4,
                  color: C.t2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.t1)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.t2)}
              >
                <Ic.Wand width={18} height={18} strokeWidth={theme.iconStroke} />
              </button>
              <button
                onClick={handleUpper}
                title={t("editor.tool.upper")}
                style={{
                  padding: "6px 8px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 4,
                  color: C.t2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.t1)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.t2)}
              >
                <Ic.CaseUpper width={18} height={18} strokeWidth={theme.iconStroke} />
              </button>
              <button
                onClick={handleLower}
                title={t("editor.tool.lower")}
                style={{
                  padding: "6px 8px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 4,
                  color: C.t2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.t1)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.t2)}
              >
                <Ic.CaseLower width={18} height={18} strokeWidth={theme.iconStroke} />
              </button>
              <button
                onClick={handleTrim}
                title={t("editor.tool.trim")}
                style={{
                  padding: "6px 8px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 4,
                  color: C.t2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.t1)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.t2)}
              >
                <Ic.AlignLeft width={18} height={18} strokeWidth={theme.iconStroke} />
              </button>
            </div>
            
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  padding: "7px 18px",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 5,
                  color: C.t2,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {t("editor.cancel")}
              </button>
              {itemType !== "image" && (
                <button
                  onClick={() => {
                    onSave(item.id, text, itemType, true);
                    onClose();
                  }}
                  style={{
                    padding: "7px 18px",
                    background: C.accentDim,
                    border: `1px solid ${C.accent}`,
                    borderRadius: 5,
                    color: C.accent,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {t("editor.save.copy")}
                </button>
              )}
              <button
                onClick={() => {
                  onSave(item.id, text, itemType);
                  onClose();
                }}
                style={{
                  padding: "7px 18px",
                  background: C.accent,
                  border: `1px solid ${C.accent}`,
                  borderRadius: 5,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {t("editor.save")}
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
