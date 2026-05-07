import { useMemo, useState, useEffect } from "react";
import type { ImageClip, ItemType, Theme } from "../../types";
import { useTheme } from "../../lib/theme";
import { C, hexToRgba } from "../../lib/colors";
import { Ic } from "../icons";
import { useDraggable } from "@dnd-kit/core";
import { resolveImageAsset } from "../../lib/image-assets";

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
  selection: Set<number>;
  onSelect: (id: number, e: React.MouseEvent, list: ImageClip[]) => void;
}

export function ImagesTab({ images, onCtx, onDoubleClick, gridCols, selection, onSelect }: Props) {
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
        {sorted.map((img, i) => (
          <ImgRow
            key={img.id}
            img={img}
            index={i}
            sortedImages={sorted}
            onCtx={onCtx}
            onDoubleClick={onDoubleClick}
            selected={selection.has(img.id)}
            onSelect={(id, e) => onSelect(id, e, sorted)}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
}

function toTranslate(transform: { x: number; y: number } | null) {
  return transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined;
}

function ImgRow({
  img,
  index,
  sortedImages,
  onCtx,
  onDoubleClick,
  selected,
  onSelect,
  theme,
}: {
  img: ImageClip;
  index: number;
  sortedImages: ImageClip[];
  onCtx: (a: CtxArgs) => void;
  onDoubleClick: (id: number, type: ItemType) => void;
  selected: boolean;
  onSelect: (id: number, e: React.MouseEvent, list: ImageClip[]) => void;
  theme: Theme;
}) {
  const [hov, setHov] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: img.id.toString(),
    data: { clipId: img.id, type: "image" },
  });

  const style = {
    cursor: isDragging ? "grabbing" : "pointer",
    userSelect: "none" as const,
    outline: img.pinned ? `2px solid ${theme.accent}` : "none",
    outlineOffset: 1,
    borderRadius: 6,
    transition: "opacity 0.12s",
    transform: toTranslate(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      data-keep-selection
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        onCtx({ e, item: img, itemType: "image" });
      }}
      onClick={(e) => onSelect(img.id, e, sortedImages)}
      onDoubleClick={() => onDoubleClick(img.id, "image")}
      style={style}
      {...attributes}
      {...listeners}
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
          transition: "border-color 0.12s, box-shadow 0.12s",
          background: `linear-gradient(135deg, hsl(${img.hue},18%,6%) 0%, hsl(${img.hue},12%,10%) 100%)`,
          boxShadow: selected ? `0 0 0 2px ${hexToRgba(theme.accent, img.pinned ? 0.24 : 0.18)}` : "none",
        }}
      >
        <ImgView hash={img.hash} />
        {selected && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: hexToRgba(theme.accent, img.pinned ? 0.22 : 0.18),
              pointerEvents: "none",
            }}
          />
        )}
        {img.pinned && (
          <div style={{ position: "absolute", top: 4, left: 4, color: theme.accent, zIndex: 1 }}>
            <Ic.PinFill width={10} height={10} />
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            left: 4,
            fontSize: 9,
            color: "#fff",
            fontFamily: theme.fontMono,
            opacity: 0.4,
            userSelect: "none",
            zIndex: 1,
          }}
        >
          #{index + 1}
        </div>
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
          <span>{img.date} {img.time}</span>
        </div>
      </div>
    </div>
  );
}



type ImageLoadState = "loading" | "ready" | "error";

function ImgView({ hash }: { hash: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<ImageLoadState>("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setSrc(null);
    resolveImageAsset(hash)
      .then((assetUrl) => {
        if (!active) return;
        setSrc(assetUrl);
      })
      .catch((e) => {
        if (!active) return;
        console.error("Failed to resolve image path:", e);
        setStatus("error");
      });
    return () => { active = false; };
  }, [hash]);

  if (status === "error") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          gap: 6,
          color: "rgba(255,255,255,0.72)",
          fontSize: 11,
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "center",
          padding: 12,
        }}
      >
        <Ic.Image width={18} height={18} />
        <span>Miniature indisponible</span>
      </div>
    );
  }

  return (
    <>
      {src && (
        <img
          src={src}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: status === "ready" ? 1 : 0,
            transition: "opacity 120ms ease",
          }}
          alt=""
          draggable={false}
          onLoad={() => setStatus("ready")}
          onError={(event) => {
            console.error("Failed to load thumbnail asset:", event.currentTarget.src);
            setStatus("error");
          }}
        />
      )}
      {status === "loading" && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
          }}
        />
      )}
    </>
  );
}

