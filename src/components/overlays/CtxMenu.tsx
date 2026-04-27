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
    <Ic.PinFill width={13} height={13} />
  ) : (
    <Ic.Pin width={13} height={13} strokeWidth={theme.iconStroke} />
  );
  const pinLabel = isPinned ? "Désépingler" : "Épingler";

  let rows: (RowDef | null)[];
  if (itemType === "text") {
    rows = [
      { label: "Copier", icon: <Ic.Copy width={13} height={13} strokeWidth={theme.iconStroke} />, action: handlers.copy },
      { label: "Éditer", icon: <Ic.Edit width={13} height={13} strokeWidth={theme.iconStroke} />, action: handlers.edit },
      { label: pinLabel, icon: pinIcon, action: handlers.pin },
      null,
      { label: "Copier texte brut", icon: <Ic.Clip width={13} height={13} strokeWidth={theme.iconStroke} />, action: handlers.copyPlain ?? (() => {}) },
      { label: "Supprimer", icon: <Ic.Trash width={13} height={13} strokeWidth={theme.iconStroke} />, action: handlers.delete, danger: true },
    ];
  } else if (itemType === "image") {
    rows = [
      { label: "Copier l'image", icon: <Ic.Copy width={13} height={13} strokeWidth={theme.iconStroke} />, action: handlers.copy },
      { label: "Ouvrir dans Paint", icon: <Ic.Paint width={13} height={13} strokeWidth={theme.iconStroke} />, action: handlers.open ?? (() => {}) },
      { label: pinLabel, icon: pinIcon, action: handlers.pin },
      null,
      { label: "Supprimer", icon: <Ic.Trash width={13} height={13} strokeWidth={theme.iconStroke} />, action: handlers.delete, danger: true },
    ];
  } else {
    rows = [
      { label: "Ouvrir", icon: <Ic.ArrowUp width={13} height={13} strokeWidth={theme.iconStroke} />, action: handlers.open ?? (() => {}) },
      { label: "Copier", icon: <Ic.Copy width={13} height={13} strokeWidth={theme.iconStroke} />, action: handlers.copy },
      { label: "Éditer", icon: <Ic.Edit width={13} height={13} strokeWidth={theme.iconStroke} />, action: handlers.edit },
      { label: pinLabel, icon: pinIcon, action: handlers.pin },
      null,
      { label: "Supprimer", icon: <Ic.Trash width={13} height={13} strokeWidth={theme.iconStroke} />, action: handlers.delete, danger: true },
    ];
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: ax,
        top: ay,
        background: "#17171A",
        border: `1px solid ${C.border}`,
        borderRadius: 7,
        overflow: "hidden",
        zIndex: 500,
        minWidth: 210,
        boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
        padding: "4px 0",
      }}
    >
      <div style={{ padding: "8px 12px 6px", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
        <div
          style={{
            fontSize: 10,
            color: C.t2,
            fontFamily: theme.fontMono,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 185,
          }}
        >
          {preview}
        </div>
      </div>
      {rows.map((it, i) =>
        it === null ? (
          <div key={i} style={{ height: 1, background: C.border, margin: "4px 0" }} />
        ) : (
          <CtxItem key={i} {...it} />
        ),
      )}
    </div>
  );
}

function CtxItem({ label, icon, action, danger }: RowDef) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={action}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        padding: "7px 12px",
        display: "flex",
        alignItems: "center",
        gap: 9,
        background: hov ? (danger ? C.dangerDim : C.accentDim) : "transparent",
        border: "none",
        cursor: "pointer",
        transition: "all 0.08s",
        color: danger ? (hov ? C.danger : "#8A4040") : hov ? C.t1 : "#AAAAB2",
        fontSize: 12,
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <span style={{ opacity: 0.75 }}>{icon}</span>
      {label}
    </button>
  );
}
