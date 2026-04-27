import { useMemo, useState } from "react";
import type { TextClip, ItemType } from "../../types";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";

interface CtxArgs {
  e: React.MouseEvent;
  item: TextClip;
  itemType: ItemType;
}

interface Props {
  links: TextClip[];
  onCtx: (a: CtxArgs) => void;
  onDoubleClick: (id: number, type: ItemType) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function extractInfo(text: string): { isUrl: boolean; label: string; sub: string } {
  try {
    const url = new URL(text);
    return { isUrl: true, label: url.hostname, sub: url.pathname + url.search };
  } catch {
    // Windows path — show last segment as label
    const parts = text.replace(/\\/g, "/").split("/").filter(Boolean);
    const last = parts[parts.length - 1] || text;
    return { isUrl: false, label: last, sub: text };
  }
}

export function LinksTab({ links, onCtx, onDoubleClick, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const [hov, setHov] = useState<number | null>(null);
  const sorted = useMemo(
    () => [...links.filter((c) => c.pinned), ...links.filter((c) => !c.pinned)],
    [links],
  );

  if (!sorted.length) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          color: C.t3,
        }}
      >
        <Ic.Link width={32} height={32} style={{ opacity: 0.25 }} />
        <span style={{ fontSize: 14 }}>Aucun lien</span>
        <span style={{ fontSize: 11, fontFamily: theme.fontMono }}>
          Copiez un lien ou un chemin de fichier
        </span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {sorted.map((clip) => {
        const info = extractInfo(clip.text);
        return (
          <div
            key={clip.id}
            onMouseEnter={() => setHov(clip.id)}
            onMouseLeave={() => setHov(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              onCtx({ e, item: clip, itemType: "link" });
            }}
            onMouseDown={() => onSelect(clip.id)}
            onDoubleClick={() => onDoubleClick(clip.id, "link")}
            style={{
              height: 44,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              gap: 10,
              background:
                selectedId === clip.id
                  ? "rgba(59,130,246,0.08)"
                  : hov === clip.id
                    ? C.rowHov
                    : "transparent",
              borderBottom: `1px solid ${C.borderDim}`,
              borderLeft:
                selectedId === clip.id ? `2px solid ${C.accent}` : "2px solid transparent",
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
                color: C.accent,
              }}
            >
              {info.isUrl ? (
                <Ic.Link width={12} height={12} strokeWidth={theme.iconStroke} />
              ) : (
                <Ic.Folder width={12} height={12} strokeWidth={theme.iconStroke} />
              )}
            </div>
            {clip.pinned && (
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
                {info.label}
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
                {info.sub}
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
              <span>{clip.date}</span>
              <span>{clip.time}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
