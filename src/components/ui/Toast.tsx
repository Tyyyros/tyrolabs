import { C } from "../../lib/colors";

export function Toast({ msg }: { msg: string }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 38,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--sidebar)",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "7px 18px",
        fontSize: 11.5,
        color: C.t1,
        fontFamily: "var(--font-mono)",
        zIndex: 900,
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        pointerEvents: "none",
        animation: "toastFade 0.2s ease-out forwards",
      }}
    >
      <style>{`
        @keyframes toastFade {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      {msg}
    </div>
  );
}
