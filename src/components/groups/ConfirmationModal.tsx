import { motion, AnimatePresence } from "framer-motion";
import { C } from "../../lib/colors";
import { useTheme } from "../../lib/theme";
import { Ic } from "../icons";

export function ConfirmationModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 320,
            background: theme.bg,
            border: `1px solid ${theme.accent}`,
            borderRadius: 10,
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            overflow: "hidden",
            color: C.t1,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${C.borderDim}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.t1 }}>{title}</h2>
            <button
              onClick={onCancel}
              style={{
                background: "transparent",
                border: "none",
                color: C.t3,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Ic.X width={16} height={16} strokeWidth={theme.iconStroke} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "16px 18px", fontSize: 13, color: C.t2, lineHeight: 1.5 }}>
            {message}
          </div>

          {/* Footer */}
          <div style={{ padding: "0 18px 18px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={onCancel}
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: C.t2,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: "8px 16px",
                background: C.danger,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                transition: "background 0.2s",
              }}
            >
              Supprimer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
