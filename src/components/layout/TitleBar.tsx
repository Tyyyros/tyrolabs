import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic, TyroLogo } from "../icons";
import { WinBtn } from "./WinBtn";

const win = getCurrentWindow();

interface Props {
  pinned: boolean;
  onPin: () => void;
  search: string;
  onSearch: (v: string) => void;
}

export function TitleBar({ pinned, onPin, search, onSearch }: Props) {
  const theme = useTheme();
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    console.log("[Pin] useEffect fired, pinned =", pinned);
    invoke("set_always_on_top", { value: pinned })
      .then(() => console.log("[Pin] invoke OK"))
      .catch((e) => console.error("[Pin] invoke FAILED:", e));
  }, [pinned]);



  return (
    <div
      data-tauri-drag-region
      style={{
        height: 52,
        background: "var(--sidebar)",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        justifyContent: "space-between",
        flexShrink: 0,
        userSelect: "none",
        position: "relative",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {/* Left section: Logo + Separator */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Logo */}
        <div
          data-tauri-drag-region
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "default",
          }}
        >
        <span style={{ display: "inline-flex" }}>
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
            style={{
              display: "inline-block",
              letterSpacing: theme.logoLetterSpacing,
              color: C.t1,
            }}
          >
            TYROLABS
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
      </div>

      {/* Search Container (Absolute Center) */}
      <div
        data-tauri-drag-region
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <motion.div
          animate={{
            width: searchFocused || search ? 360 : 160,
            borderColor: searchFocused ? theme.accent : C.border,
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#06060A",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "6px 12px",
            overflow: "hidden",
            position: "relative",
            pointerEvents: "auto",
          }}
        >
          <Ic.Search width={18} height={18} style={{ color: searchFocused ? theme.accent : C.t3, flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
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
                position: "absolute",
                right: 12,
              }}
            >
              <Ic.X width={16} height={16} />
            </button>
          )}
        </motion.div>
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
