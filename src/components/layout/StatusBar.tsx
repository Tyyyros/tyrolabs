import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";
import type { TabId } from "../../types";

interface Props {
  tab: TabId;
  visibleCount: number;
  selectedCount: number;
  collectionName?: string | null;
}

const LABELS: Record<TabId, string> = {
  text: "texte",
  images: "image",
  links: "lien",
  favs: "favori",
};

const formatTime = () =>
  new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function StatusBar({ tab, visibleCount, selectedCount, collectionName }: Props) {
  const theme = useTheme();
  const [time, setTime] = useState(formatTime);

  useEffect(() => {
    const timer = setInterval(() => setTime(formatTime()), 15000);
    return () => clearInterval(timer);
  }, []);

  const label = LABELS[tab] ?? "élément";
  const countLabel = useMemo(() => {
    const suffix = visibleCount > 1 ? "s" : "";
    return `${visibleCount} ${label}${suffix}`;
  }, [label, visibleCount]);

  return (
    <div
      style={{
        height: 24,
        background: "var(--sidebar)",
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 10px",
        flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: theme.fontMono, fontSize: 10, color: C.t2 }}>
        {countLabel}
      </span>

      {collectionName && (
        <>
          <span style={{ width: 1, height: 10, background: C.border, opacity: 0.7 }} />
          <span style={{ fontFamily: theme.fontMono, fontSize: 10, color: C.t3 }}>
            {collectionName}
          </span>
        </>
      )}

      {selectedCount > 0 && (
        <>
          <span style={{ width: 1, height: 10, background: C.border, opacity: 0.7 }} />
          <span style={{ fontFamily: theme.fontMono, fontSize: 10, color: theme.accent }}>
            {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
          </span>
        </>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0.5 }}>
        <Ic.Clock width={11} height={11} style={{ color: C.t2 }} strokeWidth={theme.iconStroke} />
        <span style={{ fontFamily: theme.fontMono, fontSize: 10, color: C.t2 }}>{time}</span>
      </div>
    </div>
  );
}
