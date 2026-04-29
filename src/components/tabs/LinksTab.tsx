import { useMemo, useState } from "react";
import type { TextClip, ItemType, Theme } from "../../types";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
      <SortableContext items={sorted.map(c => c.id.toString())} strategy={verticalListSortingStrategy}>
        {sorted.map((clip) => {
          const info = extractInfo(clip.text);
          return (
            <LinkRow
              key={clip.id}
              clip={clip}
              info={info}
              onCtx={onCtx}
              onDoubleClick={onDoubleClick}
              selected={selectedId === clip.id}
              onSelect={onSelect}
              theme={theme}
            />
          );
        })}
      </SortableContext>
    </div>
  );
}

function LinkRow({
  clip,
  info,
  onCtx,
  onDoubleClick,
  selected,
  onSelect,
  theme,
}: {
  clip: TextClip;
  info: { isUrl: boolean; label: string; sub: string };
  onCtx: (a: CtxArgs) => void;
  onDoubleClick: (id: number, type: ItemType) => void;
  selected: boolean;
  onSelect: (id: number) => void;
  theme: Theme;
}) {
  const [hov, setHov] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: clip.id.toString(),
    data: { clipId: clip.id, type: "link" },
  });

  const style = {
    height: 44,
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    gap: 10,
    background: selected ? "rgba(59,130,246,0.08)" : hov ? C.rowHov : "transparent",
    borderBottom: `1px solid ${C.borderDim}`,
    borderLeft: selected ? `2px solid ${C.accent}` : "2px solid transparent",
    cursor: "default",
    transition: transition || "background 0.08s",
    userSelect: "none" as const,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        onCtx({ e, item: clip, itemType: "link" });
      }}
      onMouseDown={() => onSelect(clip.id)}
      onDoubleClick={() => onDoubleClick(clip.id, "link")}
      style={style}
      {...attributes}
    >
      <div
        {...listeners}
        style={{
          width: 20,
          height: 32,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: hov ? `rgba(${theme.accentRGB || "59, 130, 246"}, 0.8)` : "transparent",
          cursor: isDragging ? "grabbing" : "grab",
          borderRadius: 6,
          background: hov ? "rgba(255,255,255,0.05)" : "transparent",
          transition: "all 0.12s",
        }}
      >
        <Ic.GripVertical width={16} height={16} strokeWidth={2.5} />
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
          }}
        >
          {info.sub}
        </div>
      </div>
      <div
        style={{
          fontSize: 10,
          color: C.t3,
          fontFamily: theme.fontMono,
          flexShrink: 0,
        }}
      >
        {clip.time}
      </div>
    </div>
  );
}
