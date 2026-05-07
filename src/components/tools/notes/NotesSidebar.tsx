import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";

import type { Collection } from "../../../types";
import { useTheme } from "../../../lib/theme";
import { C, hexToRgba } from "../../../lib/colors";
import { Ic } from "../../icons";

interface Props {
  collections: Collection[];
  collectionCounts: Record<string, number>;
  activeCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onCreateCollection: () => void;
  onDeleteCollection: (id: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  tags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  totalCount: number;
}

export function NotesSidebar({
  collections,
  collectionCounts,
  activeCollectionId,
  onSelectCollection,
  onCreateCollection,
  onDeleteCollection,
  onRenameCollection,
  tags,
  activeTags,
  onToggleTag,
  onClearTags,
  totalCount,
}: Props) {
  const theme = useTheme();

  return (
    <aside
      style={{
        width: 200,
        flexShrink: 0,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        background: "var(--sidebar)",
        overflowY: "auto",
      }}
    >
      <Section label="Collections" action={
        <button
          onClick={onCreateCollection}
          title="Nouvelle collection"
          style={iconBtnStyle(theme.accent)}
        >
          <Ic.Plus width={11} height={11} strokeWidth={2.2} />
        </button>
      }>
        <SidebarItem
          label="Toutes les notes"
          icon={<Ic.Note width={13} height={13} />}
          active={activeCollectionId === null}
          onClick={() => onSelectCollection(null)}
          count={totalCount}
        />
        {collections.map((c) => (
          <CollectionRow
            key={c.id}
            collection={c}
            active={activeCollectionId === c.id}
            count={collectionCounts[c.id] ?? 0}
            onSelect={() => onSelectCollection(c.id)}
            onRename={(name) => onRenameCollection(c.id, name)}
            onDelete={() => onDeleteCollection(c.id)}
          />
        ))}
      </Section>

      <Section
        label="Tags"
        action={
          activeTags.length > 0 ? (
            <button
              onClick={onClearTags}
              title="Effacer les tags actifs"
              style={iconBtnStyle(C.t3)}
            >
              <Ic.X width={10} height={10} strokeWidth={2.2} />
            </button>
          ) : null
        }
      >
        {tags.length === 0 ? (
          <div style={{ padding: "4px 12px", fontSize: 10.5, color: C.t3 }}>
            Aucun tag
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 8px 6px" }}>
            {tags.map((t) => {
              const active = activeTags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => onToggleTag(t)}
                  style={{
                    fontSize: 10.5,
                    padding: "2px 8px",
                    borderRadius: 10,
                    border: `1px solid ${active ? theme.accent : C.borderDim}`,
                    background: active ? hexToRgba(theme.accent, 0.18) : "transparent",
                    color: active ? theme.accent : C.t2,
                    fontFamily: theme.fontMono,
                    cursor: "pointer",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </Section>
    </aside>
  );
}

function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <div style={{ padding: "12px 0 6px" }}>
      <div
        style={{
          padding: "0 12px 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: theme.fontMono,
          fontSize: 9.5,
          letterSpacing: "0.08em",
          color: C.t3,
          textTransform: "uppercase",
        }}
      >
        <span>{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    background: "transparent",
    border: "none",
    color,
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  };
}

interface RowProps {
  collection: Collection;
  active: boolean;
  count: number;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function CollectionRow({ collection, active, count, onSelect, onRename, onDelete }: RowProps) {
  const theme = useTheme();
  const [hov, setHov] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(collection.name);

  const { isOver, setNodeRef } = useDroppable({
    id: `notes-collection-${collection.id}`,
    data: { collectionId: collection.id, silo: "notes" },
  });

  const commit = () => {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== collection.name) onRename(v);
    else setDraft(collection.name);
  };

  const background =
    isOver
      ? hexToRgba(collection.color, 0.32)
      : active
        ? hexToRgba(collection.color, 0.18)
        : hov
          ? C.rowHov
          : "transparent";

  return (
    <div
      ref={setNodeRef}
      onClick={!editing ? onSelect : undefined}
      onDoubleClick={() => setEditing(true)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "5px 12px",
        gap: 8,
        cursor: "pointer",
        background,
        borderLeft: active ? `2px solid ${collection.color}` : "2px solid transparent",
        transition: "background 0.1s",
      }}
    >
      <span style={{ fontSize: 13 }}>{collection.icon}</span>
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
              setDraft(collection.name);
            }
          }}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: `1px solid ${theme.accent}`,
            borderRadius: 3,
            color: C.t1,
            fontSize: 11.5,
            fontFamily: theme.fontUI,
            padding: "1px 4px",
          }}
        />
      ) : (
        <span
          style={{
            flex: 1,
            fontSize: 11.5,
            color: active ? C.t1 : C.t2,
            fontFamily: theme.fontUI,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {collection.name}
        </span>
      )}
      {count > 0 && (
        <span
          style={{
            fontSize: 9.5,
            fontFamily: theme.fontMono,
            color: C.t3,
            minWidth: 14,
            textAlign: "right",
          }}
        >
          {count}
        </span>
      )}
      {hov && !editing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Supprimer la collection"
          style={iconBtnStyle(C.t3)}
        >
          <Ic.Trash width={11} height={11} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

interface ItemProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
}

function SidebarItem({ label, icon, active, onClick, count }: ItemProps) {
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
        padding: "5px 12px",
        gap: 8,
        cursor: "pointer",
        background: active ? hexToRgba(theme.accent, 0.18) : hov ? C.rowHov : "transparent",
        borderLeft: active ? `2px solid ${theme.accent}` : "2px solid transparent",
        color: active ? theme.accent : C.t2,
      }}
    >
      <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 11.5, fontFamily: theme.fontUI }}>{label}</span>
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: 9.5, fontFamily: theme.fontMono, color: C.t3 }}>{count}</span>
      )}
    </div>
  );
}
