import { useState, useRef, useEffect } from "react";
import { C, hexToRgba } from "../../lib/colors";
import { useTheme } from "../../lib/theme";
import { Ic } from "../icons";
import { ConfirmationModal } from "./ConfirmationModal";
import type { Collection } from "../../types";
import { useDroppable } from "@dnd-kit/core";

interface Props {
  collections: Collection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onCreateCollection: () => void;
  onDeleteCollection: (id: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  collectionClipCounts: Record<string, number>;
}

function CollectionSlot({
  collection,
  active,
  onClick,
  onDelete,
  onRename,
  count,
}: {
  collection: Collection;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  count: number;
}) {
  const [hov, setHov] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(collection.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const { isOver, setNodeRef } = useDroppable({ id: `collection-drop-${collection.id}`, data: { collectionId: collection.id } });

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== collection.name) {
      onRename(trimmed);
    } else {
      setEditName(collection.name);
    }
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        minWidth: 90,
        maxWidth: 140,
        height: 36,
        borderRadius: 8,
        border: `1px solid ${collection.color}`,
        background: "transparent",
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        gap: 7,
        cursor: "pointer",
        transition: "border-color 0.12s, background 0.12s",
        flexShrink: 0,
        overflow: "hidden",
        boxShadow: isOver ? `0 0 12px ${hexToRgba(collection.color, 0.25)}` : "none",
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0, pointerEvents: "none" }}>{collection.icon}</span>
      {editing ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setEditName(collection.name);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 11,
            color: collection.color,
            fontFamily: theme.fontUI,
            fontWeight: 600,
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${collection.color}`,
            borderRadius: 4,
            outline: "none",
            padding: "2px 4px",
          }}
        />
      ) : (
        <span
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditName(collection.name);
            setEditing(true);
          }}
          style={{
            fontSize: 11,
            color: active ? collection.color : C.t1,
            fontFamily: theme.fontUI,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
            fontWeight: active ? 600 : 400,
            pointerEvents: "none",
          }}
        >
          {collection.name}
        </span>
      )}
      {hov && !editing ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
            borderRadius: 3,
            color: C.t3,
            cursor: "pointer",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.danger)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.t3)}
        >
          <Ic.X width={12} height={12} strokeWidth={2.5} />
        </div>
      ) : !editing ? (
        <span
          style={{
            fontSize: 10,
            color: C.t3,
            fontFamily: theme.fontMono,
            flexShrink: 0,
            width: 14,
            textAlign: "center",
          }}
        >
          {count}
        </span>
      ) : null}
    </div>
  );
}

export function CollectionBar({
  collections,
  activeCollectionId,
  onSelectCollection,
  onCreateCollection,
  onDeleteCollection,
  onRenameCollection,
  collectionClipCounts,
}: Props) {
  const [addHov, setAddHov] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const theme = useTheme();

  if (collections.length === 0 && !activeCollectionId) {
    return (
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          borderBottom: `1px solid ${C.borderDim}`,
          gap: 8,
        }}
      >
        <button
          onClick={onCreateCollection}
          onMouseEnter={() => setAddHov(true)}
          onMouseLeave={() => setAddHov(false)}
          style={{
            height: 32,
            padding: "0 16px",
            borderRadius: 8,
            border: `1px solid ${theme.accent}`,
            background: "transparent",
            color: theme.accent,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.15s ease",
            boxShadow: addHov ? `0 4px 12px ${hexToRgba(theme.accent, 0.2)}` : "none",
            transform: addHov ? "translateY(-1px)" : "none",
          }}
        >
          <Ic.Plus width={14} height={14} strokeWidth={2.5} />
          Créer une collection
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        height: 52,
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        gap: 6,
        borderBottom: `1px solid ${C.borderDim}`,
        overflowX: "auto",
        overflowY: "hidden",
        flexShrink: 0,
      }}
    >
        <div
          style={{
            width: activeCollectionId ? 36 : 0,
            opacity: activeCollectionId ? 1 : 0,
            marginRight: activeCollectionId ? 0 : -6,
            transition: "all 0.2s ease-out",
            overflow: "hidden",
            display: "flex",
            flexShrink: 0,
          }}
        >
            <div
              onClick={() => onSelectCollection(null)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1px solid rgba(39,39,42,0.35)`,
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: C.t2,
                transition: "all 0.12s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.accent;
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.background = hexToRgba(theme.accent, 0.1);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = C.t2;
                e.currentTarget.style.borderColor = "rgba(39,39,42,0.35)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Ic.Home width={15} height={15} strokeWidth={2} />
            </div>
        </div>

      {/* Add collection button */}
      <button
        onClick={onCreateCollection}
        onMouseEnter={() => setAddHov(true)}
        onMouseLeave={() => setAddHov(false)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: `1px solid ${theme.accent}`,
          background: "transparent",
          color: theme.accent,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
          flexShrink: 0,
          boxShadow: addHov ? `0 4px 12px ${hexToRgba(theme.accent, 0.2)}` : "none",
          transform: addHov ? "translateY(-1px)" : "none",
        }}
      >
        <Ic.Plus width={16} height={16} strokeWidth={2.5} />
      </button>

      <>
        {collections.map((g) => (
          <CollectionSlot
            key={g.id}
            collection={g}
            active={activeCollectionId === g.id}
            onClick={() => onSelectCollection(activeCollectionId === g.id ? null : g.id)}
            onDelete={() => setDeleteConfirmId(g.id)}
            onRename={(name) => onRenameCollection(g.id, name)}
            count={collectionClipCounts[g.id] ?? 0}
          />
        ))}
      </>

      <ConfirmationModal
        open={!!deleteConfirmId}
        title="Supprimer la collection ?"
        message="Es-tu sûr de vouloir supprimer cette collection ? Les éléments à l'intérieur ne seront pas supprimés mais ils ne seront plus regroupés."
        onConfirm={() => {
          if (deleteConfirmId) {
            onDeleteCollection(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
