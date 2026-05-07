import { useEffect, useState } from "react";
import { useDraggable } from "@dnd-kit/core";

import type { Collection, Note } from "../../../types";
import { useTheme } from "../../../lib/theme";
import { C, hexToRgba } from "../../../lib/colors";
import { Ic } from "../../icons";
import { resolveNoteAsset } from "../../../lib/note-assets";
import { noteExcerpt } from "../../../hooks/useNotesViews";

interface Props {
  note: Note;
  big?: boolean;
  collection?: Collection;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onExport: () => void;
}

export function NoteCard({
  note,
  big,
  collection,
  onOpen,
  onRename,
  onDelete,
  onTogglePin,
  onExport,
}: Props) {
  const theme = useTheme();
  const [hov, setHov] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.title);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!note.cover_hash || !note.cover_ext) {
      setCoverUrl(null);
      return;
    }
    let alive = true;
    resolveNoteAsset(note.cover_hash, note.cover_ext)
      .then((url) => {
        if (alive) setCoverUrl(url);
      })
      .catch(() => alive && setCoverUrl(null));
    return () => {
      alive = false;
    };
  }, [note.cover_hash, note.cover_ext]);

  useEffect(() => {
    if (editing) setDraft(note.title);
  }, [editing, note.title]);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `note-${note.id}`,
    data: { noteId: note.id, type: "note" },
  });

  const commit = () => {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== note.title) onRename(v);
  };

  const accent = collection?.color ?? theme.accent;
  const excerpt = noteExcerpt(note, 220);

  const transformStyle = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
    : undefined;

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => {
        setHov(false);
        setMenuOpen(false);
      }}
      style={{
        gridColumn: big ? "span 2" : undefined,
        gridRow: big ? "span 2" : undefined,
        background: hov ? hexToRgba(accent, 0.06) : "var(--sidebar)",
        border: `1px solid ${hov ? hexToRgba(accent, 0.4) : C.border}`,
        borderRadius: 10,
        padding: 12,
        position: "relative",
        cursor: isDragging ? "grabbing" : "pointer",
        opacity: isDragging ? 0.5 : 1,
        transform: transformStyle,
        transition: "background 0.12s, border 0.12s",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        overflow: "hidden",
        userSelect: "none",
      }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (editing) return;
        if ((e.target as HTMLElement).closest('[data-no-open]')) return;
        onOpen();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {/* Header row: icon + format badge + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 6,
            background: hexToRgba(accent, 0.15),
            color: accent,
            fontSize: 13,
          }}
        >
          {collection?.icon ?? "📝"}
        </span>
        {note.pinned && (
          <Ic.PinFill width={11} height={11} style={{ color: theme.accent }} />
        )}
        <div style={{ flex: 1 }} />
        {hov && (
          <div data-no-open style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: C.t2,
                cursor: "pointer",
                padding: 2,
                display: "flex",
              }}
              title="Plus"
            >
              <Ic.More width={14} height={14} />
            </button>
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 4,
                  background: "var(--bg)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: 4,
                  width: 160,
                  zIndex: 10,
                  boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
                }}
              >
                <MenuItem
                  label={note.pinned ? "Désépingler" : "Épingler"}
                  icon={<Ic.Pin width={11} height={11} />}
                  onClick={() => {
                    setMenuOpen(false);
                    onTogglePin();
                  }}
                />
                <MenuItem
                  label="Exporter .md"
                  icon={<Ic.Download width={11} height={11} />}
                  onClick={() => {
                    setMenuOpen(false);
                    onExport();
                  }}
                />
                <MenuItem
                  label="Supprimer"
                  icon={<Ic.Trash width={11} height={11} />}
                  destructive
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(note.title);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          data-no-open
          style={{
            background: "transparent",
            border: `1px solid ${theme.accent}`,
            borderRadius: 4,
            outline: "none",
            color: C.t1,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: theme.fontUI,
            padding: "3px 6px",
          }}
        />
      ) : (
        <h3
          style={{
            margin: 0,
            fontSize: 13.5,
            fontWeight: 600,
            color: C.t1,
            fontFamily: theme.fontUI,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {note.title || <span style={{ color: C.t3, fontWeight: 500 }}>Sans titre</span>}
        </h3>
      )}

      {/* Preview */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex" }}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            style={{
              width: "100%",
              objectFit: "cover",
              borderRadius: 6,
              opacity: 0.92,
            }}
          />
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: 11.5,
              lineHeight: 1.5,
              color: C.t3,
              fontFamily: theme.fontUI,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: big ? 8 : 4,
              WebkitBoxOrient: "vertical",
            }}
          >
            {excerpt || (
              <span style={{ fontStyle: "italic", color: C.t3 }}>Note vide</span>
            )}
          </p>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: theme.fontMono,
          fontSize: 9.5,
          color: C.t3,
        }}
      >
        <span>{note.date} {note.time}</span>
        {note.tags.length > 0 && (
          <>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {note.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}
              {note.tags.length > 3 ? ` +${note.tags.length - 3}` : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function MenuItem({
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
      data-no-open
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
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
