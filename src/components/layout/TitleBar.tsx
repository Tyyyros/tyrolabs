import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTheme } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { C } from "../../lib/colors";
import { Ic } from "../icons";
import { WinBtn } from "./WinBtn";
import { AnimatedLogo } from "./AnimatedLogo";

const win = getCurrentWindow();

interface Props {
  pinned: boolean;
  onPin: () => void;
  search: string;
  onSearch: (v: string) => void;
}

export function TitleBar({ pinned, onPin, search, onSearch }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    invoke("set_always_on_top", { value: pinned })
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
      <div data-tauri-drag-region style={{ display: "flex", alignItems: "center", gap: 12, pointerEvents: "none" }}>
        <AnimatedLogo />

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

      {/* Search Container (Flex center — constrained) */}
      <div
        data-tauri-drag-region
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minWidth: 0,
          padding: "0 12px",
        }}
      >
        <div
          style={{
            width: searchFocused || search ? 320 : 160,
            borderColor: searchFocused ? theme.accent : C.border,
            transition: "all 0.25s ease-out",
            maxWidth: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--row-hov)",
            border: `1px solid ${searchFocused ? theme.accent : C.border}`,
            borderRadius: 8,
            padding: "6px 12px",
            overflow: "hidden",
            position: "relative",
            pointerEvents: "auto",
          }}
        >
          <Ic.Search width={14} height={14} style={{ color: searchFocused ? theme.accent : C.t3, flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={t("titlebar.search.placeholder")}
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: C.t1,
              fontSize: 13.5,
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
        </div>
      </div>

      {/* Controls */}
      <div
        data-tauri-drag-region
        style={{
          display: "flex",
          alignItems: "stretch",
          alignSelf: "stretch",
          marginRight: -14,
          gap: 0,
          flexShrink: 0,
          justifyContent: "flex-end",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "0 6px" }}>
          <WinBtn onClick={onPin} active={pinned} title={t("titlebar.pin")}>
            <Ic.Pin width={20} height={20} strokeWidth={theme.iconStroke} />
          </WinBtn>
          <div style={{ width: 1, height: 20, background: C.border, margin: "0 6px" }} />
        </div>
        <WinBtn isWinCtrl onClick={() => win.minimize()} title={t("titlebar.minimize")}>
          <Ic.Min width={18} height={18} strokeWidth={2.5} />
        </WinBtn>
        <WinBtn isWinCtrl onClick={() => win.toggleMaximize()} title={t("titlebar.maximize")}>
          <Ic.Max width={16} height={16} strokeWidth={2.5} />
        </WinBtn>
        <WinBtn isWinCtrl danger onClick={() => win.close()} title={t("titlebar.close")}>
          <Ic.X width={18} height={18} strokeWidth={2.5} />
        </WinBtn>
      </div>
    </div>
  );
}
