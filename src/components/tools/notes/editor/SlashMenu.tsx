import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { Editor, Range } from "@tiptap/core";
import type { ReactNode } from "react";

import { useTheme } from "../../../../lib/theme";
import { C, hexToRgba } from "../../../../lib/colors";

export interface SlashItem {
  title: string;
  description: string;
  icon: ReactNode;
  shortcut?: string;
  /** Applies the command on the TipTap editor at the given range
   *  (the range covers the `/<query>` typed by the user — the extension
   *  removes it before invoking this command). */
  command: (args: { editor: Editor; range: Range }) => void;
}

/** Click handler resolved at render time by the slash menu wrapper. */
export type SlashSelectHandler = (item: SlashItem) => void;

export interface SlashMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface Props {
  items: SlashItem[];
  onSelect: SlashSelectHandler;
}

export const SlashMenu = forwardRef<SlashMenuRef, Props>(({ items, onSelect }, ref) => {
  const theme = useTheme();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setSelected(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown(event) {
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((s) => (s - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selected];
        if (item) onSelect(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div
        style={{
          padding: 8,
          background: "var(--bg)",
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          color: C.t3,
          fontSize: 11.5,
          fontFamily: theme.fontUI,
          boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        }}
      >
        Aucune commande
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--bg)",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 4,
        minWidth: 240,
        maxHeight: 280,
        overflowY: "auto",
        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        fontFamily: theme.fontUI,
      }}
    >
      {items.map((item, i) => {
        const active = i === selected;
        return (
          <div
            key={item.title}
            onMouseEnter={() => setSelected(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 10px",
              borderRadius: 5,
              cursor: "pointer",
              background: active ? hexToRgba(theme.accent, 0.18) : "transparent",
              color: active ? theme.accent : C.t1,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: 5,
                background: active ? hexToRgba(theme.accent, 0.2) : C.rowHov,
                color: active ? theme.accent : C.t2,
                flexShrink: 0,
              }}
            >
              {item.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{item.title}</div>
              <div
                style={{
                  fontSize: 10.5,
                  color: active ? hexToRgba(theme.accent, 0.7) : C.t3,
                  marginTop: 1,
                }}
              >
                {item.description}
              </div>
            </div>
            {item.shortcut && (
              <span
                style={{
                  fontFamily: theme.fontMono,
                  fontSize: 9.5,
                  color: active ? hexToRgba(theme.accent, 0.85) : C.t3,
                  letterSpacing: "0.04em",
                }}
              >
                {item.shortcut}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

SlashMenu.displayName = "SlashMenu";
