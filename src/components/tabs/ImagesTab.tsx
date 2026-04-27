import { useMemo, useState, type ReactNode } from "react";
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
        {sorted.map((img, i) => (
          <div
            key={img.id}
            onMouseEnter={() => setHov(img.id)}
            onMouseLeave={() => setHov(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              onCtx({ e, item: img, itemType: "image" });
            }}
            onClick={() => onSelect(img.id)}
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
              <ImgMock idx={i} hue={img.hue} />
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

function ImgMock({ idx, hue }: { idx: number; hue: number }) {
  const rows = [4, 5, 6, 3, 5, 4, 6, 5, 3, 4, 5, 6];
  const n = rows[idx % rows.length];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "10% 8%",
        display: "flex",
        flexDirection: "column",
        gap: "6%",
      }}
    >
      <div style={{ height: "10%", display: "flex", gap: "3%", alignItems: "center" }}>
        <div
          style={{ width: "8%", height: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 2 }}
        />
        <div
          style={{ flex: 1, height: "100%", background: "rgba(255,255,255,0.04)", borderRadius: 2 }}
        />
        <div
          style={{
            width: "12%",
            height: "100%",
            background: `hsl(${hue},50%,20%)`,
            borderRadius: 2,
            opacity: 0.5,
          }}
        />
      </div>
      <div style={{ flex: 1, display: "flex", gap: "4%" }}>
        <div style={{ width: "18%", display: "flex", flexDirection: "column", gap: "8%" }}>
          {[...Array(Math.min(n, 5))].map((_, j) => (
            <div
              key={j}
              style={{ height: "12%", background: "rgba(255,255,255,0.04)", borderRadius: 1 }}
            />
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5%" }}>
          {[...Array(n)].map((_, j) => (
            <div
              key={j}
              style={{
                height: "10%",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 1,
                width: `${50 + ((j * 37) % 45)}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
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
