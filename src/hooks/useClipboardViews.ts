import { useMemo } from "react";
import type {
  AnyClip,
  Collection,
  CollectionSilo,
  ImageClip,
  TabId,
  TextClip,
} from "../types";
import { isLinkOrPath } from "../lib/clips";

interface UseClipboardViewsArgs {
  activeTab: TabId;
  activeCollectionId: string | null;
  search: string;
  textClips: TextClip[];
  imageClips: ImageClip[];
  textCollections: Collection[];
  imageCollections: Collection[];
  linkCollections: Collection[];
}

export function useClipboardViews({
  activeTab,
  activeCollectionId,
  search,
  textClips,
  imageClips,
  textCollections,
  imageCollections,
  linkCollections,
}: UseClipboardViewsArgs) {
  const activeSilo: CollectionSilo | null =
    activeTab === "text" ? "text"
    : activeTab === "images" ? "image"
    : activeTab === "links" ? "link"
    : null;

  const activeCollections =
    activeSilo === "text" ? textCollections
    : activeSilo === "image" ? imageCollections
    : activeSilo === "link" ? linkCollections
    : [];

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const countClip = (clip: AnyClip) => {
      if (clip.collection_id) counts[clip.collection_id] = (counts[clip.collection_id] || 0) + 1;
    };
    textClips.forEach(countClip);
    imageClips.forEach(countClip);
    return counts;
  }, [textClips, imageClips]);

  const baseText = useMemo(
    () => activeCollectionId
      ? textClips
          .filter((clip) => clip.collection_id === activeCollectionId)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      : textClips.filter((clip) => !clip.collection_id),
    [textClips, activeCollectionId],
  );

  const baseImages = useMemo(
    () => activeCollectionId
      ? imageClips
          .filter((clip) => clip.collection_id === activeCollectionId)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      : imageClips.filter((clip) => !clip.collection_id),
    [imageClips, activeCollectionId],
  );

  const query = search.toLowerCase();
  const filteredText = useMemo(
    () => pinnedFirst(filterByQuery(baseText, query)) as TextClip[],
    [baseText, query],
  );
  const filteredImages = useMemo(
    () => pinnedFirst(filterByQuery(baseImages, query)) as ImageClip[],
    [baseImages, query],
  );
  const filteredLinks = useMemo(
    () => pinnedFirst(filterByQuery(baseText.filter((clip) => isLinkOrPath(clip.text)), query)) as TextClip[],
    [baseText, query],
  );
  const activeCollectionName = useMemo(
    () => activeCollections.find((collection) => collection.id === activeCollectionId)?.name ?? null,
    [activeCollections, activeCollectionId],
  );
  const statusCount = useMemo(() => {
    if (activeTab === "images") return filteredImages.length;
    if (activeTab === "links") return filteredLinks.length;
    return filteredText.length;
  }, [
    activeTab,
    filteredImages.length,
    filteredLinks.length,
    filteredText.length,
  ]);

  return {
    activeSilo,
    activeCollections,
    collectionCounts,
    filteredText,
    filteredImages,
    filteredLinks,
    activeCollectionName,
    statusCount,
  };
}

function pinnedFirst<T extends { pinned: boolean }>(clips: T[]): T[] {
  const pinned: T[] = [];
  const rest: T[] = [];
  for (const clip of clips) {
    if (clip.pinned) pinned.push(clip);
    else rest.push(clip);
  }
  return [...pinned, ...rest];
}

function filterByQuery(clips: AnyClip[], query: string) {
  if (!query) return clips;
  return clips.filter((clip) => {
    if (clip.type !== "image") return clip.text.toLowerCase().includes(query);
    return clip.hash.toLowerCase().includes(query);
  });
}
