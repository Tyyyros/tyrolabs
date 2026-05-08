import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import type { StringKey } from "../../lib/strings";
import { C } from "../../lib/colors";
import { Ic } from "../icons";
import type { TabId } from "../../types";

interface Props {
  tab: TabId;
  visibleCount: number;
  selectedCount: number;
  collectionName?: string | null;
}

const LABEL_KEYS: Record<TabId, StringKey> = {
  text: "status.label.text",
  images: "status.label.images",
  links: "status.label.links",
  notes: "status.label.notes",
  password: "status.label.fallback",
};

export function StatusBar({ tab, visibleCount, selectedCount, collectionName }: Props) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  useEffect(() => {
    const formatTime = () =>
      new Date().toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    setTime(formatTime());
    const timer = setInterval(() => setTime(formatTime()), 15000);
    return () => clearInterval(timer);
  }, [lang]);

  const labelKey = LABEL_KEYS[tab] ?? ("status.label.fallback" as StringKey);
  const countLabel = useMemo(() => {
    const label = t(labelKey);
    const suffix = visibleCount > 1 && lang === "fr" ? "s" : "";
    return `${visibleCount} ${label}${suffix}`;
  }, [labelKey, visibleCount, t, lang]);

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
            {t("status.selected", { n: selectedCount, s: selectedCount > 1 && lang === "fr" ? "s" : "" })}
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
