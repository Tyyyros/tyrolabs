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

interface CaptureMenuItemProps {
  label: string;
  shortcut?: string;
  onClick: () => void;
}

function CaptureMenuItem({ label, shortcut, onClick }: CaptureMenuItemProps) {
  const [hov, setHov] = useState(false);
  const theme = useTheme();
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "7px 10px",
        fontSize: 12,
        cursor: "pointer",
        borderRadius: 5,
        color: hov ? theme.accent : C.t1,
        background: hov ? C.rowHov : "transparent",
        transition: "background 0.12s, color 0.12s",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <span>{label}</span>
      {shortcut && (
        <span
          style={{
            fontFamily: theme.fontMono,
            fontSize: 10.5,
            color: hov ? theme.accent : C.t3,
            letterSpacing: "0.03em",
          }}
        >
          {shortcut}
        </span>
      )}
    </div>
  );
}

function CaptureBtn({ onCapture, pulse }: { onCapture: () => void; pulse: number }) {
  const [hov, setHov] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [pulsing, setPulsing] = useState(false);
  const theme = useTheme();
  const timerRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);

  // Visual feedback when an external trigger (e.g. Alt+C) fires the capture.
  useEffect(() => {
    if (pulse === 0) return; // initial render — skip
    setPulsing(true);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = window.setTimeout(() => {
      setPulsing(false);
      pulseTimerRef.current = null;
    }, 450);
    return () => {
      if (pulseTimerRef.current) {
        window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
    };
  }, [pulse]);

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
        title="Capture d'écran (Alt+C)"
        style={{
          width: "100%",
          height: 46,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: pulsing
            ? `rgba(${theme.accentRGB}, 0.35)`
            : hov
              ? `rgba(${theme.accentRGB}, 0.15)`
              : "transparent",
          border: "none",
          cursor: countdown === null ? "pointer" : "default",
          color: pulsing ? theme.accent : hov ? theme.accent : `rgba(${theme.accentRGB}, 0.7)`,
          transition: "all 0.18s",
          position: "relative",
          flexShrink: 0,
          boxShadow: pulsing ? `0 0 0 2px ${theme.accent} inset` : "none",
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
            background: "var(--bg)",
            color: C.t1,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 4,
            zIndex: 1000,
            width: 160,
            fontFamily: theme.fontUI,
            boxShadow: `0 12px 28px -8px rgba(0,0,0,0.55), 0 0 0 1px ${theme.accent}10`,
          }}
        >
          <CaptureMenuItem
            label="Capture normale"
            shortcut="Alt+C"
            onClick={startCapture}
          />
          <CaptureMenuItem
            label="Différée (5s)"
            onClick={startDelayed}
          />
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
  capturePulse: number;
}

export function Sidebar({ activeTab, onTab, onSettings, onSystem, onCapture, capturePulse }: Props) {
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
        <CaptureBtn onCapture={onCapture} pulse={capturePulse} />
        <SbBtn Icon={Ic.Settings} label="Réglages" onClick={onSettings} />
        <SbBtn Icon={Ic.Cpu} label="Système" onClick={onSystem} />
      </div>
    </div>
  );
}
