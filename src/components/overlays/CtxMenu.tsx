import { useState, type ReactNode } from "react";
import type { AnyClip, ItemType, TextClip, ImageClip } from "../../types";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";


export interface CtxHandlers {
  copy: () => void;
  edit: () => void;
  pin: () => void;
  delete: () => void;
  copyPlain?: () => void;
  open?: () => void;
}

interface Props {
  x: number;
  y: number;
  item: AnyClip;
  itemType: ItemType;
  handlers: CtxHandlers;
}

interface RowDef {
  label: string;
  icon: ReactNode;
  action: () => void;
  danger?: boolean;
}

export function CtxMenu({ x, y, item, itemType, handlers }: Props) {
  const theme = useTheme();
  const ax = Math.min(x, window.innerWidth - 230);
  const ay = Math.min(y, window.innerHeight - 260);

  const preview =
    itemType === "image"
      ? (item as ImageClip).hash
      : (() => {
            const t = (item as TextClip).text || "";
            return t.substring(0, 52) + (t.length > 52 ? "\u2026" : "");
          })();

  const isPinned = (item as TextClip | ImageClip).pinned;
  const pinIcon = isPinned ? (
    <Ic.PinFill width={17} height={17} />
  ) : (
    <Ic.Pin width={17} height={17} strokeWidth={2.2} />
  );
  const pinLabel = isPinned ? "Désépingler" : "Épingler";

  let rows: (RowDef | null)[];
  if (itemType === "text") {
    rows = [
      { label: "Copier", icon: <Ic.Copy width={17} height={17} strokeWidth={2.2} />, action: handlers.copy },
      { label: "Éditer", icon: <Ic.Edit width={17} height={17} strokeWidth={2.2} />, action: handlers.edit },
      { label: pinLabel, icon: pinIcon, action: handlers.pin },
      null,
      { label: "Copier texte brut", icon: <Ic.Clip width={17} height={17} strokeWidth={2.2} />, action: handlers.copyPlain ?? (() => {}) },
      { label: "Supprimer", icon: <Ic.Trash width={17} height={17} strokeWidth={2.2} />, action: handlers.delete, danger: true },
    ];
  } else if (itemType === "image") {
    rows = [
      { label: "Copier l'image", icon: <Ic.Copy width={17} height={17} strokeWidth={2.2} />, action: handlers.copy },
      { label: "Ouvrir dans Paint", icon: <Ic.Paint width={17} height={17} strokeWidth={2.2} />, action: handlers.open ?? (() => {}) },
      { label: "Renommer", icon: <Ic.Edit width={17} height={17} strokeWidth={2.2} />, action: handlers.edit },
      { label: pinLabel, icon: pinIcon, action: handlers.pin },
      null,
      { label: "Supprimer", icon: <Ic.Trash width={17} height={17} strokeWidth={2.2} />, action: handlers.delete, danger: true },
    ];
  } else {
    rows = [
      { label: "Ouvrir", icon: <Ic.ArrowUp width={17} height={17} strokeWidth={2.2} />, action: handlers.open ?? (() => {}) },
      { label: "Copier", icon: <Ic.Copy width={17} height={17} strokeWidth={2.2} />, action: handlers.copy },
      { label: "Éditer", icon: <Ic.Edit width={17} height={17} strokeWidth={2.2} />, action: handlers.edit },
      { label: pinLabel, icon: pinIcon, action: handlers.pin },
      null,
      { label: "Supprimer", icon: <Ic.Trash width={17} height={17} strokeWidth={2.2} />, action: handlers.delete, danger: true },
    ];
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: ax,
        top: ay,
        background: theme.light ? "#FFFFFF" : "#262626",
        border: theme.light ? "1px solid #E5E7EB" : `1px solid ${C.border}`,
        borderRadius: 10,
        overflow: "hidden",
        zIndex: 500,
        minWidth: 230,
        boxShadow: theme.light
          ? "0 12px 32px -8px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.04)"
          : "0 25px 60px -12px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.03)",
        padding: "5px 0",
      }}
    >
      <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
        <div
          style={{
            fontSize: 10,
            color: theme.accent, // Use accent for preview title
            fontWeight: 600,
            fontFamily: theme.fontMono,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            opacity: 0.8,
          }}
        >
          {preview}
        </div>
      </div>
      {rows.map((it, i) =>
        it === null ? (
          <div key={i} style={{ height: 1, background: C.border, margin: "5px 0" }} />
        ) : (
          <CtxItem key={i} {...it} />
        ),
      )}
    </div>
  );
}

function CtxItem({ label, icon, action, danger }: RowDef) {
  const [hov, setHov] = useState(false);
  const theme = useTheme();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        action();
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        padding: "9px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: hov ? (danger ? C.danger : theme.accent) : "transparent",
        border: "none",
        cursor: "pointer",
        transition: "all 0.1s ease",
        color: hov ? "#fff" : (danger ? C.danger : "var(--t1)"),
        fontSize: 13,
        textAlign: "left",
        fontFamily: theme.fontUI,
      }}
    >
      <span style={{ display: "flex", opacity: hov ? 1 : 0.7, transform: hov ? "scale(1.05)" : "scale(1)" }}>{icon}</span>
      <span style={{ fontWeight: hov ? 600 : 400 }}>{label}</span>
    </button>
  );
}
