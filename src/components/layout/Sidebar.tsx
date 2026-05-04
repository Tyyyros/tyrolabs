import { useState, useEffect, useRef, type ComponentType } from "react";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic, type IcProps } from "../icons";
import type { TabId } from "../../types";

const SB_ICON = 20;

type IcComponent = ComponentType<IcProps>;

interface NavItem {
  id: TabId;
  Icon: IcComponent;
  label: string;
}

const NAV: (NavItem | null)[] = [
  { id: "text", Icon: Ic.Text, label: "Texte" },
  { id: "images", Icon: Ic.Image, label: "Images" },
  { id: "links", Icon: Ic.Link, label: "Liens" },
  null,
  { id: "favs", Icon: Ic.Star, label: "Favoris" },
  { id: "colls", Icon: Ic.Layers, label: "Collections" },
];

interface SbBtnProps {
  Icon: IcComponent;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function SbBtn({ Icon, label, active, onClick }: SbBtnProps) {
  const [hov, setHov] = useState(false);
  const theme = useTheme();
  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        height: 46,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? C.accentDim : hov ? "rgba(255,255,255,0.035)" : "transparent",
        border: "none",
        borderLeft: active ? `2px solid ${C.accent}` : "2px solid transparent",
        cursor: "pointer",
        color: active ? theme.accent : hov ? "var(--t1)" : `rgba(${theme.accentRGB}, 0.7)`,
        transition: "all 0.12s",
        flexShrink: 0,
      }}
    >
      <Icon width={SB_ICON} height={SB_ICON} strokeWidth={theme.iconStroke} />
    </button>
  );
}

function CaptureBtn({ onCapture }: { onCapture: () => void }) {
  const [hov, setHov] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const theme = useTheme();
  const timerRef = useRef<number | null>(null);

  const startCapture = () => {
    onCapture();
    setShowMenu(false);
  };

  const startDelayed = () => {
    setShowMenu(false);
    setCountdown(5);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c !== null && c > 1) return c - 1;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        onCapture(); // Trigger now
        return null;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showMenu]);

  return (
    <div 
      style={{ position: "relative" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <button
        onClick={() => (countdown === null ? startCapture() : null)}
        title="Capture d'écran"
        style={{
          width: "100%",
          height: 46,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: hov ? `rgba(${theme.accentRGB}, 0.15)` : "transparent",
          border: "none",
          cursor: countdown === null ? "pointer" : "default",
          color: hov ? theme.accent : `rgba(${theme.accentRGB}, 0.7)`,
          transition: "all 0.12s",
          position: "relative",
          flexShrink: 0,
        }}
      >

        {countdown !== null ? (
          <span style={{ fontSize: 16, fontWeight: "bold", color: theme.accent }}>{countdown}</span>
        ) : (
          <Ic.Camera width={SB_ICON} height={SB_ICON} strokeWidth={theme.iconStroke} />
        )}

        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          style={{
            position: "absolute",
            right: -4,
            bottom: -6,
            padding: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s",
            color: theme.accent,
            opacity: hov || showMenu ? 1 : 0.4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <Ic.ChevD width={14} height={14} strokeWidth={3} />
        </div>
      </button>

      {showMenu && (
        <div
          style={{
            position: "absolute",
            left: 54,
            bottom: 0,
            background: "#0F0F12",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: 4,
            zIndex: 1000,
            width: 140,
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            onClick={startCapture}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              cursor: "pointer",
              borderRadius: 4,
              color: C.t1,
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Capture normale
          </div>
          <div
            onClick={startDelayed}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              cursor: "pointer",
              borderRadius: 4,
              color: C.t1,
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Différée (5s)
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  activeTab: TabId;
  onTab: (id: TabId) => void;
  onSettings: () => void;
  onSystem: () => void;
  onCapture: () => void;
}

export function Sidebar({ activeTab, onTab, onSettings, onSystem, onCapture }: Props) {
  return (
    <div
      style={{
        width: 54,
        background: "var(--sidebar)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        borderRight: `1px solid ${C.border}`,
      }}
    >
      <div style={{ flex: 1, paddingTop: 4, overflowY: "auto", overflowX: "hidden" }}>
        {NAV.map((item, i) =>
          item === null ? (
            <div
              key={`sep${i}`}
              style={{ height: 1, background: C.border, margin: "6px 10px", opacity: 0.5 }}
            />
          ) : (
            <SbBtn
              key={item.id}
              Icon={item.Icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => onTab(item.id)}
            />
          ),
        )}
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingBottom: 4, paddingTop: 4 }}>
        <CaptureBtn onCapture={onCapture} />
        <SbBtn Icon={Ic.Settings} label="Réglages" onClick={onSettings} />
        <SbBtn Icon={Ic.Cpu} label="Système" onClick={onSystem} />
      </div>
    </div>
  );
}
