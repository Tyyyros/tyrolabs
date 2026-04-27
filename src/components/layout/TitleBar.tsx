import { useEffect, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic, TyroLogo } from "../icons";
import { WinBtn } from "./WinBtn";

const win = getCurrentWindow();

const EXPAND_THRESHOLD = 880;

interface Props {
  pinned: boolean;
  onPin: () => void;
  search: string;
  onSearch: (v: string) => void;
}

export function TitleBar({ pinned, onPin, search, onSearch }: Props) {
  const theme = useTheme();
  const [animKey, setAnimKey] = useState(0);
  const [hov, setHov] = useState(false);
  const [wide, setWide] = useState(() => window.innerWidth >= EXPAND_THRESHOLD);

  useEffect(() => {
    const h = () => setWide(window.innerWidth >= EXPAND_THRESHOLD);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    console.log("[Pin] useEffect fired, pinned =", pinned);
    invoke("set_always_on_top", { value: pinned })
      .then(() => console.log("[Pin] invoke OK"))
      .catch((e) => console.error("[Pin] invoke FAILED:", e));
  }, [pinned]);

  const expand = hov && wide;

  const handleEnter = () => {
    setHov(true);
    setAnimKey((k) => k + 1);
  };
  const handleLeave = () => setHov(false);

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 52,
        background: "var(--sidebar)",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 12,
        flexShrink: 0,
        userSelect: "none",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {/* Logo */}
      <div
        data-tauri-drag-region
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          minWidth: wide ? 140 : 0,
          cursor: "default",
        }}
      >
        <span
          key={`star-${animKey}`}
          style={{
            display: "inline-flex",
            animation: expand ? "star-flipY 0.65s cubic-bezier(.4,0,.2,1) forwards" : "none",
          }}
        >
          <TyroLogo size={24} color={theme.accent} />
        </span>

        <span
          style={{
            fontFamily: theme.fontMono,
            fontSize: 14,
            fontWeight: 500,
            opacity: 0.9,
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          <span style={{ color: theme.accent, opacity: 0.8 }}>{theme.logoPrefix}</span>

          <span
            key={`txt-${animKey}-${expand ? "exp" : "col"}`}
            style={
              {
                display: "inline-block",
                overflow: "hidden",
                whiteSpace: "nowrap",
                "--logo-ls": theme.logoLetterSpacing,
                animation: expand
                  ? "brackets-open 0.5s cubic-bezier(.4,0,.2,1) forwards, logo-glow 0.7s ease forwards"
                  : "none",
                maxWidth: 180,
                letterSpacing: theme.logoLetterSpacing,
                color: C.t1,
              } as CSSProperties
            }
          >
            {expand ? "TYROLABS" : "TLS"}
          </span>

          <span style={{ color: theme.accent, opacity: 0.8 }}>{theme.logoSuffix}</span>
        </span>
      </div>

      {/* Separator */}
      <div
        data-tauri-drag-region
        aria-hidden="true"
        style={{
          width: 1,
          height: 24,
          background: C.border,
          flexShrink: 0,
        }}
      />

      {/* Search */}
      <div
        data-tauri-drag-region
        style={{ flex: 1, display: "flex", justifyContent: "center", minWidth: 0 }}
      >
        <div
          data-tauri-drag-region
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#06060A",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "6px 12px",
            width: "100%",
            maxWidth: 480,
          }}
        >
          <Ic.Search width={18} height={18} style={{ color: C.t3, flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: C.t1,
              fontSize: 15,
              fontFamily: theme.fontUI,
              width: "100%",
              minWidth: 0,
            }}
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.t3,
                padding: 0,
                lineHeight: 1,
                display: "flex",
              }}
            >
              <Ic.X width={16} height={16} />
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        data-tauri-drag-region
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexShrink: 0,
          justifyContent: "flex-end",
        }}
      >
        <WinBtn onClick={onPin} active={pinned} title="Toujours au premier plan">
          <Ic.Pin width={22} height={22} strokeWidth={theme.iconStroke} />
        </WinBtn>
        <div style={{ width: 1, height: 22, background: C.border, margin: "0 6px" }} />
        <WinBtn onClick={() => win.minimize()} title="Réduire">
          <Ic.Min width={20} height={20} strokeWidth={theme.iconStroke} />
        </WinBtn>
        <WinBtn onClick={() => win.toggleMaximize()} title="Agrandir">
          <Ic.Max width={20} height={20} strokeWidth={theme.iconStroke} />
        </WinBtn>
        <WinBtn danger onClick={() => win.close()} title="Fermer">
          <Ic.X width={20} height={20} strokeWidth={theme.iconStroke} />
        </WinBtn>
      </div>
    </div>
  );
}
