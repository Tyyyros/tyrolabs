import { useEffect, useMemo, useState } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { WindowRect } from "../../types";

type CaptureMode = "image" | "ocr";

interface CaptureData {
  image_path: string;
  /** Coords en **pixels physiques**, locales au moniteur capturé. */
  windows: WindowRect[];
  monitor: { x: number; y: number; width: number; height: number; scale: number };
  mode: CaptureMode;
}

/** Toutes les Rect sont en pixels **physiques** (espace data.windows + screenshot). */
type Rect = { x: number; y: number; width: number; height: number; title?: string };

const DIM = "rgba(0,0,0,0.45)";
const HIGHLIGHT = "#ef4444";
const DRAG_THRESHOLD_CSS = 4;

function preload(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("preload failed"));
    img.src = url;
  });
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function CaptureOverlay() {
  const [data, setData] = useState<CaptureData | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [hovered, setHovered] = useState<Rect | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);

  /** Ratio CSS-px → physical-px dérivé du viewport réel.
   *  Tauri positionne l'overlay en LOGICAL → window.innerWidth/Height
   *  matche exactement la taille de l'overlay côté Tauri.
   *  Le bg image (PNG en pixels physiques) est étiré via `background-size: 100%`
   *  pour remplir le viewport. Tous les rects utilisent ce même ratio. */
  const cssScale = useMemo(() => {
    if (!data) return { x: 1, y: 1 };
    return {
      x: window.innerWidth / data.monitor.width,
      y: window.innerHeight / data.monitor.height,
    };
  }, [data]);

  const reset = () => {
    setData(null);
    setBgUrl(null);
    setHovered(null);
    setDragStart(null);
    setDragEnd(null);
    setError(null);
  };

  const closeOverlay = async () => {
    try {
      await invoke("cancel_capture");
    } catch {}
    reset();
    await getCurrentWindow().hide();
  };

  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    listen<void>("capture-ready", async () => {
      reset();
      try {
        const d = await invoke<CaptureData>("get_capture_data");
        const url = `${convertFileSrc(d.image_path)}?v=${Date.now()}`;
        await preload(url);
        setData(d);
        setBgUrl(url);
        await nextPaint();
        await getCurrentWindow().show();
        await getCurrentWindow().setFocus();
      } catch (e) {
        setError(String(e));
        await getCurrentWindow().show();
      }
    }).then((fn) => {
      unlistenFn = fn;
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      unlistenFn?.();
    };
  }, []);

  const dragRect: Rect | null = useMemo(() => {
    if (!dragStart || !dragEnd) return null;
    const x = Math.min(dragStart.x, dragEnd.x);
    const y = Math.min(dragStart.y, dragEnd.y);
    const w = Math.abs(dragEnd.x - dragStart.x);
    const h = Math.abs(dragEnd.y - dragStart.y);
    const tx = DRAG_THRESHOLD_CSS / cssScale.x;
    const ty = DRAG_THRESHOLD_CSS / cssScale.y;
    if (w < tx || h < ty) return null;
    return { x, y, width: w, height: h };
  }, [dragStart, dragEnd, cssScale]);

  const selection: Rect | null = dragRect ?? hovered;

  const physOf = (e: React.MouseEvent) => ({
    x: e.clientX / cssScale.x,
    y: e.clientY / cssScale.y,
  });

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const p = physOf(e);
    setDragStart(p);
    setDragEnd(p);
    setHovered(null);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const p = physOf(e);
    if (dragStart) {
      setDragEnd(p);
      return;
    }
    if (!data) {
      setHovered(null);
      return;
    }
    const found = data.windows.find(
      (w) => p.x >= w.x && p.x <= w.x + w.width && p.y >= w.y && p.y <= w.y + w.height,
    );
    setHovered(found ?? null);
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!dragStart) return;
    const end = physOf(e);
    setDragEnd(end);
    const x = Math.min(dragStart.x, end.x);
    const y = Math.min(dragStart.y, end.y);
    const w = Math.abs(end.x - dragStart.x);
    const h = Math.abs(end.y - dragStart.y);
    setDragStart(null);

    const tx = DRAG_THRESHOLD_CSS / cssScale.x;
    const ty = DRAG_THRESHOLD_CSS / cssScale.y;
    if (w >= tx && h >= ty) {
      commit({ x, y, width: w, height: h });
      return;
    }
    if (!data) return;
    const win = data.windows.find(
      (wd) =>
        end.x >= wd.x &&
        end.x <= wd.x + wd.width &&
        end.y >= wd.y &&
        end.y <= wd.y + wd.height,
    );
    if (win) {
      commit({
        x: win.x,
        y: win.y,
        width: win.width,
        height: win.height,
        title: win.title,
      });
    } else {
      commit({ x: 0, y: 0, width: data.monitor.width, height: data.monitor.height });
    }
  };

  const commit = (rect: Rect) => {
    const mode = data?.mode ?? "image";
    if (mode === "ocr") {
      runOcr(rect);
      return;
    }
    invoke("save_capture_area", {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    })
      .then(async () => {
        reset();
        await getCurrentWindow().hide();
      })
      .catch((e) => {
        console.error(e);
        setError(String(e));
      });
  };

  const runOcr = (rect: Rect) => {
    invoke("ocr_capture_area", {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    })
      .catch((e) => {
        console.error("[ocr_capture_area] failed:", e);
      })
      .finally(async () => {
        reset();
        await getCurrentWindow().hide();
      });
  };

  if (!data && !error) return null;

  if (error) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.85)",
          color: "#ef4444",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600 }}>Erreur de capture</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>{error}</div>
        <button
          onClick={closeOverlay}
          style={{
            marginTop: 20,
            padding: "8px 16px",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </div>
    );
  }

  if (!data || !bgUrl) return null;

  // Conversion physical → CSS uniquement au render.
  const cssSel = selection
    ? {
        x: selection.x * cssScale.x,
        y: selection.y * cssScale.y,
        width: selection.width * cssScale.x,
        height: selection.height * cssScale.y,
        title: selection.title,
      }
    : null;

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        position: "fixed",
        inset: 0,
        cursor: "crosshair",
        userSelect: "none",
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        overflow: "hidden",
      }}
    >
      {cssSel ? (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: cssSel.y,
              background: DIM,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: cssSel.y + cssSel.height,
              width: "100%",
              height: `calc(100% - ${cssSel.y + cssSel.height}px)`,
              background: DIM,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: cssSel.y,
              width: cssSel.x,
              height: cssSel.height,
              background: DIM,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: cssSel.x + cssSel.width,
              top: cssSel.y,
              width: `calc(100% - ${cssSel.x + cssSel.width}px)`,
              height: cssSel.height,
              background: DIM,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: cssSel.x,
              top: cssSel.y,
              width: cssSel.width,
              height: cssSel.height,
              border: `2px solid ${HIGHLIGHT}`,
              boxSizing: "border-box",
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                background: HIGHLIGHT,
                color: "#fff",
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: "0 0 0 4px",
                fontWeight: 600,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {dragRect
                ? `${Math.round(selection!.width)} × ${Math.round(selection!.height)}`
                : selection!.title || "Fenêtre"}
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: DIM,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
