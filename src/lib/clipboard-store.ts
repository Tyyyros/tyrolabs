import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import type { AnyClip, ImageClip, ItemType, TextClip, Collection } from "../types";
import { isImageClip } from "../types";

function isTextualItemType(itemType: ItemType): itemType is Exclude<ItemType, "image"> {
  return itemType !== "image";
}

async function copyTextToClipboard(text: string): Promise<void> {
  await invoke("suppress_next", { text }).catch(() => {});
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function liftToHead<T extends { id: number }>(items: T[], id: number): T[] {
  const item = items.find((clip) => clip.id === id);
  return item ? [item, ...items.filter((clip) => clip.id !== id)] : items;
}

export function useClipboardStore() {
  const [textClips, setTextClips] = useState<TextClip[]>([]);
  const [imageClips, setImageClips] = useState<ImageClip[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    let cancelled = false;

    invoke<AnyClip[]>("get_history")
      .then((history) => {
        if (cancelled) return;
        setTextClips(history.filter((clip): clip is TextClip => !isImageClip(clip)));
        setImageClips(history.filter(isImageClip));
      })
      .catch((e) => console.error("[get_history] failed:", e));

    invoke<Collection[]>("get_collections")
      .then((g) => {
        if (!cancelled) setCollections(g);
      })
      .catch((e) => console.error("[get_collections] failed:", e));

    let unlisten: (() => void) | undefined;
    listen<AnyClip>("clipboard://new-item", (event) => {
      if (cancelled) return;
      const payload = event.payload;
      if (isImageClip(payload)) {
        setImageClips((prev) => {
          if (prev.some((clip) => clip.id === payload.id)) return prev;
          return [payload, ...prev];
        });
        return;
      }

      setTextClips((prev) => {
        if (prev.some((clip) => clip.id === payload.id)) return prev;
        return [payload, ...prev];
      });
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const findClip = useCallback(
    (id: number, itemType: ItemType): AnyClip | null =>
      isTextualItemType(itemType)
        ? textClips.find((clip) => clip.id === id) ?? null
        : imageClips.find((clip) => clip.id === id) ?? null,
    [imageClips, textClips],
  );

  const copyClip = useCallback(async (item: AnyClip, _itemType: ItemType) => {
    if (isImageClip(item)) {
      // Copy actual bitmap to clipboard via backend
      await invoke("copy_image_to_clipboard", { hash: item.hash });
    } else {
      await copyTextToClipboard(item.text);
    }
  }, []);

  const copyAndPromoteClip = useCallback(
    async (id: number, itemType: ItemType): Promise<boolean> => {
      const clip = findClip(id, itemType);
      if (!clip) return false;

      await copyClip(clip, itemType);

      if (isTextualItemType(itemType)) {
        setTextClips((prev) => liftToHead(prev, id));
        invoke("reorder_clip", { id }).catch(console.error);
      } else {
        setImageClips((prev) => liftToHead(prev, id));
      }

      return true;
    },
    [copyClip, findClip],
  );

  const togglePinned = useCallback(async (id: number, itemType: ItemType) => {
    try {
      await invoke("toggle_pinned", { id });
    } catch (error) {
      console.error("[toggle_pinned] failed:", error);
      return;
    }

    const toggle = <T extends { id: number; pinned: boolean }>(items: T[]) =>
      items.map((clip) => (clip.id === id ? { ...clip, pinned: !clip.pinned } : clip));

    if (isTextualItemType(itemType)) {
      setTextClips((prev) => toggle(prev));
      return;
    }

    setImageClips((prev) => toggle(prev));
  }, []);

  const deleteClip = useCallback((id: number, itemType: ItemType) => {
    if (isTextualItemType(itemType)) {
      invoke("delete_clip", { id }).catch(console.error);
      setTextClips((prev) => prev.filter((clip) => clip.id !== id));
      return;
    }

    setImageClips((prev) => prev.filter((clip) => clip.id !== id));
  }, []);

  const deleteClips = useCallback((ids: number[], itemType: ItemType) => {
    invoke("delete_clips", { ids }).catch(console.error);
    if (isTextualItemType(itemType)) {
      setTextClips((prev) => prev.filter((clip) => !ids.includes(clip.id)));
    } else {
      setImageClips((prev) => prev.filter((clip) => !ids.includes(clip.id)));
    }
  }, []);

  const openClip = useCallback((item: AnyClip, itemType: ItemType) => {
    if (itemType === "link") {
      const value = isImageClip(item) ? item.hash : item.text;
      invoke("open_file_or_url", { path: value }).catch(console.error);
      return;
    }

    if (itemType === "image" && isImageClip(item)) {
      // Resolve hash to real filesystem path, then open in Paint
      invoke<string>("get_image_path", { hash: item.hash })
        .then((filePath) => invoke("open_in_paint", { path: filePath }))
        .catch(console.error);
    }
  }, []);

  const updateTextClip = useCallback(
    async (id: number, text: string, itemType: ItemType, copyAfter = false) => {
      if (!isTextualItemType(itemType)) return;

      invoke("update_clip", { id, text }).catch(console.error);
      setTextClips((prev) => prev.map((clip) => (clip.id === id ? { ...clip, text } : clip)));

      if (copyAfter) {
        await copyTextToClipboard(text);
      }
    },
    [],
  );

  const createCollection = useCallback(async (name: string, icon: string, color: string, origin_tab: string) => {
    const collection = await invoke<Collection>("create_collection", { name, icon, color, originTab: origin_tab });
    setCollections((prev) => [...prev, collection]);
    return collection;
  }, []);

  const updateCollection = useCallback(async (id: string, name: string, icon: string, color: string) => {
    await invoke("update_collection", { id, name, icon, color });
    setCollections((prev) => prev.map((g) => (g.id === id ? { ...g, name, icon, color } : g)));
  }, []);

  const deleteCollection = useCallback(async (id: string) => {
    await invoke("delete_collection", { id });
    setCollections((prev) => prev.filter((g) => g.id !== id));
    // Ungroup clips locally
    setTextClips((prev) => prev.map((c) => (c.collection_id === id ? { ...c, collection_id: null, sort_order: 0 } : c)));
    setImageClips((prev) => prev.map((c) => (c.collection_id === id ? { ...c, collection_id: null, sort_order: 0 } : c)));
  }, []);

  const setClipCollection = useCallback(async (clipId: number, collectionId: string, sortOrder: number) => {
    await invoke("set_clip_collection", { clipId, collectionId, sortOrder });
    const update = <T extends { id: number; collection_id?: string | null; sort_order?: number }>(prev: T[]) => prev.map((c) => (c.id === clipId ? { ...c, collection_id: collectionId, sort_order: sortOrder } : c));
    setTextClips(update);
    setImageClips(update);
  }, []);

  const setClipsCollection = useCallback(async (clipIds: number[], collectionId: string) => {
    await invoke("set_clips_collection", { clipIds, collectionId });
    const update = <T extends { id: number; collection_id?: string | null }>(prev: T[]) => prev.map((c) => (clipIds.includes(c.id) ? { ...c, collection_id: collectionId } : c));
    setTextClips(update);
    setImageClips(update);
  }, []);

  const ungroupClip = useCallback(async (clipId: number) => {
    await invoke("ungroup_clip", { clipId });
    setTextClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, collection_id: null, sort_order: 0 } : c)));
    setImageClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, collection_id: null, sort_order: 0 } : c)));
  }, []);

  const reorderInCollection = useCallback(async (clipIds: number[]) => {
    await invoke("reorder_clips_in_collection", { clipIds });
    const orderMap = new Map(clipIds.map((id, i) => [id, i]));
    const reorder = <T extends { id: number; sort_order?: number }>(items: T[]): T[] =>
      items.map((c) => (orderMap.has(c.id) ? { ...c, sort_order: orderMap.get(c.id)! } : c));
    setTextClips((prev) => reorder(prev));
    setImageClips((prev) => reorder(prev));
  }, []);

  return {
    textClips,
    imageClips,
    collections,
    copyClip,
    copyAndPromoteClip,
    togglePinned,
    deleteClip,
    deleteClips,
    openClip,
    updateTextClip,
    createCollection,
    updateCollection,
    deleteCollection,
    setClipCollection,
    setClipsCollection,
    ungroupClip,
    reorderInCollection,
  };
}
