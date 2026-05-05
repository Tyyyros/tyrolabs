import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import type { Theme, ThemeId } from "../../types";
import { THEMES } from "../../themes";
import { useTheme } from "../../lib/theme";
import { C, hexToRgba } from "../../lib/colors";
import { Ic } from "../icons";
import { WinBtn } from "../layout/WinBtn";
import { Toggle } from "../ui/Toggle";
import { Seg } from "../ui/Seg";
import { AutostartToggle } from "../settings/AutostartToggle";

interface Props {
  onClose: () => void;
  themeName: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  autoCap: boolean;
  onAutoCapChange: (v: boolean) => void;
}

type Lang = "fr" | "en";

export function Settings({ onClose, themeName, onThemeChange, autoCap, onAutoCapChange }: Props) {
  const theme = useTheme();
  const [anim, setAnim] = useState(false);
  const [appVersion, setAppVersion] = useState("...");
  useEffect(() => {
    requestAnimationFrame(() => setAnim(true));
    getVersion().then(setAppVersion).catch(() => setAppVersion("inconnue"));
  }, []);

  const [lang, setLang] = useState<Lang>("fr");
  const [notifs, setNotifs] = useState(true);
  const [maxItems, setMaxItems] = useState(1000);

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 500,
          background: "var(--bg)",
          color: "var(--t1)",
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.75)",
          opacity: anim ? 1 : 0,
          transform: anim ? "scale(1)" : "scale(0.96)",
          transition: "all 0.18s ease",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--sidebar)",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>Réglages</span>
          <WinBtn onClick={onClose} title="Fermer">
            <Ic.X width={16} height={16} strokeWidth={theme.iconStroke} />
          </WinBtn>
        </div>

        <div
          style={{
            padding: "18px 18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          {/* Theme picker */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                color: C.t2,
                letterSpacing: "0.08em",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ic.Palette width={13} height={13} strokeWidth={theme.iconStroke} />
              <span>THÈMES SOMBRES</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
              {Object.values(THEMES).filter(t => !t.light).map((t) => (
                <ThemeCard
                  key={t.id}
                  t={t}
                  active={themeName === t.id}
                  onClick={() => onThemeChange(t.id as ThemeId)}
                />
              ))}
            </div>

            <div
              style={{
                fontSize: 11,
                color: C.t2,
                letterSpacing: "0.08em",
                marginTop: 16,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ic.Palette width={13} height={13} strokeWidth={theme.iconStroke} />
              <span>THÈMES CLAIRS</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
              {Object.values(THEMES).filter(t => t.light).map((t) => (
                <ThemeCard
                  key={t.id}
                  t={t}
                  active={themeName === t.id}
                  onClick={() => onThemeChange(t.id as ThemeId)}
                />
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: C.border, marginBottom: 16 }} />

          {/* Other settings */}
          <Row label="Langue">
            <Seg<Lang>
              value={lang}
              onChange={setLang}
              options={[
                { v: "fr", l: "Français" },
                { v: "en", l: "English" },
              ]}
            />
          </Row>
          <Row
            label="Mode automatique"
            description="Surveille votre presse-papier et enregistre automatiquement chaque copie."
          >
            <Toggle value={autoCap} onChange={onAutoCapChange} />
          </Row>
          <AutostartToggle />
          <Row label="Notifications">
            <Toggle value={notifs} onChange={setNotifs} />
          </Row>
          <Row label="Historique max.">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range"
                min={100}
                max={5000}
                step={100}
                value={maxItems}
                onChange={(e) => setMaxItems(+e.target.value)}
                style={{ width: 90, accentColor: theme.accent }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: C.accent,
                  fontFamily: theme.fontMono,
                  minWidth: 36,
                }}
              >
                {maxItems}
              </span>
            </div>
          </Row>

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: C.t2, fontFamily: theme.fontMono }}>
              TyroLabs V{appVersion}
            </div>
            <div
              style={{ fontSize: 10.5, color: C.t3, fontFamily: theme.fontMono, marginTop: 4 }}
            >
              © 2026 TyroLabs. Tous droits réservés.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: description ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "11px 0",
        borderBottom: `1px solid ${C.borderDim}`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        {description && (
          <span
            style={{
              fontSize: 11,
              color: C.t3,
              lineHeight: "15px",
            }}
          >
            {description}
          </span>
        )}
      </div>
      <div style={{ flexShrink: 0, paddingTop: description ? 1 : 0 }}>{children}</div>
    </div>
  );
}

interface ThemeCardProps {
  t: Theme;
  active: boolean;
  onClick: () => void;
}

function ThemeCard({ t, active, onClick }: ThemeCardProps) {
  const [hov, setHov] = useState(false);
  const cardBg = t.bg;
  const cardText = t.t1 || "#FAFAFA";
  const cardTextDim = t.t2 || "#71717A";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        background: active
          ? hexToRgba(t.accent, t.light ? 0.08 : 0.1)
          : hov
            ? hexToRgba(t.accent, 0.04)
            : cardBg,
        border: `1px solid ${active ? t.accent : hov ? (t.border || C.border) : t.light ? (t.border || "#E4E4E7") : "transparent"}`,
        borderRadius: 8,
        padding: "10px 8px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        transition: "all 0.15s",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: hexToRgba(t.accent, 0.15),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2 L13.2 9.8 L20.5 7.5 L15.2 13 L20.5 18.5 L13.2 16.2 L12 22 L10.8 16.2 L3.5 18.5 L8.8 13 L3.5 7.5 L10.8 9.8 Z"
            fill={t.accent}
            opacity="0.9"
          />
        </svg>
      </div>
      <div
        style={{
          fontFamily: t.fontUI,
          fontSize: 10,
          fontWeight: 600,
          color: active ? t.accent : cardText,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {t.name}
      </div>
      <div
        style={{
          fontFamily: t.fontMono,
          fontSize: 8,
          color: cardTextDim,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {t.desc}
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.accent }} />
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: t.accent,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: t.accent,
            opacity: 0.25,
          }}
        />
      </div>
      {active && (
        <div style={{ position: "absolute", top: 6, right: 6 }}>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke={t.accent}
            strokeWidth={2.5}
            strokeLinecap="round"
          >
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
      )}
    </button>
  );
}
