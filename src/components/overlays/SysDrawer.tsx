import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";
import { WinBtn } from "../layout/WinBtn";

interface SysInfo {
  cpu: string;
  mem_total: string;
  os_version: string;
  host: string;
}

export function SysDrawer({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const [anim, setAnim] = useState(false);
  const [sysInfo, setSysInfo] = useState<SysInfo | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setAnim(true));
    invoke<SysInfo>("get_system_info").then(setSysInfo).catch(console.error);
  }, []);

  const sysData = sysInfo ? [
    { cat: "CPU",        label: "Processeur",          val: sysInfo.cpu,                 col: C.accent },
    { cat: "OS",         label: "Système d'exploitation", val: sysInfo.os_version,         col: C.purple },
    { cat: "RAM",        label: "Mémoire totale",      val: sysInfo.mem_total,           col: C.pink   },
    { cat: "HOST",       label: "Nom de l'hôte",       val: sysInfo.host,                col: C.amber  },
    { cat: "App",        label: "TyroLabs V2",         val: "Version 1.0.0",             col: C.green  },
    { cat: "Tauri",      label: "Backend Rust",        val: "Tauri v2 + Vite",           col: C.green  },
  ] : [];

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
          background: "var(--bg)",
          borderTop: `1px solid ${C.border}`,
          borderRadius: "10px 10px 0 0",
          padding: "20px 20px 24px",
          transform: anim ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.22s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: theme.fontMono,
                fontSize: 9.5,
                color: C.t2,
                letterSpacing: "0.12em",
                marginBottom: 4,
              }}
            >
              SYS_INFO
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Informations Système</div>
          </div>
          <WinBtn onClick={onClose} title="Fermer">
            <Ic.X width={16} height={16} strokeWidth={theme.iconStroke} />
          </WinBtn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {sysData.map((s, i) => (
            <div
              key={i}
              style={{
                background: "var(--sidebar)",
                border: `1px solid ${C.border}`,
                borderLeft: `2px solid ${s.col}`,
                borderRadius: 6,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: C.t2,
                  fontFamily: theme.fontMono,
                  letterSpacing: "0.1em",
                  marginBottom: 7,
                }}
              >
                {s.cat}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: C.t1, marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 10, color: C.t2, fontFamily: theme.fontMono }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
