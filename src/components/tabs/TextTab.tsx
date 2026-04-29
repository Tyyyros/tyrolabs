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
  clips: TextClip[];
  onCtx: (a: CtxArgs) => void;
  onDoubleClick: (id: number, type: ItemType) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function TextTab({ clips, onCtx, onDoubleClick, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const sorted = useMemo(
    () => [...clips.filter((c) => c.pinned), ...clips.filter((c) => !c.pinned)],
    [clips],
  );

  if (!sorted.length) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.t3,
          fontSize: 14,
        }}
      >
        Aucun résultat
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <SortableContext items={sorted.map((c) => c.id.toString())} strategy={verticalListSortingStrategy}>
        {sorted.map((c) => (
          <TextRow
            key={c.id}
            clip={c}
            onCtx={onCtx}
            onDoubleClick={onDoubleClick}
            theme={theme}
            selected={selectedId === c.id}
            onSelect={onSelect}
          />
        ))}
      </SortableContext>
    </div>
  );
}

interface RowProps {
  clip: TextClip;
  onCtx: (a: CtxArgs) => void;
  onDoubleClick: (id: number, type: ItemType) => void;
  theme: Theme;
  selected: boolean;
  onSelect: (id: number) => void;
}

export function TextRow({ clip, onCtx, onDoubleClick, theme, selected, onSelect }: RowProps) {
  const [hov, setHov] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: clip.id.toString(),
    data: { clipId: clip.id, type: "text" },
  });

  const style = {
    height: 34,
    display: "flex",
    alignItems: "center",
    padding: "0 12px 0 6px",
    background: selected ? "rgba(59,130,246,0.08)" : hov ? C.rowHov : "transparent",
    borderBottom: `1px solid ${C.borderDim}`,
    borderLeft: selected ? `2px solid ${C.accent}` : "2px solid transparent",
    cursor: "default",
    transition: transition || "background 0.08s",
    transform: CSS.Translate.toString(transform),
    gap: 6,
    userSelect: "none" as const,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        onCtx({ e, item: clip, itemType: "text" });
      }}
      onMouseDown={() => onSelect(clip.id)}
      onDoubleClick={() => onDoubleClick(clip.id, "text")}
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
      <div
        style={{
          width: 14,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.accent,
        }}
      >
        {clip.pinned && <Ic.Paperclip width={11} height={11} strokeWidth={theme.iconStroke} />}
      </div>
      <span
        style={{
          flex: 1,
          fontSize: 12.5,
          minWidth: 0,
          color: C.t1,
          fontFamily: theme.fontUI,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: "34px",
        }}
      >
        {clip.text}
      </span>
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
