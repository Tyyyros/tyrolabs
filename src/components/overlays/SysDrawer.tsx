import { useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import type { StringKey } from "../../lib/strings";
import { C, hexToRgba } from "../../lib/colors";
import { Ic } from "../icons";
import { WinBtn } from "../layout/WinBtn";

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

interface ProcessInfo {
  pid: number;
  name: string;
  cpu_pct: number;
  mem_mb: number;
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
  const [procs, setProcs] = useState<ProcessInfo[]>([]);
  const [procsLoading, setProcsLoading] = useState(false);
  const [confirmKill, setConfirmKill] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setAnim(true));
    invoke<SysInfo>("get_system_info").then(setSys).catch(console.error);
    invoke<string>("get_public_ip")
      .then((value) => setPublicIp({ status: "ok", value }))
      .catch(() => setPublicIp({ status: "error" }));
    refreshProcs();
  }, []);

  const refreshProcs = () => {
    setProcsLoading(true);
    invoke<ProcessInfo[]>("list_top_processes", { limit: 12 })
      .then(setProcs)
      .catch(console.error)
      .finally(() => setProcsLoading(false));
  };

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

  const handleKill = (pid: number) => {
    invoke("kill_process", { pid })
      .then(() => {
        setConfirmKill(null);
        refreshProcs();
      })
      .catch((e) => {
        console.error("[kill_process] failed:", e);
        setConfirmKill(null);
      });
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
            {(sys?.local_ips ?? []).map((ip, i) => (
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
            {(sys?.mac_addresses ?? []).map((mac, i) => (
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

        <div style={{ marginTop: 14 }}>
          <Section
            title={t("sys.section.processes")}
            action={
              <button
                onClick={refreshProcs}
                disabled={procsLoading}
                title={t("sys.processes.refresh")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.accent,
                  cursor: procsLoading ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                <Ic.RefreshCw width={14} height={14} strokeWidth={2} />
              </button>
            }
          >
            <ProcessTable
              procs={procs}
              loading={procsLoading}
              confirmKill={confirmKill}
              setConfirmKill={setConfirmKill}
              onKill={handleKill}
              theme={theme}
              t={t}
            />
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
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function ProcessTable({
  procs,
  loading,
  confirmKill,
  setConfirmKill,
  onKill,
  theme,
  t,
}: {
  procs: ProcessInfo[];
  loading: boolean;
  confirmKill: number | null;
  setConfirmKill: (pid: number | null) => void;
  onKill: (pid: number) => void;
  theme: ReturnType<typeof useTheme>;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}) {
  if (loading && procs.length === 0) {
    return <div style={{ padding: 8, fontSize: 12, color: C.t3 }}>…</div>;
  }
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "60px 1fr 60px 80px 60px",
          fontSize: 10,
          color: C.t3,
          fontFamily: theme.fontMono,
          letterSpacing: "0.06em",
          padding: "4px 0",
          borderBottom: `1px solid ${C.border}`,
          textTransform: "uppercase",
        }}
      >
        <span>{t("sys.processes.pid")}</span>
        <span>{t("sys.processes.name")}</span>
        <span style={{ textAlign: "right" }}>{t("sys.processes.cpu")}</span>
        <span style={{ textAlign: "right" }}>{t("sys.processes.ram")}</span>
        <span />
      </div>
      {procs.map((p) => (
        <div
          key={p.pid}
          style={{
            display: "grid",
            gridTemplateColumns: "60px 1fr 60px 80px 60px",
            fontSize: 11.5,
            fontFamily: theme.fontMono,
            color: C.t1,
            padding: "5px 0",
            borderBottom: `1px solid ${C.borderDim}`,
            alignItems: "center",
          }}
        >
          <span style={{ color: C.t3 }}>{p.pid}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.name}>
            {p.name}
          </span>
          <span style={{ textAlign: "right", color: p.cpu_pct > 25 ? "#F87171" : C.t1 }}>
            {p.cpu_pct.toFixed(1)}
          </span>
          <span style={{ textAlign: "right", color: p.mem_mb > 500 ? "#FBBF24" : C.t2 }}>
            {p.mem_mb} MB
          </span>
          <span style={{ display: "flex", justifyContent: "flex-end" }}>
            {confirmKill === p.pid ? (
              <span style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => onKill(p.pid)}
                  style={{
                    background: "#EF4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 3,
                    padding: "2px 6px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={() => setConfirmKill(null)}
                  style={{
                    background: "transparent",
                    color: C.t3,
                    border: `1px solid ${C.border}`,
                    borderRadius: 3,
                    padding: "2px 6px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmKill(p.pid)}
                title={t("sys.processes.kill")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.t3,
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.t3)}
              >
                <Ic.Trash width={13} height={13} strokeWidth={2} />
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
