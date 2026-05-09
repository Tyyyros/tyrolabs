import { useEffect, useMemo, useRef, useState } from "react";
import type { Note } from "../../types";
import { useTheme } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { C, hexToRgba } from "../../lib/colors";
import { Ic } from "../icons";

interface Props {
  onClose: () => void;
  notes: Note[];
  onPick: (noteId: string) => void;
  onCreate: () => void;
}

export function NotePickerModal({ onClose, notes, onPick, onCreate }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => b.updated_at - a.updated_at);
    if (!q) return sorted;
    return sorted.filter((n) => n.title.toLowerCase().includes(q));
  }, [notes, search]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxHeight: 480,
          background: "var(--bg)",
          color: "var(--t1)",
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          boxShadow: theme.light
            ? "0 25px 60px -12px rgba(15,23,42,0.25), 0 0 0 1px rgba(15,23,42,0.04)"
            : "0 25px 60px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: theme.fontUI,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.accent }}>
            {t("notePicker.title")}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--t2)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
            }}
            title="Esc"
          >
            <Ic.Min width={14} height={14} strokeWidth={2.4} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 12px 8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              background: hexToRgba(theme.accent, 0.06),
              border: `1px solid ${C.border}`,
              borderRadius: 8,
            }}
          >
            <Ic.Search width={14} height={14} strokeWidth={2.2} />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("notePicker.search")}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--t1)",
                fontSize: 13,
                fontFamily: theme.fontUI,
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 8px" }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "30px 14px",
                textAlign: "center",
                color: "var(--t3)",
                fontSize: 12,
              }}
            >
              {t("notePicker.empty")}
            </div>
          ) : (
            filtered.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                onClick={() => onPick(note.id)}
              />
            ))
          )}
        </div>

        {/* Create */}
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            padding: 8,
          }}
        >
          <button
            onClick={onCreate}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: theme.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: theme.fontUI,
              letterSpacing: 0.2,
            }}
          >
            {t("notePicker.create")}
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteRow({ note, onClick }: { note: Note; onClick: () => void }) {
  const theme = useTheme();
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        padding: "9px 12px",
        background: hov ? hexToRgba(theme.accent, 0.12) : "transparent",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left",
        color: hov ? theme.accent : "var(--t1)",
        transition: "all 0.1s",
        marginBottom: 2,
      }}
    >
      <Ic.Note width={15} height={15} strokeWidth={2} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {note.title || "—"}
        </div>
      </div>
      <span
        style={{
          fontSize: 10.5,
          color: "var(--t3)",
          fontFamily: theme.fontMono,
          flexShrink: 0,
        }}
      >
        {note.date} {note.time}
      </span>
    </button>
  );
}
