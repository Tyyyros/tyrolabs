import { useAutostart } from "../../hooks/useAutostart";
import { useI18n } from "../../lib/i18n";
import { C } from "../../lib/colors";
import { Toggle } from "../ui/Toggle";

export function AutostartToggle() {
  const { t } = useI18n();
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

  const handleChange = (v: boolean) => {
    if (!disabled) {
      void setEnabled(v);
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 0",
          borderBottom: `1px solid ${C.borderDim}`,
        }}
      >
        <span style={{ fontSize: 13 }}>{t("settings.autostart.label")}</span>
        <div
          style={{
            opacity: disabled ? 0.45 : 1,
            cursor: disabled ? (busy ? "wait" : "not-allowed") : "auto",
            pointerEvents: disabled ? "none" : "auto",
          }}
          aria-busy={busy}
        >
          <Toggle value={enabled} onChange={handleChange} />
        </div>
      </div>

      {!available && availabilityMessage && (
        <div
          style={{
            padding: "6px 0 10px",
            color: C.t3,
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
            padding: "6px 0 10px",
            color: "#FCA5A5",
            fontSize: 11,
            lineHeight: "15px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>{error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            style={{
              background: "none",
              border: "none",
              color: "#FCA5A5",
              fontSize: 11,
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: 2,
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          >
            {t("settings.autostart.retry")}
          </button>
        </div>
      )}
    </>
  );
}
