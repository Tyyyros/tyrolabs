import { useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import type { StringKey } from "../../lib/strings";
import { C, hexToRgba } from "../../lib/colors";
import { Ic } from "../icons";
import { WinBtn } from "../layout/WinBtn";

const MAX_NETWORK_ITEMS = 2;

interface DiskInfo {
  name: string;
  total_gb: number;
  free_gb: number;
}

interface GpuInfo {
  name: string;
  driver: string;
}

interface JavaInfo {
  path: string;
  version: string;
}

interface SysInfo {
  hostname: string;
  os: string;
  cpu: string;
  ram_gb: number;
  disks: DiskInfo[];
  local_ips: string[];
  mac_addresses: string[];
  dns_servers: string[];
  gpus: GpuInfo[];
  javas: JavaInfo[];
  app_version: string;
}

type PublicIpStatus = "loading" | "ok" | "error";

export function SysDrawer({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const [anim, setAnim] = useState(false);
  const [sys, setSys] = useState<SysInfo | null>(null);
  const [publicIp, setPublicIp] = useState<{ status: PublicIpStatus; value?: string }>({
    status: "loading",
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setAnim(true));
    invoke<SysInfo>("get_system_info").then(setSys).catch(console.error);
    invoke<string>("get_public_ip")
      .then((value) => setPublicIp({ status: "ok", value }))
      .catch(() => setPublicIp({ status: "error" }));
  }, []);

  const handleCopy = (key: string, value: string) => {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1200);
      })
      .catch((e) => console.error("[clipboard.writeText] failed:", e));
  };

  const formatGb = (gb: number) => `${gb.toFixed(1)} GB`;

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 300,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "90%",
          overflowY: "auto",
          background: "var(--bg)",
          borderTop: `1px solid ${C.border}`,
          borderRadius: "10px 10px 0 0",
          padding: "16px 20px 22px",
          transform: anim ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.22s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>{t("sys.title")}</span>
          <WinBtn onClick={onClose} title={t("common.close")}>
            <Ic.X width={16} height={16} strokeWidth={theme.iconStroke} />
          </WinBtn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Section title={t("sys.section.network")}>
            <Field
              label={t("sys.field.hostname")}
              value={sys?.hostname ?? "…"}
              copyKey="hostname"
              onCopy={handleCopy}
              copied={copiedKey === "hostname"}
              t={t}
            />
            {(sys?.local_ips ?? []).slice(0, MAX_NETWORK_ITEMS).map((ip, i) => (
              <Field
                key={`ip-${i}`}
                label={i === 0 ? t("sys.field.local_ip") : ""}
                value={ip}
                copyKey={`ip-${i}`}
                onCopy={handleCopy}
                copied={copiedKey === `ip-${i}`}
                t={t}
              />
            ))}
            <Field
              label={t("sys.field.public_ip")}
              value={
                publicIp.status === "loading"
                  ? t("sys.public_ip.loading")
                  : publicIp.status === "error"
                    ? t("sys.public_ip.unavailable")
                    : publicIp.value ?? ""
              }
              copyKey="public_ip"
              onCopy={handleCopy}
              copied={copiedKey === "public_ip"}
              t={t}
              dim={publicIp.status !== "ok"}
            />
            {(sys?.mac_addresses ?? []).slice(0, MAX_NETWORK_ITEMS).map((mac, i) => (
              <Field
                key={`mac-${i}`}
                label={i === 0 ? t("sys.field.mac") : ""}
                value={mac}
                copyKey={`mac-${i}`}
                onCopy={handleCopy}
                copied={copiedKey === `mac-${i}`}
                t={t}
              />
            ))}
            {(sys?.dns_servers ?? []).map((dns, i) => (
              <Field
                key={`dns-${i}`}
                label={i === 0 ? t("sys.field.dns") : ""}
                value={dns}
                copyKey={`dns-${i}`}
                onCopy={handleCopy}
                copied={copiedKey === `dns-${i}`}
                t={t}
              />
            ))}
          </Section>

          <Section title={t("sys.section.system")}>
            <Field
              label={t("sys.field.os")}
              value={sys?.os ?? "…"}
              copyKey="os"
              onCopy={handleCopy}
              copied={copiedKey === "os"}
              t={t}
            />
            <Field
              label={t("sys.field.app_version", { version: sys?.app_version ?? "…" })}
              value={`v${sys?.app_version ?? ""}`}
              copyKey="app_version"
              onCopy={handleCopy}
              copied={copiedKey === "app_version"}
              t={t}
            />
          </Section>

          <Section title={t("sys.section.hardware")}>
            <Field
              label={t("sys.field.cpu")}
              value={sys?.cpu ?? "…"}
              copyKey="cpu"
              onCopy={handleCopy}
              copied={copiedKey === "cpu"}
              t={t}
            />
            <Field
              label={t("sys.field.ram")}
              value={sys ? `${sys.ram_gb.toFixed(1)} GB` : "…"}
              copyKey="ram"
              onCopy={handleCopy}
              copied={copiedKey === "ram"}
              t={t}
            />
            {(sys?.disks ?? []).map((d, i) => (
              <Field
                key={`disk-${i}`}
                label={i === 0 ? t("sys.field.disks") : ""}
                value={t("sys.disk.template", {
                  name: d.name,
                  free: formatGb(d.free_gb),
                  total: formatGb(d.total_gb),
                })}
                copyKey={`disk-${i}`}
                onCopy={handleCopy}
                copied={copiedKey === `disk-${i}`}
                t={t}
              />
            ))}
            {(sys?.gpus ?? []).map((g, i) => (
              <Field
                key={`gpu-${i}`}
                label={i === 0 ? t("sys.field.gpu") : ""}
                value={g.driver ? `${g.name} (${g.driver})` : g.name}
                copyKey={`gpu-${i}`}
                onCopy={handleCopy}
                copied={copiedKey === `gpu-${i}`}
                t={t}
              />
            ))}
          </Section>

          <Section title={t("sys.section.runtimes")}>
            {(sys?.javas ?? []).length === 0 ? (
              <div style={{ fontSize: 11, color: C.t3 }}>—</div>
            ) : (
              (sys?.javas ?? []).map((j, i) => (
                <Field
                  key={`java-${i}`}
                  label={i === 0 ? t("sys.field.java") : ""}
                  value={`${j.version} — ${j.path}`}
                  copyKey={`java-${i}`}
                  onCopy={handleCopy}
                  copied={copiedKey === `java-${i}`}
                  t={t}
                />
              ))
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  copyKey: string;
  onCopy: (key: string, value: string) => void;
  copied: boolean;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  dim?: boolean;
}

function Field({ label, value, copyKey, onCopy, copied, t, dim }: FieldProps) {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr auto",
        alignItems: "center",
        gap: 10,
        padding: "5px 0",
        borderBottom: `1px solid ${C.borderDim}`,
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          color: C.t3,
          fontFamily: theme.fontMono,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          color: dim ? C.t3 : C.t1,
          fontFamily: theme.fontMono,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={value}
      >
        {value}
      </span>
      <button
        onClick={() => onCopy(copyKey, value)}
        title={t("common.copy")}
        style={{
          background: copied ? hexToRgba(theme.accent, 0.18) : "transparent",
          border: "none",
          padding: 4,
          borderRadius: 4,
          color: copied ? theme.accent : C.t3,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Ic.Copy width={12} height={12} strokeWidth={2} />
      </button>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <div
      style={{
        background: "var(--sidebar)",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 14px 12px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: C.t3,
          fontFamily: theme.fontMono,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
