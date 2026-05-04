import { useState, useMemo, useEffect } from "react";
import React from "react";
import { ThemeProvider } from "./lib/theme";
import { THEMES } from "./themes";
import { C } from "./lib/colors";
import { Ic } from "./components/icons";
import { TitleBar } from "./components/layout/TitleBar";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { CollectionBar } from "./components/groups/CollectionBar";
import { TextTab } from "./components/tabs/TextTab";
import { ImagesTab } from "./components/tabs/ImagesTab";
import { LinksTab } from "./components/tabs/LinksTab";
import { CtxMenu, type CtxHandlers } from "./components/overlays/CtxMenu";
import { SysDrawer } from "./components/overlays/SysDrawer";
import { Settings } from "./components/overlays/Settings";
import { Toast } from "./components/ui/Toast";
import { CreateCollectionModal } from "./components/groups/CreateCollectionModal";
import { EditorPanel } from "./components/overlays/EditorPanel";
import { useClipboardStore } from "./lib/clipboard-store";
import { type TabId, type ItemType, type ThemeId, type AnyClip, type TextClip, type ImageClip } from "./types";
import { DndContext, pointerWithin, PointerSensor, useSensor, useSensors, DragOverlay, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

const TOAST_MS = 2400;

export function isLinkOrPath(text: string) {
  const t = text.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return true;
  if (/^[a-zA-Z]:\\/.test(t) || t.startsWith("\\\\")) return true;
  if (t.includes(".") && !t.includes(" ") && t.length > 4) {
     const ext = t.split(".").pop()?.toLowerCase();
     if (ext && ext.length >= 2 && ext.length <= 4) return true;
  }
  return false;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("text");
  const [search, setSearch] = useState("");
  const [ctx, setCtx] = useState<{ x: number; y: number; item: AnyClip; itemType: ItemType } | null>(null);
  const [themeName, setThemeName] = useState<ThemeId>("command");
  const [sysOpen, setSysOpen] = useState(false);
  const [settOpen, setSettOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const [autoCap, setAutoCap] = useState(true);
  const [activeDragItem, setActiveDragItem] = useState<{ id: number; type: ItemType } | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: AnyClip; type: ItemType } | null>(null);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const {
    textClips,
    imageClips,
    collections,
    copyAndPromoteClip,
    togglePinned,
    deleteClips,
    updateTextClip,
    createCollection,
    updateCollection,
    deleteCollection,
    setClipsCollection,
    openClip,
  } = useClipboardStore();

  const theme = THEMES[themeName];
  const fire = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), TOAST_MS);
  };

  useEffect(() => {
    const closeCtx = () => setCtx(null);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelection(new Set());
        setCtx(null);
        setEditingItem(null);
      }
    };
    document.addEventListener("click", closeCtx);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", closeCtx);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  useEffect(() => {
    const unlisten = listen("open-settings", () => setSettOpen(true));
    return () => { unlisten.then(f => f()); };
  }, []);

  useEffect(() => {
    const unlisten = listen("capture://done", () => setActiveTab("images"));
    return () => { unlisten.then(f => f()); };
  }, []);

  const handleSelect = (id: number, e: React.MouseEvent, list: AnyClip[]) => {
    const isMulti = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    if (isMulti) {
      setSelection(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setSelectedId(id);
    } else if (isShift && selectedId !== null) {
      const idxA = list.findIndex(c => c.id === selectedId);
      const idxB = list.findIndex(c => c.id === id);
      if (idxA !== -1 && idxB !== -1) {
        const start = Math.min(idxA, idxB);
        const end = Math.max(idxA, idxB);
        const range = list.slice(start, end + 1).map(c => c.id);
        setSelection(new Set([...Array.from(selection), ...range]));
      }
      setSelectedId(id);
    } else {
      if (!selection.has(id)) {
        setSelection(new Set([id]));
        setSelectedId(id);
      }
    }
  };

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const countClips = (c: AnyClip) => {
      if (c.collection_id) counts[c.collection_id] = (counts[c.collection_id] || 0) + 1;
    };
    textClips.forEach(countClips);
    imageClips.forEach(countClips);
    return counts;
  }, [textClips, imageClips]);

  const baseText = useMemo(() => activeCollectionId ? textClips.filter(c => c.collection_id === activeCollectionId).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)) : textClips.filter(c => !c.collection_id), [textClips, activeCollectionId]);
  const baseImages = useMemo(() => activeCollectionId ? imageClips.filter(c => c.collection_id === activeCollectionId).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)) : imageClips.filter(c => !c.collection_id), [imageClips, activeCollectionId]);

  const q = search.toLowerCase();
  const filterByQuery = (clips: AnyClip[]) => {
    if (!search) return clips;
    return clips.filter(c => {
      if (c.type !== "image") return c.text.toLowerCase().includes(q);
      return ("hash" in c) && c.hash.toLowerCase().includes(q);
    });
  };

  const filteredText = useMemo(() => filterByQuery(baseText) as TextClip[], [q, baseText]);
  const filteredImages = useMemo(() => filterByQuery(baseImages) as ImageClip[], [baseImages, q]);
  const autoLinks = useMemo(() => baseText.filter(c => isLinkOrPath(c.text)), [baseText]);
  const filteredLinks = useMemo(() => filterByQuery(autoLinks) as TextClip[], [autoLinks, q]);
  const activeCollectionName = useMemo(
    () => collections.find((collection) => collection.id === activeCollectionId)?.name ?? null,
    [collections, activeCollectionId],
  );
  const statusCount = useMemo(() => {
    if (activeTab === "images") return filteredImages.length;
    if (activeTab === "links") return filteredLinks.length;
    if (activeTab === "favs") return textClips.filter(c => c.pinned).length + imageClips.filter(c => c.pinned).length;
    if (activeTab === "colls") return collections.length;
    return filteredText.length;
  }, [activeTab, filteredImages.length, filteredLinks.length, filteredText.length, textClips, imageClips, collections.length]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (e: DragStartEvent) => {
    const clipId = e.active.data.current?.clipId;
    const type = e.active.data.current?.type;
    if (clipId && type) setActiveDragItem({ id: clipId, type });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = e;
    if (!over) return;

    const collectionId = over.data.current?.collectionId;
    const draggedClipId = active.data.current?.clipId;

    if (collectionId && draggedClipId) {
      const clipIds = selection.has(draggedClipId) ? Array.from(selection) : [draggedClipId];
      setClipsCollection(clipIds, collectionId).then(() => {
        fire(`${clipIds.length} élément${clipIds.length > 1 ? "s" : ""} déplacé${clipIds.length > 1 ? "s" : ""} ✓`);
        setSelection(new Set());
      }).catch(err => {
        console.error("Move failed:", err);
        fire("Erreur lors du déplacement");
      });
    }
  };

  const handleBatchDelete = () => {
    if (selection.size > 0) {
      const type: ItemType = activeTab === "images" ? "image" : activeTab === "links" ? "link" : "text";
      deleteClips(Array.from(selection), type);
      setSelection(new Set());
      fire(`${selection.size} éléments supprimés ✓`);
    }
  };

  const handleBatchCopy = () => {
    if (selection.size > 0) {
      const type: ItemType = activeTab === "images" ? "image" : activeTab === "links" ? "link" : "text";
      const items = type === "image" ? filteredImages : type === "link" ? filteredLinks : filteredText;
      const selected = items.filter(c => selection.has(c.id));
      if (selected.length === 0) return;
      if (type === "image") {
        const imgClip = selected[0] as ImageClip;
        invoke("copy_image_to_clipboard", { hash: imgClip.hash })
          .then(() => fire(selected.length > 1 ? "1ère image copiée (sélection multiple)" : "Image copiée ✓"))
          .catch(console.error);
      } else {
        const text = selected.map(c => c.text).join("\n");
        navigator.clipboard.writeText(text).then(() => {
          invoke("suppress_next", { text }).catch(() => {});
          invoke("add_manual_clip", { text })
            .then(() => fire(`${selected.length} éléments fusionnés ✓`))
            .catch(console.error);
        });
      }
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

      if (e.key === "Delete") handleBatchDelete();
      if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
        if (selection.size > 1) {
          e.preventDefault();
          handleBatchCopy();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selection, activeTab, filteredText, filteredImages, filteredLinks]);

  const handleCapture = () => {
    invoke("prepare_capture").catch((e) => {
      console.error(e);
      fire("Erreur lors de la préparation de la capture");
    });
  };

  const handleDoubleClick = (id: number, type: ItemType) => {
    copyAndPromoteClip(id, type).then(() => {
      fire(type === "image" ? "Image copiée ✓" : "Copié ✓");
    });
  };

  const handleCtx = ({ e, item, itemType }: { e: React.MouseEvent; item: AnyClip; itemType: ItemType }) => {
    e.preventDefault();
    setSelectedId(item.id);
    setCtx({ x: e.clientX, y: e.clientY, item, itemType });
  };

  const getHandlers = (item: AnyClip, type: ItemType): CtxHandlers => {
    const isTextual = type === "text" || type === "link";
    return {
      copy: () => { setCtx(null); handleDoubleClick(item.id, type); },
      pin: () => { setCtx(null); togglePinned(item.id, isTextual ? "text" : "image"); },
      delete: () => { setCtx(null); deleteClips([item.id], isTextual ? "text" : "image"); },
      edit: () => { setCtx(null); setEditingItem({ item, type }); },
      copyPlain: isTextual ? () => { setCtx(null); navigator.clipboard.writeText((item as TextClip).text).then(() => fire("Texte brut copié ✓")); } : undefined,
      open: type === "image"
        ? () => { setCtx(null); openClip(item, "image"); }
        : type === "link"
          ? () => { setCtx(null); openClip(item, "link"); }
          : undefined,
    };
  };



  return (
    <ThemeProvider theme={theme}>
      <div style={{ width: "100vw", height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", fontFamily: theme.fontUI, color: C.t1, overflow: "hidden" }}>
        <TitleBar
          pinned={alwaysOnTop}
          onPin={() => setAlwaysOnTop(!alwaysOnTop)}
          search={search}
          onSearch={setSearch}
        />
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <Sidebar
            activeTab={activeTab}
            onTab={setActiveTab}
            onSettings={() => setSettOpen(true)}
            onSystem={() => setSysOpen(true)}
            onCapture={handleCapture}
            autoCap={autoCap}
          />
          <main style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minWidth: 0, background: "var(--bg)" }}>
            <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <CollectionBar
                collections={collections}
                activeCollectionId={activeCollectionId}
                onSelectCollection={setActiveCollectionId}
                onCreateCollection={() => setCreateCollectionOpen(true)}
                onDeleteCollection={(id) => {
                  deleteCollection(id);
                  if (activeCollectionId === id) setActiveCollectionId(null);
                }}
                onRenameCollection={(id, name) => updateCollection(id, name, "", "")}
                collectionClipCounts={collectionCounts}
              />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                {activeTab === "text" && <TextTab clips={filteredText} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selectedId={selectedId} selection={selection} onSelect={handleSelect} />}
                {activeTab === "images" && <ImagesTab images={filteredImages} gridCols={3} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selectedId={selectedId} selection={selection} onSelect={handleSelect} />}
                {activeTab === "links" && <LinksTab links={filteredLinks} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selectedId={selectedId} selection={selection} onSelect={handleSelect} />}
                {activeTab === "favs" && (
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    <TextTab clips={textClips.filter(c => c.pinned)} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selectedId={selectedId} selection={selection} onSelect={handleSelect} />
                    <ImagesTab images={imageClips.filter(c => c.pinned)} gridCols={3} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selectedId={selectedId} selection={selection} onSelect={handleSelect} />
                  </div>
                )}
                <DragOverlay>
                  {activeDragItem && (
                    <div style={{ height: 34, display: "flex", alignItems: "center", padding: "0 12px 0 2px", background: C.accent, color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", gap: 10, pointerEvents: "none", transform: "scale(1.05)" }}>
                      {activeDragItem.type === "image" ? <Ic.Image width={16} height={16} /> : <Ic.Text width={16} height={16} />}
                      <span>{selection.size > 1 ? `${selection.size} éléments` : "1 élément"}</span>
                    </div>
                  )}
                </DragOverlay>
              </div>
              {editingItem && (
                <EditorPanel
                  item={editingItem.item}
                  itemType={editingItem.type}
                  onClose={() => setEditingItem(null)}
                  onSave={(id, text, type, copyAfter) => {
                    updateTextClip(id, text, type as ItemType, copyAfter);
                    fire("Modifications enregistrées ✓");
                  }}
                />
              )}
            </DndContext>
          </main>
        </div>
        <StatusBar
          tab={activeTab}
          visibleCount={statusCount}
          selectedCount={selection.size}
          collectionName={activeCollectionName}
        />
        {ctx && <CtxMenu x={ctx.x} y={ctx.y} item={ctx.item} itemType={ctx.itemType} handlers={getHandlers(ctx.item, ctx.itemType)} />}
        {sysOpen && <SysDrawer onClose={() => setSysOpen(false)} />}
        {settOpen && <Settings onClose={() => setSettOpen(false)} themeName={themeName} onThemeChange={setThemeName} autoCap={autoCap} onAutoCapChange={setAutoCap} />}
        <CreateCollectionModal open={createCollectionOpen} onClose={() => setCreateCollectionOpen(false)} onCreate={(name, icon, color) => createCollection(name, icon, color, activeTab)} />
        {toast && <Toast msg={toast} />}
      </div>
    </ThemeProvider>
  );
}
