import { useMemo, useState } from "react";
import type { TextClip, ItemType, Theme } from "../../types";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
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
  selection: Set<number>;
  onSelect: (id: number, e: React.MouseEvent, list: TextClip[]) => void;
}

export function TextTab({ clips, onCtx, onDoubleClick, selectedId, selection, onSelect }: Props) {
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
        {sorted.map((c, i) => (
          <TextRow
            key={c.id}
            clip={c}
            index={i}
            onCtx={onCtx}
            onDoubleClick={onDoubleClick}
            theme={theme}
            selected={selectedId === c.id || selection.has(c.id)}
            onSelect={(id, e) => onSelect(id, e, sorted)}
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
  onSelect: (id: number, e: React.MouseEvent) => void;
  index: number;
}

export function TextRow({ clip, onCtx, onDoubleClick, theme, selected, onSelect, index }: RowProps) {
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
    background: selected ? "rgba(79, 70, 229, 0.15)" : hov ? C.rowHov : index % 2 === 0 ? "rgba(128,128,128,0.04)" : "transparent",
    borderBottom: `1px solid ${C.borderDim}`,
    borderLeft: clip.pinned ? `4px solid ${theme.accent}` : selected ? `4px solid ${C.accent}` : "4px solid transparent",
    cursor: isDragging ? "grabbing" : "default",
    transition: transition || "all 0.1s ease",
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
      onMouseDown={(e) => onSelect(clip.id, e)}
      onDoubleClick={() => onDoubleClick(clip.id, "text")}
      style={style}
      {...attributes}
      {...listeners}
    >


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
