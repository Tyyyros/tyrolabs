import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import { useTheme } from "../../../lib/theme";
import { useI18n } from "../../../lib/i18n";
import type { StringKey } from "../../../lib/strings";
import { C, hexToRgba } from "../../../lib/colors";
import { Ic } from "../../icons";

type Mode = "random" | "passphrase";

interface PasswordResult {
  value: string;
  entropy_bits: number;
  score: number;
}

interface RandomOpts {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  extra_chars: string;
  exclude_ambiguous: boolean;
}

interface PassphraseOpts {
  word_count: number;
  separator: string;
  capitalize: boolean;
  append_digits: boolean;
  append_symbol: boolean;
}

interface Props {
  fire: (msg: string) => void;
}

const STRENGTH_COLORS = ["#EF4444", "#F59E0B", "#FACC15", "#84CC16", "#22C55E"];
const STRENGTH_KEYS: StringKey[] = [
  "password.strength.0",
  "password.strength.1",
  "password.strength.2",
  "password.strength.3",
  "password.strength.4",
];

export function PasswordPanel({ fire }: Props) {
  const theme = useTheme();
  const { t } = useI18n();

  const [mode, setMode] = useState<Mode>("random");
  const [random, setRandom] = useState<RandomOpts>({
    length: 20,
    upper: true,
    lower: true,
    digits: true,
    symbols: true,
    extra_chars: "",
    exclude_ambiguous: false,
  });
  const [passphrase, setPassphrase] = useState<PassphraseOpts>({
    word_count: 4,
    separator: "-",
    capitalize: true,
    append_digits: true,
    append_symbol: false,
  });
  const [result, setResult] = useState<PasswordResult | null>(null);
  const [running, setRunning] = useState(false);

  const generate = useCallback(async () => {
    setRunning(true);
    try {
      if (mode === "random") {
        const r = await invoke<PasswordResult>("generate_password", { opts: random });
        setResult(r);
      } else {
        const r = await invoke<PasswordResult>("generate_passphrase", { opts: passphrase });
        setResult(r);
      }
    } catch (e) {
      console.error("[generate_password] failed:", e);
      fire(t("password.error"));
    } finally {
      setRunning(false);
    }
  }, [mode, random, passphrase, fire, t]);

  // Régénère automatiquement à chaque changement de config.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, random, passphrase]);

  const copyValue = () => {
    if (!result) return;
    navigator.clipboard
      .writeText(result.value)
      .then(() => fire(t("password.copied")))
      .catch((e) => {
        console.error("[clipboard.writeText] failed:", e);
        fire(t("toast.copy.failed"));
      });
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Ic.Lock width={18} height={18} strokeWidth={theme.iconStroke} style={{ color: theme.accent }} />
        <span style={{ fontSize: 15, fontWeight: 600 }}>{t("password.title")}</span>
      </div>

      <ModeToggle mode={mode} setMode={setMode} />

      <Output result={result} running={running} onCopy={copyValue} onRegen={generate} />

      {mode === "random" ? (
        <RandomConfig opts={random} setOpts={setRandom} />
      ) : (
        <PassphraseConfig opts={passphrase} setOpts={setPassphrase} />
      )}
    </div>
  );
}

function ModeToggle({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const Btn = ({ value, label }: { value: Mode; label: string }) => {
    const active = mode === value;
    return (
      <button
        onClick={() => setMode(value)}
        style={{
          flex: 1,
          padding: "8px 12px",
          fontSize: 12,
          fontFamily: theme.fontUI,
          background: active ? hexToRgba(theme.accent, 0.18) : "transparent",
          border: `1px solid ${active ? theme.accent : C.border}`,
          color: active ? theme.accent : C.t1,
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: active ? 600 : 400,
          transition: "all 0.12s",
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <Btn value="random" label={t("password.mode.random")} />
      <Btn value="passphrase" label={t("password.mode.passphrase")} />
    </div>
  );
}

function Output({
  result,
  running,
  onCopy,
  onRegen,
}: {
  result: PasswordResult | null;
  running: boolean;
  onCopy: () => void;
  onRegen: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const score = result?.score ?? 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 16px",
        background: "var(--row-hov)",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <input
          readOnly
          value={result?.value ?? ""}
          style={{
            flex: 1,
            background: "var(--bg)",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.t1,
            fontSize: 14,
            fontFamily: theme.fontMono,
            padding: "10px 12px",
            outline: "none",
          }}
        />
        <button
          onClick={onRegen}
          disabled={running}
          title={t("password.regenerate")}
          style={iconBtnStyle(theme.accent)}
        >
          <Ic.RefreshCw width={18} height={18} strokeWidth={2} />
        </button>
        <button onClick={onCopy} disabled={!result} title={t("password.copy")} style={iconBtnStyle(theme.accent)}>
          <Ic.Copy width={18} height={18} strokeWidth={2} />
        </button>
      </div>

      <StrengthMeter score={score} />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <span style={{ color: C.t2, fontFamily: theme.fontMono }}>
          {result ? t("password.entropy", { bits: Math.round(result.entropy_bits) }) : ""}
        </span>
        <span style={{ color: STRENGTH_COLORS[score], fontWeight: 600 }}>
          {result ? t(STRENGTH_KEYS[score]) : ""}
        </span>
      </div>
    </div>
  );
}

function StrengthMeter({ score }: { score: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: i <= score ? STRENGTH_COLORS[score] : "rgba(255,255,255,0.08)",
            transition: "background 0.18s",
          }}
        />
      ))}
    </div>
  );
}

function RandomConfig({
  opts,
  setOpts,
}: {
  opts: RandomOpts;
  setOpts: (o: RandomOpts) => void;
}) {
  const { t } = useI18n();
  return (
    <Section title={t("password.mode.random")}>
      <Row label={t("password.length")}>
        <RangeSlider
          min={8}
          max={64}
          value={opts.length}
          onChange={(v) => setOpts({ ...opts, length: v })}
        />
      </Row>
      <CheckRow
        label={t("password.classes.upper")}
        value={opts.upper}
        onChange={(v) => setOpts({ ...opts, upper: v })}
      />
      <CheckRow
        label={t("password.classes.lower")}
        value={opts.lower}
        onChange={(v) => setOpts({ ...opts, lower: v })}
      />
      <CheckRow
        label={t("password.classes.digits")}
        value={opts.digits}
        onChange={(v) => setOpts({ ...opts, digits: v })}
      />
      <CheckRow
        label={t("password.classes.symbols")}
        value={opts.symbols}
        onChange={(v) => setOpts({ ...opts, symbols: v })}
      />
      <Row label={t("password.extra")}>
        <TextInput
          value={opts.extra_chars}
          placeholder={t("password.extra.placeholder")}
          onChange={(v) => setOpts({ ...opts, extra_chars: v })}
        />
      </Row>
      <CheckRow
        label={t("password.exclude_ambiguous")}
        value={opts.exclude_ambiguous}
        onChange={(v) => setOpts({ ...opts, exclude_ambiguous: v })}
      />
    </Section>
  );
}

function PassphraseConfig({
  opts,
  setOpts,
}: {
  opts: PassphraseOpts;
  setOpts: (o: PassphraseOpts) => void;
}) {
  const { t } = useI18n();
  return (
    <Section title={t("password.mode.passphrase")}>
      <Row label={t("password.passphrase.words")}>
        <RangeSlider
          min={3}
          max={7}
          value={opts.word_count}
          onChange={(v) => setOpts({ ...opts, word_count: v })}
        />
      </Row>
      <Row label={t("password.passphrase.separator")}>
        <SeparatorPicker
          value={opts.separator}
          onChange={(v) => setOpts({ ...opts, separator: v })}
        />
      </Row>
      <CheckRow
        label={t("password.passphrase.capitalize")}
        value={opts.capitalize}
        onChange={(v) => setOpts({ ...opts, capitalize: v })}
      />
      <CheckRow
        label={t("password.passphrase.digits")}
        value={opts.append_digits}
        onChange={(v) => setOpts({ ...opts, append_digits: v })}
      />
      <CheckRow
        label={t("password.passphrase.symbol")}
        value={opts.append_symbol}
        onChange={(v) => setOpts({ ...opts, append_symbol: v })}
      />
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "12px 16px",
        background: "var(--sidebar)",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.08em",
          color: C.t3,
          fontFamily: theme.fontMono,
          textTransform: "uppercase",
          paddingBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "8px 0",
        borderBottom: `1px solid ${C.borderDim}`,
      }}
    >
      <span style={{ fontSize: 12.5, color: C.t1 }}>{label}</span>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function CheckRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: `1px solid ${C.borderDim}`,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: theme.accent, cursor: "pointer" }}
      />
      <span style={{ fontSize: 12.5, color: C.t1 }}>{label}</span>
    </label>
  );
}

function RangeSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const theme = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: 120, accentColor: theme.accent }}
      />
      <span
        style={{
          fontSize: 12,
          color: theme.accent,
          fontFamily: theme.fontMono,
          minWidth: 24,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function TextInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 130,
        background: "var(--bg)",
        border: `1px solid ${C.border}`,
        borderRadius: 5,
        color: C.t1,
        fontSize: 12,
        fontFamily: theme.fontMono,
        padding: "5px 8px",
        outline: "none",
      }}
    />
  );
}

function SeparatorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  const opts = ["-", "_", ".", " "];
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {opts.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              border: `1px solid ${active ? theme.accent : C.border}`,
              background: active ? hexToRgba(theme.accent, 0.18) : "transparent",
              color: active ? theme.accent : C.t1,
              fontSize: 13,
              fontFamily: theme.fontMono,
              cursor: "pointer",
              fontWeight: active ? 700 : 400,
            }}
          >
            {s === " " ? "␣" : s}
          </button>
        );
      })}
    </div>
  );
}

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${C.border}`,
    color,
    cursor: "pointer",
    padding: 8,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
