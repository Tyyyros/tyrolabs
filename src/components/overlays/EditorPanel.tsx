import { useEffect, useState } from "react";
import type { TextClip, ItemType } from "../../types";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";
import { WinBtn } from "../layout/WinBtn";

type EditableItem = TextClip;

interface Props {
  item: EditableItem;
  itemType: ItemType;
  onSave: (id: number, text: string, itemType: ItemType) => void;
  onClose: () => void;
}

export function EditorPanel({ item, itemType, onSave, onClose }: Props) {
  const theme = useTheme();
  const initial = item.text || "";
  const [text, setText] = useState(initial);
  const [anim, setAnim] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setAnim(true));
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 540,
          background: "#0F0F12",
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.75)",
          opacity: anim ? 1 : 0,
          transform: anim ? "scale(1)" : "scale(0.96)",
          transition: "all 0.18s ease",
        }}
      >
        <div
          style={{
            padding: "12px 18px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Éditer {itemType === "link" ? "le lien" : "le texte"}
          </span>
          <WinBtn onClick={onClose} title="Fermer">
            <Ic.X width={16} height={16} strokeWidth={theme.iconStroke} />
          </WinBtn>
        </div>
        <div style={{ padding: "16px 18px" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              minHeight: 130,
              background: "#06060A",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.t1,
              fontSize: 13,
              fontFamily: theme.fontUI,
              padding: "10px 12px",
              outline: "none",
              resize: "vertical",
              lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
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
              Annuler
            </button>
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
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
