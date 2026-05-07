import { useMemo } from "react";

import type { Collection, Note } from "../../../types";
import { useTheme } from "../../../lib/theme";
import { C, hexToRgba } from "../../../lib/colors";
import { Ic } from "../../icons";
import { NoteCard } from "./NoteCard";

interface Props {
  notes: Note[];
  collections: Collection[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onExport: (id: string) => void;
  emptyHint?: string;
}

export function NotesDashboard({
  notes,
  collections,
  onOpen,
  onCreate,
  onRename,
  onDelete,
  onTogglePin,
  onExport,
  emptyHint,
}: Props) {
  const collectionById = useMemo(() => {
    const map = new Map<string, Collection>();
    for (const c of collections) map.set(c.id, c);
    return map;
  }, [collections]);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
      {notes.length === 0 ? (
        <EmptyState onCreate={onCreate} hint={emptyHint} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gridAutoRows: "180px",
            gridAutoFlow: "dense",
            gap: 12,
          }}
        >
          <NewNoteCard onClick={onCreate} />
          {notes.map((note, i) => (
            <NoteCard
              key={note.id}
              note={note}
              big={i % 7 === 0 && i > 0}
              collection={note.collection_id ? collectionById.get(note.collection_id) : undefined}
              onOpen={() => onOpen(note.id)}
              onRename={(title) => onRename(note.id, title)}
              onDelete={() => onDelete(note.id)}
              onTogglePin={() => onTogglePin(note.id)}
              onExport={() => onExport(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NewNoteCard({ onClick }: { onClick: () => void }) {
  const theme = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        background: hexToRgba(theme.accent, 0.04),
        border: `1.5px dashed ${hexToRgba(theme.accent, 0.4)}`,
        borderRadius: 10,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: theme.accent,
        fontFamily: theme.fontUI,
        fontSize: 12,
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hexToRgba(theme.accent, 0.1);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = hexToRgba(theme.accent, 0.04);
      }}
    >
      <Ic.Plus width={20} height={20} strokeWidth={1.8} />
      <span>Nouvelle note</span>
    </button>
  );
}

function EmptyState({ onCreate, hint }: { onCreate: () => void; hint?: string }) {
  const theme = useTheme();
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        color: C.t3,
        fontFamily: theme.fontUI,
      }}
    >
      <Ic.Note width={42} height={42} strokeWidth={1.4} style={{ opacity: 0.4 }} />
      <div style={{ fontSize: 13, color: C.t2 }}>{hint ?? "Aucune note"}</div>
      <button
        onClick={onCreate}
        style={{
          background: theme.accent,
          color: "#fff",
          border: "none",
          padding: "8px 16px",
          borderRadius: 6,
          fontSize: 12,
          fontFamily: theme.fontUI,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Ic.Plus width={13} height={13} strokeWidth={2.2} />
        Créer une note
      </button>
    </div>
  );
}
