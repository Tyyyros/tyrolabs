import { useCallback, useMemo, useState } from "react";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";

import type { NotesStore } from "../../../hooks/useNotesStore";
import { useNotesViews } from "../../../hooks/useNotesViews";
import { tipTapToMarkdown } from "../../../lib/notes-conversion";
import { CreateCollectionModal } from "../../groups/CreateCollectionModal";
import { NotesSidebar } from "./NotesSidebar";
import { NotesDashboard } from "./NotesDashboard";
import { NoteEditor } from "./NoteEditor";

interface Props {
  store: NotesStore;
  search: string;
  fire: (msg: string) => void;
}

export function NotesPanel({ store, search, fire }: Props) {
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  const { filtered, allTags, collectionCounts } = useNotesViews({
    notes: store.notes,
    collections: store.collections,
    activeCollectionId,
    search,
    activeTags,
  });

  const openNote = useMemo(
    () => (openNoteId ? store.notes.find((n) => n.id === openNoteId) ?? null : null),
    [openNoteId, store.notes],
  );

  // Si la note ouverte disparaît (suppression), on ferme l'éditeur.
  if (openNoteId && !openNote) {
    setOpenNoteId(null);
  }

  const handleCreate = useCallback(async () => {
    try {
      const note = await store.createNote({
        title: "Sans titre",
        format: "richtext",
        collection_id: activeCollectionId ?? null,
      });
      setOpenNoteId(note.id);
    } catch (e) {
      console.error("[create_note] failed:", e);
      fire("Erreur lors de la création");
    }
  }, [store, activeCollectionId, fire]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await store.deleteNote(id);
        if (openNoteId === id) setOpenNoteId(null);
        fire("Note supprimée ✓");
      } catch (e) {
        console.error("[delete_note] failed:", e);
        fire("Erreur lors de la suppression");
      }
    },
    [store, openNoteId, fire],
  );

  const handleRename = useCallback(
    (id: string, title: string) => {
      store.updateNote(id, { title }).catch((e) => {
        console.error("[update_note] failed:", e);
        fire("Erreur lors du renommage");
      });
    },
    [store, fire],
  );

  const handleTogglePin = useCallback(
    (id: string) => {
      const note = store.notes.find((n) => n.id === id);
      if (!note) return;
      store.updateNote(id, { pinned: !note.pinned }).catch((e) => {
        console.error("[update_note] pinned failed:", e);
      });
    },
    [store],
  );

  const handleExport = useCallback(
    async (id: string) => {
      try {
        const note = store.notes.find((n) => n.id === id);
        const defaultName = (note?.title || "note").replace(/[\\/:*?"<>|]/g, "_") + ".md";
        const path = await saveDialog({
          defaultPath: defaultName,
          filters: [{ name: "Markdown", extensions: ["md"] }],
        });
        if (!path) return;
        let content = await store.exportMarkdown(id);
        if (note && note.format === "richtext") {
          content = tipTapToMarkdown(content);
        }
        await store.writeFile(path, content);
        fire("Note exportée ✓");
      } catch (e) {
        console.error("[export_note_markdown] failed:", e);
        fire("Erreur lors de l'export");
      }
    },
    [store, fire],
  );

  const handleEditorChange = useCallback(
    (patch: Parameters<typeof store.updateNote>[1]) => {
      if (!openNote) return;
      store.updateNote(openNote.id, patch).catch((e) => {
        console.error("[update_note] failed:", e);
      });
    },
    [openNote, store],
  );

  const handleCreateCollection = useCallback(
    async (name: string, icon: string, color: string) => {
      try {
        const collection = await store.createCollection({ name, icon, color });
        setActiveCollectionId(collection.id);
        fire("Collection créée ✓");
      } catch (e) {
        console.error("[create_note_collection] failed:", e);
        fire("Erreur lors de la création");
      }
    },
    [store, fire],
  );

  const handleDeleteCollection = useCallback(
    async (id: string) => {
      try {
        await store.deleteCollection(id);
        if (activeCollectionId === id) setActiveCollectionId(null);
        fire("Collection supprimée ✓");
      } catch (e) {
        console.error("[delete_note_collection] failed:", e);
        fire("Erreur lors de la suppression");
      }
    },
    [store, activeCollectionId, fire],
  );

  const handleRenameCollection = useCallback(
    async (id: string, name: string) => {
      const c = store.collections.find((x) => x.id === id);
      if (!c) return;
      try {
        await store.updateCollection(id, { name, icon: c.icon, color: c.color });
      } catch (e) {
        console.error("[update_note_collection] failed:", e);
      }
    },
    [store],
  );

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <NotesSidebar
        collections={store.collections}
        collectionCounts={collectionCounts}
        activeCollectionId={activeCollectionId}
        onSelectCollection={setActiveCollectionId}
        onCreateCollection={() => setCollectionModalOpen(true)}
        onDeleteCollection={handleDeleteCollection}
        onRenameCollection={handleRenameCollection}
        tags={allTags}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        onClearTags={() => setActiveTags([])}
        totalCount={store.notes.length}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {openNote ? (
          <NoteEditor
            note={openNote}
            collections={store.collections}
            allTags={allTags}
            onClose={() => setOpenNoteId(null)}
            onChange={handleEditorChange}
            onDelete={() => handleDelete(openNote.id)}
            onExport={() => handleExport(openNote.id)}
            onTogglePin={() => handleTogglePin(openNote.id)}
          />
        ) : (
          <NotesDashboard
            notes={filtered}
            collections={store.collections}
            onOpen={setOpenNoteId}
            onCreate={handleCreate}
            onRename={handleRename}
            onDelete={handleDelete}
            onTogglePin={handleTogglePin}
            onExport={handleExport}
            emptyHint={
              activeCollectionId || activeTags.length || search
                ? "Aucune note ne correspond à ces filtres"
                : "Aucune note"
            }
          />
        )}
      </div>

      <CreateCollectionModal
        open={collectionModalOpen}
        silo={null}
        onClose={() => setCollectionModalOpen(false)}
        onCreate={handleCreateCollection}
      />

    </div>
  );
}
