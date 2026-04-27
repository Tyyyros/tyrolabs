import { useState, type ComponentType } from "react";
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
        color: active ? C.accent : hov ? C.t1 : "#A1A1AA",
        transition: "all 0.12s",
        flexShrink: 0,
      }}
    >
      <Icon width={SB_ICON} height={SB_ICON} strokeWidth={theme.iconStroke} />
    </button>
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
        <SbBtn Icon={Ic.Camera} label="Capture" onClick={onCapture} />
        <SbBtn Icon={Ic.Settings} label="Réglages" onClick={onSettings} />
        <SbBtn Icon={Ic.Cpu} label="Système" onClick={onSystem} />
      </div>
    </div>
  );
}
