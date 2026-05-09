import { useState, useEffect, useRef, useMemo, type ComponentType, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTheme } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import type { StringKey } from "../../lib/strings";
import { C } from "../../lib/colors";
import { Ic, type IcProps } from "../icons";
import type { TabId } from "../../types";

const SB_ICON = 20;

type IcComponent = ComponentType<IcProps>;

/** Identifiants stables des items sidebar — utilisés pour le DnD et la
 *  persistance (clé `app.settings.sidebar_order`). Tout nouvel item doit
 *  être ajouté ici ; les ids inconnus au chargement sont ignorés et les
 *  canoniques manquants append à la fin (résilient aux migrations). */
type SidebarItemId =
  | "text"
  | "images"
  | "links"
  | "notes"
  | "password"
  | "capture"
  | "ocr"
  | "settings"
  | "system";

const CANONICAL_ORDER: SidebarItemId[] = [
  "text",
  "images",
  "links",
  "notes",
  "password",
  "capture",
  "ocr",
  "settings",
  "system",
];

const NAV_META: Record<SidebarItemId, { Icon: IcComponent; labelKey: StringKey; isTab: boolean }> = {
  text: { Icon: Ic.Text, labelKey: "nav.text", isTab: true },
  images: { Icon: Ic.Image, labelKey: "nav.images", isTab: true },
  links: { Icon: Ic.Link, labelKey: "nav.links", isTab: true },
  notes: { Icon: Ic.Note, labelKey: "nav.notes", isTab: true },
  password: { Icon: Ic.Lock, labelKey: "nav.password", isTab: true },
  capture: { Icon: Ic.Camera, labelKey: "nav.capture", isTab: false },
  ocr: { Icon: Ic.ScanText, labelKey: "nav.capture.ocr", isTab: false },
  settings: { Icon: Ic.Settings, labelKey: "nav.settings", isTab: false },
  system: { Icon: Ic.Cpu, labelKey: "nav.system", isTab: false },
};

function reconcileOrder(persisted: string[] | null | undefined): SidebarItemId[] {
  if (!persisted) return [...CANONICAL_ORDER];
  const known = new Set(CANONICAL_ORDER as string[]);
  const cleaned = persisted.filter((id): id is SidebarItemId => known.has(id));
  const seen = new Set(cleaned);
  for (const id of CANONICAL_ORDER) {
    if (!seen.has(id)) cleaned.push(id);
  }
  return cleaned;
}

interface SbBtnProps {
  Icon: IcComponent;
  label: string;
  active?: boolean;
  onClick: () => void;
  isDragging?: boolean;
}

function SbBtn({ Icon, label, active, onClick, isDragging }: SbBtnProps) {
  const [hov, setHov] = useState(false);
  const theme = useTheme();
  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        height: 46,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active
          ? C.accentDim
          : isDragging
            ? `rgba(${theme.accentRGB}, 0.18)`
            : hov
              ? "rgba(255,255,255,0.035)"
              : "transparent",
        border: "none",
        borderLeft: active ? `2px solid ${C.accent}` : "2px solid transparent",
        cursor: isDragging ? "grabbing" : "pointer",
        color: active ? theme.accent : hov ? "var(--t1)" : `rgba(${theme.accentRGB}, 0.7)`,
        transition: "all 0.12s",
        flexShrink: 0,
      }}
    >
      <Icon width={SB_ICON} height={SB_ICON} strokeWidth={theme.iconStroke} />
    </button>
  );
}

interface CaptureMenuItemProps {
  label: string;
  shortcut?: string;
  onClick: () => void;
}

function CaptureMenuItem({ label, shortcut, onClick }: CaptureMenuItemProps) {
  const [hov, setHov] = useState(false);
  const theme = useTheme();
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "7px 10px",
        fontSize: 12,
        cursor: "pointer",
        borderRadius: 5,
        color: hov ? theme.accent : C.t1,
        background: hov ? C.rowHov : "transparent",
        transition: "background 0.12s, color 0.12s",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <span>{label}</span>
      {shortcut && (
        <span
          style={{
            fontFamily: theme.fontMono,
            fontSize: 10.5,
            color: hov ? theme.accent : C.t3,
            letterSpacing: "0.03em",
          }}
        >
          {shortcut}
        </span>
      )}
    </div>
  );
}

interface CaptureBtnProps {
  onCapture: () => void;
  pulse: number;
  delayedTrigger: number;
  isDragging?: boolean;
}

function CaptureBtn({ onCapture, pulse, delayedTrigger, isDragging }: CaptureBtnProps) {
  const [hov, setHov] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [pulsing, setPulsing] = useState(false);
  const theme = useTheme();
  const { t } = useI18n();
  const timerRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const openMenu = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({
      left: rect.right + 4,
      bottom: window.innerHeight - rect.bottom,
    });
    setShowMenu(true);
  };
  const toggleMenu = () => {
    if (showMenu) setShowMenu(false);
    else openMenu();
  };

  // Visual feedback when an external trigger (e.g. Alt+C) fires the capture.
  useEffect(() => {
    if (pulse === 0) return; // initial render — skip
    setPulsing(true);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = window.setTimeout(() => {
      setPulsing(false);
      pulseTimerRef.current = null;
    }, 450);
    return () => {
      if (pulseTimerRef.current) {
        window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
    };
  }, [pulse]);

  const startCapture = () => {
    onCapture();
    setShowMenu(false);
  };

  const startDelayed = () => {
    setShowMenu(false);
    setCountdown(5);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c !== null && c > 1) return c - 1;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        onCapture(); // Trigger now
        return null;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // External trigger (e.g. tray menu "Delayed capture") fires the same
  // 5s countdown flow as the dropdown entry — keeps visual feedback consistent.
  useEffect(() => {
    if (delayedTrigger === 0) return;
    startDelayed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayedTrigger]);

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showMenu]);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <button
        ref={buttonRef}
        onClick={() => (countdown === null ? startCapture() : null)}
        title={t("nav.capture")}
        style={{
          width: "100%",
          height: 46,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: pulsing
            ? `rgba(${theme.accentRGB}, 0.35)`
            : isDragging
              ? `rgba(${theme.accentRGB}, 0.18)`
              : hov
                ? `rgba(${theme.accentRGB}, 0.15)`
                : "transparent",
          border: "none",
          cursor: isDragging ? "grabbing" : countdown === null ? "pointer" : "default",
          color: pulsing ? theme.accent : hov ? theme.accent : `rgba(${theme.accentRGB}, 0.7)`,
          transition: "all 0.18s",
          position: "relative",
          flexShrink: 0,
          boxShadow: pulsing ? `0 0 0 2px ${theme.accent} inset` : "none",
        }}
      >
        {countdown !== null ? (
          <span style={{ fontSize: 16, fontWeight: "bold", color: theme.accent }}>{countdown}</span>
        ) : (
          <Ic.Camera width={SB_ICON} height={SB_ICON} strokeWidth={theme.iconStroke} />
        )}

        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            toggleMenu();
          }}
          style={{
            position: "absolute",
            right: -4,
            bottom: -6,
            padding: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s",
            color: theme.accent,
            opacity: hov || showMenu ? 1 : 0.4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <Ic.ChevD width={14} height={14} strokeWidth={3} />
        </div>
      </button>

      {showMenu && menuPos &&
        createPortal(
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: menuPos.left,
              bottom: menuPos.bottom,
              background: "var(--bg)",
              color: C.t1,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 4,
              zIndex: 1000,
              width: 160,
              fontFamily: theme.fontUI,
              boxShadow: `0 12px 28px -8px rgba(0,0,0,0.55), 0 0 0 1px ${theme.accent}10`,
            }}
          >
            <CaptureMenuItem
              label={t("nav.capture.normal")}
              shortcut="Alt+C"
              onClick={startCapture}
            />
            <CaptureMenuItem label={t("nav.capture.delayed")} onClick={startDelayed} />
          </div>,
          document.body,
        )}
    </div>
  );
}

interface SortableSlotProps {
  id: SidebarItemId;
  children: (drag: { isDragging: boolean }) => React.ReactNode;
}

function SortableSlot({ id, children }: SortableSlotProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 5 : 0,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children({ isDragging })}
    </div>
  );
}

interface Props {
  activeTab: TabId;
  onTab: (id: TabId) => void;
  onSettings: () => void;
  onSystem: () => void;
  onCapture: () => void;
  onOcrCapture: () => void;
  capturePulse: number;
  delayedCaptureTrigger: number;
}

export function Sidebar({
  activeTab,
  onTab,
  onSettings,
  onSystem,
  onCapture,
  onOcrCapture,
  capturePulse,
  delayedCaptureTrigger,
}: Props) {
  const { t } = useI18n();
  const [order, setOrder] = useState<SidebarItemId[]>(CANONICAL_ORDER);

  // Hydrate from app.settings.sidebar_order at mount.
  useEffect(() => {
    invoke<{ sidebar_order?: string[] | null }>("get_app_settings")
      .then((s) => {
        const reconciled = reconcileOrder(s.sidebar_order);
        setOrder(reconciled);
      })
      .catch(() => {
        // Store unavailable — keep canonical order.
      });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as SidebarItemId);
      const newIndex = prev.indexOf(over.id as SidebarItemId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      invoke("set_app_settings", { settings: { sidebar_order: next } }).catch((e) => {
        console.error("[set_app_settings] sidebar_order failed:", e);
      });
      return next;
    });
  };

  const renderItem = useMemo(
    () => (id: SidebarItemId, isDragging: boolean) => {
      const meta = NAV_META[id];
      const label = t(meta.labelKey);
      switch (id) {
        case "capture":
          return (
            <CaptureBtn
              onCapture={onCapture}
              pulse={capturePulse}
              delayedTrigger={delayedCaptureTrigger}
              isDragging={isDragging}
            />
          );
        case "ocr":
          return <SbBtn Icon={Ic.ScanText} label={label} onClick={onOcrCapture} isDragging={isDragging} />;
        case "settings":
          return <SbBtn Icon={Ic.Settings} label={label} onClick={onSettings} isDragging={isDragging} />;
        case "system":
          return <SbBtn Icon={Ic.Cpu} label={label} onClick={onSystem} isDragging={isDragging} />;
        default: {
          // Tab buttons (text/images/links/notes/password)
          return (
            <SbBtn
              Icon={meta.Icon}
              label={label}
              active={activeTab === id}
              onClick={() => onTab(id as TabId)}
              isDragging={isDragging}
            />
          );
        }
      }
    },
    [
      activeTab,
      onTab,
      onSettings,
      onSystem,
      onCapture,
      onOcrCapture,
      capturePulse,
      delayedCaptureTrigger,
      t,
    ],
  );

  return (
    <div
      style={{
        width: 54,
        background: "var(--sidebar)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        borderRight: `1px solid ${C.border}`,
        paddingTop: 4,
        paddingBottom: 4,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((id) => (
            <SortableSlot key={id} id={id}>
              {({ isDragging }) => renderItem(id, isDragging)}
            </SortableSlot>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
