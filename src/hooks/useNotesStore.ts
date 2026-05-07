import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import type { Collection, Note, NoteFormat, NotePatch } from "../types";

export interface NotesStore {
  notes: Note[];
  collections: Collection[];
  createNote: (args: {
    title: string;
    format: NoteFormat;
    collection_id?: string | null;
    tags?: string[];
  }) => Promise<Note>;
  updateNote: (id: string, patch: NotePatch) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  setNotesCollection: (noteIds: string[], collectionId: string | null) => Promise<void>;
  createCollection: (args: { name: string; icon: string; color: string }) => Promise<Collection>;
  updateCollection: (id: string, args: { name: string; icon: string; color: string }) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  exportMarkdown: (id: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = list.slice();
  next[idx] = item;
  return next;
}

export function useNotesStore(): NotesStore {
  const [notes, setNotes] = useState<Note[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    invoke<Note[]>("get_notes").then(setNotes).catch((e) => console.error("[get_notes]", e));
    invoke<Collection[]>("get_note_collections")
      .then(setCollections)
      .catch((e) => console.error("[get_note_collections]", e));

    const unlistenChanged = listen<Note>("notes://changed", (e) => {
      setNotes((prev) => upsertById(prev, e.payload));
    });
    const unlistenDeleted = listen<string>("notes://deleted", (e) => {
      setNotes((prev) => prev.filter((n) => n.id !== e.payload));
    });
    return () => {
      unlistenChanged.then((fn) => fn());
      unlistenDeleted.then((fn) => fn());
    };
  }, []);

  const createNote = useCallback<NotesStore["createNote"]>(async (args) => {
    const note = await invoke<Note>("create_note", {
      title: args.title,
      format: args.format,
      collectionId: args.collection_id ?? null,
      tags: args.tags ?? null,
    });
    setNotes((prev) => upsertById(prev, note));
    return note;
  }, []);

  const updateNote = useCallback<NotesStore["updateNote"]>(async (id, patch) => {
    const note = await invoke<Note>("update_note", { id, patch });
    setNotes((prev) => upsertById(prev, note));
    return note;
  }, []);

  const deleteNote = useCallback<NotesStore["deleteNote"]>(async (id) => {
    await invoke("delete_note", { id });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const setNotesCollection = useCallback<NotesStore["setNotesCollection"]>(
    async (noteIds, collectionId) => {
      await invoke("set_notes_collection", {
        noteIds,
        collectionId: collectionId ?? "",
      });
      setNotes((prev) =>
        prev.map((n) =>
          noteIds.includes(n.id) ? { ...n, collection_id: collectionId ?? null } : n,
        ),
      );
    },
    [],
  );

  const createCollection = useCallback<NotesStore["createCollection"]>(async (args) => {
    const collection = await invoke<Collection>("create_note_collection", args);
    setCollections((prev) => [...prev, collection]);
    return collection;
  }, []);

  const updateCollection = useCallback<NotesStore["updateCollection"]>(async (id, args) => {
    await invoke("update_note_collection", { id, ...args });
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...args } : c)),
    );
  }, []);

  const deleteCollection = useCallback<NotesStore["deleteCollection"]>(async (id) => {
    await invoke("delete_note_collection", { id });
    setCollections((prev) => prev.filter((c) => c.id !== id));
    setNotes((prev) =>
      prev.map((n) => (n.collection_id === id ? { ...n, collection_id: null } : n)),
    );
  }, []);

  const exportMarkdown = useCallback<NotesStore["exportMarkdown"]>(async (id) => {
    return await invoke<string>("export_note_markdown", { id });
  }, []);

  const writeFile = useCallback<NotesStore["writeFile"]>(async (path, content) => {
    await invoke("write_note_to_file", { path, content });
  }, []);

  return {
    notes,
    collections,
    createNote,
    updateNote,
    deleteNote,
    setNotesCollection,
    createCollection,
    updateCollection,
    deleteCollection,
    exportMarkdown,
    writeFile,
  };
}
