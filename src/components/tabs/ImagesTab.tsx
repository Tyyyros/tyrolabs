import { useMemo, useState, useEffect, type ReactNode } from "react";
import type { ImageClip, ItemType, Theme } from "../../types";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CtxArgs {
  e: React.MouseEvent;
  item: ImageClip;
  itemType: ItemType;
}

interface Props {
  images: ImageClip[];
  onCtx: (a: CtxArgs) => void;
  onDoubleClick: (id: number, type: ItemType) => void;
  gridCols: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function ImagesTab({ images, onCtx, onDoubleClick, gridCols, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const sorted = useMemo(
    () => [...images.filter((c) => c.pinned), ...images.filter((c) => !c.pinned)],
    [images],
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
      <div
        style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols},1fr)`, gap: 10 }}
      >
        <SortableContext items={sorted.map(c => c.id.toString())} strategy={rectSortingStrategy}>
          {sorted.map((img) => (
            <ImgRow
              key={img.id}
              img={img}
              onCtx={onCtx}
              onDoubleClick={onDoubleClick}
              selected={selectedId === img.id}
              onSelect={onSelect}
              theme={theme}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function ImgRow({
  img,
  onCtx,
  onDoubleClick,
  selected,
  onSelect,
  theme,
}: {
  img: ImageClip;
  onCtx: (a: CtxArgs) => void;
  onDoubleClick: (id: number, type: ItemType) => void;
  selected: boolean;
  onSelect: (id: number) => void;
  theme: Theme;
}) {
  const [hov, setHov] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: img.id.toString(),
    data: { clipId: img.id, type: "image" },
  });

  const style = {
    cursor: "pointer",
    userSelect: "none" as const,
    outline: selected ? `2px solid ${C.accent}` : "none",
    borderRadius: 6,
    transition: transition || "all 0.12s",
    transform: CSS.Translate.toString(transform),
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
        onCtx({ e, item: img, itemType: "image" });
      }}
      onMouseDown={() => onSelect(img.id)}
      onDoubleClick={() => onDoubleClick(img.id, "image")}
      style={style}
      {...attributes}
    >
      <div
        style={{
          aspectRatio: "16/10",
          borderRadius: 5,
          border: `1px solid ${
            hov
              ? C.accent
              : img.pinned
                ? "rgba(var(--accent-rgb),0.4)"
                : C.border
          }`,
          position: "relative",
          overflow: "hidden",
          transition: "border-color 0.12s",
          background: `linear-gradient(135deg, hsl(${img.hue},18%,6%) 0%, hsl(${img.hue},12%,10%) 100%)`,
        }}
      >
        <ImgView hash={img.hash} />
        {hov && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <ImgBtn onClick={() => onDoubleClick(img.id, "image")}>
              <Ic.Copy width={13} height={13} strokeWidth={theme.iconStroke} />
            </ImgBtn>
            <ImgBtn 
              {...listeners} 
              style={{ 
                cursor: isDragging ? "grabbing" : "grab",
                width: 20,
                height: 32,
                color: hov ? `rgba(${theme.accentRGB || "59, 130, 246"}, 0.8)` : "transparent",
                background: "rgba(255,255,255,0.05)"
              }}
            >
              <Ic.GripVertical width={16} height={16} strokeWidth={2.5} />
            </ImgBtn>
          </div>
        )}
        {img.pinned && (
          <div style={{ position: "absolute", top: 4, left: 4, color: C.accent }}>
            <Ic.PinFill width={10} height={10} />
          </div>
        )}
      </div>
      <div style={{ marginTop: 5, padding: "0 1px" }}>
        <div
          style={{
            fontSize: 9.5,
            color: C.t2,
            fontFamily: theme.fontMono,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {img.hash}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: C.t3,
            fontFamily: theme.fontMono,
            marginTop: 2,
          }}
        >
          <span>{img.dims}</span>
          <span>{img.time}</span>
        </div>
      </div>
    </div>
  );
}

import { invoke, convertFileSrc } from "@tauri-apps/api/core";

function ImgView({ hash }: { hash: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    invoke<string>("get_image_path", { hash })
      .then((filePath) => {
        if (active) setSrc(convertFileSrc(filePath));
      })
      .catch((e) => console.error("Failed to load image:", e));
    return () => { active = false; };
  }, [hash]);

  if (!src) return null;

  return (
    <img
      src={src}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
      alt="clipboard"
      draggable={false}
    />
  );
}

function ImgBtn({
  children,
  onClick,
  style,
  ...props
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  const [bh, setBh] = useState(false);
  return (
    <div
      {...props}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onMouseEnter={() => setBh(true)}
      onMouseLeave={() => setBh(false)}
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: bh ? "rgba(255,255,255,0.15)" : "transparent",
        color: C.t1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.1s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
