import { useMemo } from "react";

import type { Collection, Note } from "../types";

export interface NotesViewsArgs {
  notes: Note[];
  collections: Collection[];
  activeCollectionId: string | null;
  search: string;
  activeTags: string[];
}

export interface NotesViews {
  filtered: Note[];
  pinned: Note[];
  allTags: string[];
  collectionCounts: Record<string, number>;
}

function plainText(body: string): string {
  if (!body) return "";
  // Si on dirait du JSON TipTap, on extrait les nodes texte.
  if (body.startsWith("{") && body.includes('"type"')) {
    try {
      const json = JSON.parse(body);
      return collectText(json).join(" ");
    } catch {
      /* fallthrough to raw body */
    }
  }
  return body;
}

function collectText(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  const out: string[] = [];
  const obj = node as Record<string, unknown>;
  if (typeof obj.text === "string") out.push(obj.text);
  const content = obj.content;
  if (Array.isArray(content)) {
    for (const child of content) out.push(...collectText(child));
  }
  return out;
}

export function useNotesViews({
  notes,
  collections: _collections,
  activeCollectionId,
  search,
  activeTags,
}: NotesViewsArgs): NotesViews {
  return useMemo(() => {
    const allTagsSet = new Set<string>();
    const collectionCounts: Record<string, number> = {};
    for (const n of notes) {
      n.tags.forEach((t) => allTagsSet.add(t));
      if (n.collection_id) {
        collectionCounts[n.collection_id] = (collectionCounts[n.collection_id] ?? 0) + 1;
      }
    }

    let visible = notes;
    if (activeCollectionId) {
      visible = visible.filter((n) => n.collection_id === activeCollectionId);
    }
    if (activeTags.length) {
      visible = visible.filter((n) => activeTags.every((t) => n.tags.includes(t)));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      visible = visible.filter((n) => {
        if (n.title.toLowerCase().includes(q)) return true;
        if (n.tags.some((t) => t.toLowerCase().includes(q))) return true;
        return plainText(n.body).toLowerCase().includes(q);
      });
    }

    const sorted = [...visible].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updated_at - a.updated_at;
    });

    return {
      filtered: sorted,
      pinned: sorted.filter((n) => n.pinned),
      allTags: Array.from(allTagsSet).sort(),
      collectionCounts,
    };
  }, [notes, activeCollectionId, search, activeTags]);
}

export function noteExcerpt(note: Note, maxChars = 220): string {
  const raw = plainText(note.body).replace(/\s+/g, " ").trim();
  if (raw.length <= maxChars) return raw;
  return raw.slice(0, maxChars).trimEnd() + "…";
}
