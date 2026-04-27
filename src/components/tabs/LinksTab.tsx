import { useMemo, useState } from "react";
import type { LinkClip, ItemType } from "../../types";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";

interface CtxArgs {
  e: React.MouseEvent;
  item: LinkClip;
  itemType: ItemType;
}

interface Props {
  links: LinkClip[];
  onCtx: (a: CtxArgs) => void;
  onDoubleClick: (id: number, type: ItemType) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function LinksTab({ links, onCtx, onDoubleClick, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const [hov, setHov] = useState<number | null>(null);
  const sorted = useMemo(
    () => [...links.filter((c) => c.pinned), ...links.filter((c) => !c.pinned)],
    [links],
  );

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {sorted.map((link) => (
        <div
          key={link.id}
          onMouseEnter={() => setHov(link.id)}
          onMouseLeave={() => setHov(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            onCtx({ e, item: link, itemType: "link" });
          }}
          onClick={() => onSelect(link.id)}
          onDoubleClick={() => onDoubleClick(link.id, "link")}
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: 10,
            background:
              selectedId === link.id
                ? "rgba(59,130,246,0.08)"
                : hov === link.id
                  ? C.rowHov
                  : "transparent",
            borderBottom: `1px solid ${C.borderDim}`,
            borderLeft: selectedId === link.id ? `2px solid ${C.accent}` : "2px solid transparent",
            cursor: "default",
            transition: "background 0.08s",
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              flexShrink: 0,
              background: `${C.accent}18`,
              border: `1px solid ${C.accent}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 7.5,
              color: C.accent,
              fontFamily: theme.fontMono,
              fontWeight: 600,
            }}
          >
            {link.sig}
          </div>
          {link.pinned && (
            <div style={{ color: C.accent }}>
              <Ic.PinFill width={10} height={10} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                color: C.t1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {link.title}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.t2,
                fontFamily: theme.fontMono,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 2,
              }}
            >
              {link.url}
            </div>
          </div>
          <span
            style={{
              fontFamily: theme.fontMono,
              fontSize: 9.5,
              color: "#A1A1AA",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              lineHeight: 1.35,
            }}
          >
            <span>{link.date}</span>
            <span>{link.time}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
