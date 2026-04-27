import { useMemo, useState, useEffect, type ReactNode } from "react";
import type { ImageClip, ItemType } from "../../types";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";

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
  const [hov, setHov] = useState<number | null>(null);
  const sorted = useMemo(
    () => [...images.filter((c) => c.pinned), ...images.filter((c) => !c.pinned)],
    [images],
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
      <div
        style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols},1fr)`, gap: 10 }}
      >
        {sorted.map((img) => (
          <div
            key={img.id}
            onMouseEnter={() => setHov(img.id)}
            onMouseLeave={() => setHov(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              onCtx({ e, item: img, itemType: "image" });
            }}
            onMouseDown={() => onSelect(img.id)}
            onDoubleClick={() => onDoubleClick(img.id, "image")}
            style={{
              cursor: "pointer",
              userSelect: "none",
              outline: selectedId === img.id ? `2px solid ${C.accent}` : "none",
              borderRadius: 6,
            }}
          >
            <div
              style={{
                aspectRatio: "16/10",
                borderRadius: 5,
                border: `1px solid ${
                  hov === img.id
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
              {hov === img.id && (
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
                  <ImgBtn>
                    <Ic.Edit width={13} height={13} strokeWidth={theme.iconStroke} />
                  </ImgBtn>
                </div>
              )}
              {img.pinned && (
                <div style={{ position: "absolute", top: 4, left: 4, color: C.accent }}>
                  <Ic.PinFill width={10} height={10} />
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 4,
                  right: 4,
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: C.green,
                }}
              />
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
        ))}
      </div>
    </div>
  );
}

import { invoke } from "@tauri-apps/api/core";

function ImgView({ hash }: { hash: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    invoke<string>("get_image_base64", { hash })
      .then((b64) => {
        if (active) setSrc(`data:image/png;base64,${b64}`);
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

function ImgBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30,
        height: 30,
        border: `1px solid ${hov ? C.accent : C.border}`,
        borderRadius: 4,
        cursor: "pointer",
        background: hov ? C.accentDim : "rgba(0,0,0,0.55)",
        color: hov ? C.accent : C.t1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.1s",
      }}
    >
      {children}
    </button>
  );
}
