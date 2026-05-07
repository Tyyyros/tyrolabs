import { useEffect, useMemo, useRef, useState } from "react";

import type { Collection, Note } from "../../../types";
import { useTheme } from "../../../lib/theme";
import { C, hexToRgba } from "../../../lib/colors";
import { Ic } from "../../icons";
import { TagPicker } from "./TagPicker";
import { RichTextEditor } from "./editor/RichTextEditor";

interface Props {
  note: Note;
  collections: Collection[];
  allTags: string[];
  onClose: () => void;
  onChange: (patch: {
    title?: string;
    body?: string;
    tags?: string[];
    collection_id?: string;
  }) => void;
  onDelete: () => void;
  onExport: () => void;
  onTogglePin: () => void;
}

export function NoteEditor({
  note,
  collections,
  allTags,
  onClose,
  onChange,
  onDelete,
  onExport,
  onTogglePin,
}: Props) {
  const theme = useTheme();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Sync local state when note prop changes (id swap or external update).
  const lastNoteId = useRef(note.id);
  useEffect(() => {
    if (lastNoteId.current !== note.id) {
      setTitle(note.title);
      setBody(note.body);
      lastNoteId.current = note.id;
    }
  }, [note.id, note.title, note.body]);

  // Auto-save body with debounce (500 ms).
  const bodyTimer = useRef<number | null>(null);
  useEffect(() => {
    if (body === note.body) return;
    if (bodyTimer.current) window.clearTimeout(bodyTimer.current);
    bodyTimer.current = window.setTimeout(() => {
      onChange({ body });
      bodyTimer.current = null;
    }, 500);
    return () => {
      if (bodyTimer.current) {
        window.clearTimeout(bodyTimer.current);
        bodyTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  // Flush pending body on unmount / note swap.
  useEffect(() => {
    return () => {
      if (bodyTimer.current) {
        window.clearTimeout(bodyTimer.current);
        if (body !== note.body) onChange({ body });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const commitTitle = () => {
    const v = title.trim();
    if (v !== note.title) onChange({ title: v });
  };

  const collection = useMemo(
    () => collections.find((c) => c.id === note.collection_id) ?? null,
    [collections, note.collection_id],
  );
  const accent = collection?.color ?? theme.accent;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderBottom: `1px solid ${C.border}`,
          background: "var(--sidebar)",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onClose}
          title="Retour au tableau de bord"
          style={{
            background: "transparent",
            border: "none",
            color: C.t2,
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <Ic.ArrowL width={16} height={16} strokeWidth={1.8} />
        </button>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="Titre…"
          style={{
            flex: "1 1 280px",
            background: "transparent",
            border: "none",
            outline: "none",
            color: C.t1,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: theme.fontUI,
            padding: "2px 4px",
          }}
        />

        <div style={{ position: "relative" }}>
          <button
            data-no-open
            onClick={() => setCollectionPickerOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: hexToRgba(accent, 0.1),
              border: `1px solid ${hexToRgba(accent, 0.3)}`,
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 11,
              color: accent,
              fontFamily: theme.fontUI,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 12 }}>{collection?.icon ?? "📁"}</span>
            <span>{collection?.name ?? "Sans collection"}</span>
            <Ic.ChevD width={10} height={10} />
          </button>
          {collectionPickerOpen && (
            <CollectionMenu
              collections={collections}
              currentId={note.collection_id ?? null}
              onPick={(id) => {
                setCollectionPickerOpen(false);
                onChange({ collection_id: id ?? "" });
              }}
              onClose={() => setCollectionPickerOpen(false)}
            />
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMoreOpen((v) => !v)}
            title="Plus"
            style={{
              background: "transparent",
              border: "none",
              color: C.t2,
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <Ic.More width={16} height={16} />
          </button>
          {moreOpen && (
            <div
              style={menuStyle}
              onMouseLeave={() => setMoreOpen(false)}
            >
              <MoreItem
                label={note.pinned ? "Désépingler" : "Épingler"}
                icon={<Ic.Pin width={11} height={11} />}
                onClick={() => {
                  setMoreOpen(false);
                  onTogglePin();
                }}
              />
              <MoreItem
                label="Exporter .md"
                icon={<Ic.Download width={11} height={11} />}
                onClick={() => {
                  setMoreOpen(false);
                  onExport();
                }}
              />
              <MoreItem
                label="Supprimer"
                icon={<Ic.Trash width={11} height={11} />}
                destructive
                onClick={() => {
                  setMoreOpen(false);
                  onDelete();
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tag row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          borderBottom: `1px solid ${C.borderDim}`,
        }}
      >
        <Ic.Tag width={12} height={12} style={{ color: C.t3 }} />
        <TagPicker
          tags={note.tags}
          suggestions={allTags}
          onChange={(tags) => onChange({ tags })}
        />
      </div>

      {/* Editor body */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <RichTextEditor key={note.id} value={body} onChange={setBody} />
      </div>
    </div>
  );
}

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  right: 0,
  marginTop: 4,
  background: "var(--bg)",
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: 4,
  width: 160,
  zIndex: 30,
  boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
};

function MoreItem({
  label,
  icon,
  destructive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}) {
  const theme = useTheme();
  const [hov, setHov] = useState(false);
  const color = destructive ? "#EF4444" : hov ? theme.accent : C.t1;
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        fontSize: 11.5,
        cursor: "pointer",
        borderRadius: 4,
        background: hov ? C.rowHov : "transparent",
        color,
      }}
    >
      <span style={{ display: "flex" }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

interface CollectionMenuProps {
  collections: Collection[];
  currentId: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
}

function CollectionMenu({ collections, currentId, onPick, onClose }: CollectionMenuProps) {
  useEffect(() => {
    const close = () => onClose();
    const t = window.setTimeout(() => document.addEventListener("click", close), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", close);
    };
  }, [onClose]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 4,
        background: "var(--bg)",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: 4,
        minWidth: 200,
        zIndex: 30,
        boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        maxHeight: 280,
        overflowY: "auto",
      }}
    >
      <CollectionPickRow
        active={currentId === null}
        icon="∅"
        label="Sans collection"
        onClick={() => onPick(null)}
      />
      {collections.map((c) => (
        <CollectionPickRow
          key={c.id}
          active={currentId === c.id}
          icon={c.icon}
          label={c.name}
          color={c.color}
          onClick={() => onPick(c.id)}
        />
      ))}
    </div>
  );
}

function CollectionPickRow({
  active,
  icon,
  label,
  color,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  const theme = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        fontSize: 11.5,
        cursor: "pointer",
        borderRadius: 4,
        background: active ? hexToRgba(color ?? theme.accent, 0.18) : hov ? C.rowHov : "transparent",
        color: active ? color ?? theme.accent : C.t1,
      }}
    >
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {active && <Ic.PinFill width={9} height={9} />}
    </div>
  );
}
