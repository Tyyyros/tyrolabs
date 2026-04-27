import { useEffect, useState } from "react";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";
import { WinBtn } from "../layout/WinBtn";

const SYS = [
  { cat: "CPU",        label: "AMD Ryzen 9 7900X",       val: "4.7 GHz · 12C/24T",        col: C.accent },
  { cat: "GPU",        label: "NVIDIA GeForce RTX 4080", val: "16 GB GDDR6X",             col: C.green  },
  { cat: "GPU Driver", label: "NVIDIA 551.86 WHQL",      val: "Released 2024-04-15",      col: C.green  },
  { cat: "Java",       label: "OpenJDK 21.0.2 LTS",      val: "x64 build 21.0.2+13-58",   col: C.amber  },
  { cat: "Windows",    label: "Windows 11 Pro",          val: "Build 22631.3374 (23H2)",  col: C.purple },
  { cat: "RAM",        label: "32 GB DDR5-6000",         val: "2×16 GB · CL30-36-36-96",  col: C.pink   },
];

export function SysDrawer({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const [anim, setAnim] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setAnim(true));
  }, []);

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
          background: "#0F0F12",
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
          {SYS.map((s, i) => (
            <div
              key={i}
              style={{
                background: "#0A0A0D",
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
