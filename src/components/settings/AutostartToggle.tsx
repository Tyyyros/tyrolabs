import { AlertTriangle, Loader2, Power } from "lucide-react";
import { useAutostart } from "../../hooks/useAutostart";
import { C } from "../../lib/colors";

export function AutostartToggle() {
  const {
    available,
    availabilityMessage,
    enabled,
    error,
    loading,
    refresh,
    saving,
    setEnabled,
  } = useAutostart();
  const busy = loading || saving;
  const disabled = busy || !available;

  const handleToggle = () => {
    if (!disabled) {
      void setEnabled(!enabled);
    }
  };

  return (
    <div
      style={{
        background: "var(--row-hov)",
        border: `1px solid ${C.borderDim}`,
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: "var(--accent-dim)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Power size={16} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: C.t1, fontSize: 13, fontWeight: 500 }}>
              Lancer au demarrage de Windows
            </div>
            <div style={{ color: C.t2, fontSize: 11, lineHeight: "15px", marginTop: 2 }}>
              Active l'application au demarrage de session, sans creer de doublon.
            </div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-busy={busy}
          disabled={disabled}
          onClick={handleToggle}
          style={{
            width: 40,
            height: 20,
            border: "none",
            borderRadius: 10,
            background: enabled ? C.accent : C.border,
            cursor: disabled ? (busy ? "wait" : "not-allowed") : "pointer",
            opacity: disabled ? 0.55 : 1,
            position: "relative",
            transition: "background 0.18s, opacity 0.18s",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#fff",
              position: "absolute",
              top: 2,
              left: enabled ? 22 : 2,
              transition: "left 0.18s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {busy && <Loader2 size={10} color="#3f3f46" />}
          </span>
        </button>
      </div>

      {!available && availabilityMessage && (
        <div
          style={{
            marginTop: 10,
            border: `1px solid ${C.borderDim}`,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 6,
            padding: "8px 10px",
            color: C.t2,
            fontSize: 11,
            lineHeight: "15px",
          }}
        >
          {availabilityMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            border: "1px solid rgba(239,68,68,0.35)",
            background: "rgba(239,68,68,0.12)",
            borderRadius: 6,
            padding: "8px 10px",
            color: "#FECACA",
            fontSize: 11,
            lineHeight: "15px",
          }}
        >
          <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div>{error}</div>
            <button
              type="button"
              onClick={() => void refresh()}
              style={{
                marginTop: 4,
                background: "none",
                border: "none",
                color: "#FEE2E2",
                fontSize: 11,
                fontWeight: 600,
                textDecoration: "underline",
                textUnderlineOffset: 2,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Reessayer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
