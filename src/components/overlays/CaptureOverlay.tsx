import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { CaptureContext, WindowRect } from "../../types";

export function CaptureOverlay() {
  const [ctx, setCtx] = useState<CaptureContext | null>(null);
  const [hovered, setHovered] = useState<WindowRect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Esc to close
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") getCurrentWindow().close();
    };
    window.addEventListener("keydown", handleKey);
    
    // Timeout after 15 seconds
    const timer = setTimeout(() => {
      setError("Délai d'attente dépassé (15s)");
      setLoading(false);
    }, 15000);

    invoke<CaptureContext>("get_capture_context")
      .then(setCtx)
      .catch((e) => {
        setError(String(e));
      })
      .finally(() => {
        setLoading(false);
        clearTimeout(timer);
      });

    return () => {
      window.removeEventListener("keydown", handleKey);
      clearTimeout(timer);
    };
  }, []);

  const handleMove = (e: React.MouseEvent) => {
    if (!ctx) return;
    const { clientX, clientY } = e;
    
    // Find window under cursor (smallest one wins if nested)
    const candidates = ctx.windows.filter(w => 
      clientX >= w.x && clientX <= w.x + w.width &&
      clientY >= w.y && clientY <= w.y + w.height
    );
    
    if (candidates.length > 0) {
      const best = candidates.sort((a, b) => (a.width * a.height) - (b.width * b.height))[0];
      setHovered(best);
    } else {
      setHovered(null);
    }
  };

  const handleClick = () => {
    if (!hovered) return;
    invoke("save_capture_area", { 
      x: hovered.x, 
      y: hovered.y, 
      width: hovered.width, 
      height: hovered.height 
    }).then(() => {
      getCurrentWindow().close();
    });
  };

  if (error) {
    return (
      <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", color: "#ef4444", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Erreur de capture</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>{error}</div>
        <button onClick={() => getCurrentWindow().close()} style={{ marginTop: 20, padding: "8px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Fermer</button>
      </div>
    );
  }

  if (loading || !ctx) {
    return (
      <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", color: "#fff", flexDirection: "column", gap: 15 }}>
        <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: 0.5 }}>Préparation de la capture...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div 
      onMouseMove={handleMove}
      onClick={handleClick}
      style={{
        width: "100vw",
        height: "100vh",
        cursor: "crosshair",
        position: "relative",
        overflow: "hidden",
        background: `url(${ctx.screenshot}) no-repeat center/cover`
      }}
    >
      {/* Dim overlay */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />

      {/* Highlight */}
      {hovered && (
        <div 
          style={{
            position: "absolute",
            left: hovered.x,
            top: hovered.y,
            width: hovered.width,
            height: hovered.height,
            border: "2px solid #3b82f6",
            background: "rgba(59,130,246,0.15)",
            boxShadow: "0 0 20px rgba(59,130,246,0.3)",
            transition: "all 0.08s ease-out",
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "flex-start"
          }}
        >
           <div style={{ 
             background: "#3b82f6", 
             color: "#fff", 
             fontSize: 10, 
             padding: "2px 8px",
             borderRadius: "0 0 0 4px",
             fontWeight: 600,
             maxWidth: "100%",
             overflow: "hidden",
             textOverflow: "ellipsis",
             whiteSpace: "nowrap"
           }}>
             {hovered.title || "Fenêtre sans titre"}
           </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.8)",
        color: "#fff",
        padding: "10px 20px",
        borderRadius: 24,
        fontSize: 13,
        fontWeight: 500,
        pointerEvents: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        Cliquez pour capturer la fenêtre • <span style={{ opacity: 0.7 }}>Échap pour annuler</span>
      </div>
    </div>
  );
}
