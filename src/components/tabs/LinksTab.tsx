import { useMemo, useState } from "react";
import type { TextClip, ItemType, Theme } from "../../types";
import { useTheme } from "../../lib/theme";
import { C, hexToRgba } from "../../lib/colors";
import { Ic } from "../icons";
import { useDraggable } from "@dnd-kit/core";

interface CtxArgs {
  e: React.MouseEvent;
  item: TextClip;
  itemType: ItemType;
}

interface Props {
  links: TextClip[];
  onCtx: (a: CtxArgs) => void;
  onDoubleClick: (id: number, type: ItemType) => void;
  selection: Set<number>;
  onSelect: (id: number, e: React.MouseEvent, list: TextClip[]) => void;
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

export function LinksTab({ links, onCtx, onDoubleClick, selection, onSelect }: Props) {
  const theme = useTheme();
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
      {sorted.map((clip, i) => {
        const info = extractInfo(clip.text);
        return (
          <LinkRow
            key={clip.id}
            clip={clip}
            info={info}
            onCtx={onCtx}
            onDoubleClick={onDoubleClick}
            selected={selection.has(clip.id)}
            onSelect={(id, e) => onSelect(id, e, sorted)}
            theme={theme}
            index={i}
          />
        );
      })}
    </div>
  );
}

function toTranslate(transform: { x: number; y: number } | null) {
  return transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined;
}

function LinkRow({
  clip,
  info,
  onCtx,
  onDoubleClick,
  selected,
  onSelect,
  theme,
  index,
}: {
  clip: TextClip;
  info: { isUrl: boolean; label: string; sub: string };
  onCtx: (a: CtxArgs) => void;
  onDoubleClick: (id: number, type: ItemType) => void;
  selected: boolean;
  onSelect: (id: number, e: React.MouseEvent) => void;
  theme: Theme;
  index: number;
}) {
  const [hov, setHov] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: clip.id.toString(),
    data: { clipId: clip.id, type: "link" },
  });

  const background = (() => {
    if (selected && clip.pinned) return hexToRgba(theme.accent, 0.22);
    if (selected) return hexToRgba(theme.accent, 0.18);
    if (clip.pinned) return hexToRgba(theme.accent, 0.04);
    if (hov) return C.rowHov;
    return index % 2 === 0 ? "rgba(128,128,128,0.04)" : "transparent";
  })();

  const style = {
    height: 44,
    display: "flex",
    alignItems: "center",
    padding: "0 12px 0 6px",
    gap: 10,
    background,
    borderBottom: `1px solid ${C.borderDim}`,
    borderLeft: clip.pinned ? `3px solid ${theme.accent}` : "3px solid transparent",
    cursor: isDragging ? "grabbing" : "default",
    transition: "background 0.1s ease, opacity 0.1s ease",
    userSelect: "none" as const,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
    transform: toTranslate(transform),
  };

  return (
    <div
      ref={setNodeRef}
      data-keep-selection
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        onCtx({ e, item: clip, itemType: "link" });
      }}
      onClick={(e) => onSelect(clip.id, e)}
      onDoubleClick={() => onDoubleClick(clip.id, "link")}
      style={style}
      {...attributes}
      {...listeners}
    >


      {clip.pinned && (
        <Ic.PinFill
          width={11}
          height={11}
          style={{ color: theme.accent, flexShrink: 0, opacity: 0.85 }}
        />
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
          gap: 1,
        }}
      >
        <span>{clip.date}</span>
        <span>{clip.time}</span>
      </span>
    </div>
  );
}
