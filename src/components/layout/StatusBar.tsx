import { useEffect, useState } from "react";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";
import type { TabId } from "../../types";

interface Props {
  count: number;
  tab: TabId;
}

const LABELS: Record<TabId, string> = {
  text: "élément",
  images: "capture",
  links: "lien",
  favs: "favori",
  colls: "collection",
};

const formatTime = () =>
  new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function StatusBar({ count, tab }: Props) {
  const theme = useTheme();
  const label = LABELS[tab] ?? "élément";
  const [time, setTime] = useState(formatTime);

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime()), 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        height: 26,
        background: "var(--sidebar)",
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        flexShrink: 0,
        gap: 12,
      }}
    >
      <span style={{ fontFamily: theme.fontMono, fontSize: 10, color: C.t2 }}>
        {count} {label}
        {count !== 1 ? "s" : ""}
      </span>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0.45 }}>
        <Ic.Clock width={11} height={11} style={{ color: C.t2 }} strokeWidth={theme.iconStroke} />
        <span style={{ fontFamily: theme.fontMono, fontSize: 10, color: C.t2 }}>{time}</span>
      </div>
    </div>
  );
}
