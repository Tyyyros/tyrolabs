import { useState, useMemo, useEffect } from "react";
import React from "react";
import { ThemeProvider } from "./lib/theme";
import { THEMES } from "./themes";
import { C, hexToRgba } from "./lib/colors";
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
import { type TabId, type ItemType, type ThemeId, type AnyClip, type TextClip, type ImageClip, type CollectionSilo, type Collection } from "./types";
import { DndContext, pointerWithin, PointerSensor, useSensor, useSensors, DragOverlay, type DragStartEvent, type DragEndEvent, type Modifier } from "@dnd-kit/core";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

const TOAST_MS = 2400;

function getEventClientPoint(event: Event | null) {
  if (event instanceof MouseEvent || event instanceof PointerEvent) {
    return { x: event.clientX, y: event.clientY };
  }

  if (event instanceof TouchEvent) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    if (touch) return { x: touch.clientX, y: touch.clientY };
  }

  return null;
}

const snapOverlayToCursor: Modifier = ({
  activeNodeRect,
  activatorEvent,
  draggingNodeRect,
  overlayNodeRect,
  transform,
}) => {
  const point = getEventClientPoint(activatorEvent);
  const overlayRect = overlayNodeRect ?? draggingNodeRect;
  if (!point || !activeNodeRect || !overlayRect) return transform;

  return {
    ...transform,
    x: transform.x + point.x - activeNodeRect.left - overlayRect.width / 2,
    y: transform.y + point.y - activeNodeRect.top - overlayRect.height / 2,
  };
};

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
  const [capturePulse, setCapturePulse] = useState(0);

  const {
    textClips,
    imageClips,
    textCollections,
    imageCollections,
    linkCollections,
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

  // Le silo actif découle directement de l'onglet. Favs n'a pas de silo (vue
  // cross-silo) → la CollectionBar est masquée et activeCollections == [].
  const activeSilo: CollectionSilo | null =
    activeTab === "text" ? "text"
    : activeTab === "images" ? "image"
    : activeTab === "links" ? "link"
    : null;

  const activeCollections: Collection[] =
    activeSilo === "text" ? textCollections
    : activeSilo === "image" ? imageCollections
    : activeSilo === "link" ? linkCollections
    : [];

  // Sur changement d'onglet : retour à la vue "Home" (pas de collection
  // sélectionnée) et reset de la sélection multiple, pour ne JAMAIS afficher
  // les éléments d'une collection d'un autre silo.
  useEffect(() => {
    setActiveCollectionId(null);
    setSelection(new Set());
    setSelectedId(null);
  }, [activeTab]);

  const theme = THEMES[themeName];
  const fire = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), TOAST_MS);
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      setCtx(null);
      // Vide la sélection si le clic n'est pas dans une zone qui doit la
      // préserver (rows, CollectionBar, modals, etc. — taggés avec
      // data-keep-selection).
      const target = e.target as Element | null;
      if (!target || !target.closest("[data-keep-selection]")) {
        setSelection(new Set());
        setSelectedId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelection(new Set());
        setSelectedId(null);
        setCtx(null);
        setEditingItem(null);
      }
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
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

  /**
   * Sélection / désélection d'un clip au clic.
   *
   * Sémantique :
   * - plain click sur item non sélectionné         → selection = {id}, anchor = id
   * - plain click sur item seul sélectionné        → selection = ∅,    anchor = null
   * - plain click sur item dans multi-sélection    → selection = {id}, anchor = id  (réduit)
   * - Ctrl+click                                   → toggle id ; anchor = id si ajout
   * - Shift+click avec anchor                      → range [anchor..id] (remplace, pas d'union)
   * - Shift+click sans anchor                      → traité comme plain click
   */
  const handleSelect = (id: number, e: React.MouseEvent, list: AnyClip[]) => {
    const isMulti = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    if (isShift && selectedId !== null) {
      const idxA = list.findIndex((c) => c.id === selectedId);
      const idxB = list.findIndex((c) => c.id === id);
      if (idxA !== -1 && idxB !== -1) {
        const start = Math.min(idxA, idxB);
        const end = Math.max(idxA, idxB);
        const range = list.slice(start, end + 1).map((c) => c.id);
        setSelection(new Set(range));
      }
      // anchor reste sur selectedId pour permettre l'extension successive
      return;
    }

    if (isMulti) {
      setSelection((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          if (selectedId === id) {
            const fallbackId = list.find((item) => next.has(item.id))?.id ?? null;
            setSelectedId(fallbackId);
          }
        } else {
          next.add(id);
          setSelectedId(id);
        }
        return next;
      });
      return;
    }

    // Plain click
    const isSoloSelected = selection.size === 1 && selection.has(id);
    if (isSoloSelected) {
      setSelection(new Set());
      setSelectedId(null);
    } else {
      setSelection(new Set([id]));
      setSelectedId(id);
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
    () => activeCollections.find((collection) => collection.id === activeCollectionId)?.name ?? null,
    [activeCollections, activeCollectionId],
  );
  const statusCount = useMemo(() => {
    if (activeTab === "images") return filteredImages.length;
    if (activeTab === "links") return filteredLinks.length;
    if (activeTab === "favs") return textClips.filter(c => c.pinned).length + imageClips.filter(c => c.pinned).length;
    return filteredText.length;
  }, [activeTab, filteredImages.length, filteredLinks.length, filteredText.length, textClips, imageClips]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (e: DragStartEvent) => {
    const clipId = e.active.data.current?.clipId;
    const type = e.active.data.current?.type;
    if (!clipId || !type) return;
    setActiveDragItem({ id: clipId, type });
    // Si on drague un item hors de la sélection courante, on bascule la
    // sélection sur lui (comme Finder/Explorer). Si l'item EST dans la
    // sélection, on conserve la sélection multiple (drag de groupe).
    if (!selection.has(clipId)) {
      setSelection(new Set([clipId]));
      setSelectedId(clipId);
    }
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

  // Global shortcut Alt+C → capture instantanée (équivalent au clic Sidebar).
  useEffect(() => {
    const SHORTCUT = "Alt+C";
    let registered = false;
    register(SHORTCUT, (event) => {
      if (event.state === "Pressed") {
        handleCapture();
        setCapturePulse((n) => n + 1);
      }
    })
      .then(() => { registered = true; })
      .catch((e) => console.error("[global-shortcut] register failed:", e));

    return () => {
      if (registered) {
        unregister(SHORTCUT).catch((e) =>
          console.error("[global-shortcut] unregister failed:", e),
        );
      }
    };
  }, []);

  const handleDoubleClick = (id: number, type: ItemType) => {
    copyAndPromoteClip(id, type).then(() => {
      fire(type === "image" ? "Image copiée ✓" : "Copié ✓");
    });
  };

  const handleCtx = ({ e, item, itemType }: { e: React.MouseEvent; item: AnyClip; itemType: ItemType }) => {
    e.preventDefault();
    if (!selection.has(item.id)) {
      setSelection(new Set([item.id]));
      setSelectedId(item.id);
    }
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
            capturePulse={capturePulse}
          />
          <main style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minWidth: 0, background: "var(--bg)" }}>
            <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {activeSilo && (
                <CollectionBar
                  collections={activeCollections}
                  activeCollectionId={activeCollectionId}
                  onSelectCollection={setActiveCollectionId}
                  onCreateCollection={() => setCreateCollectionOpen(true)}
                  onDeleteCollection={(id) => {
                    deleteCollection(activeSilo, id);
                    if (activeCollectionId === id) setActiveCollectionId(null);
                  }}
                  onRenameCollection={(id, name) => {
                    const current = activeCollections.find((c) => c.id === id);
                    if (current) updateCollection(activeSilo, id, name, current.icon, current.color);
                  }}
                  collectionClipCounts={collectionCounts}
                />
              )}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                {activeTab === "text" && <TextTab clips={filteredText} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selection={selection} onSelect={handleSelect} />}
                {activeTab === "images" && <ImagesTab images={filteredImages} gridCols={3} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selection={selection} onSelect={handleSelect} />}
                {activeTab === "links" && <LinksTab links={filteredLinks} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selection={selection} onSelect={handleSelect} />}
                {activeTab === "favs" && (
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    <TextTab clips={textClips.filter(c => c.pinned)} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selection={selection} onSelect={handleSelect} />
                    <ImagesTab images={imageClips.filter(c => c.pinned)} gridCols={3} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selection={selection} onSelect={handleSelect} />
                  </div>
                )}
                <DragOverlay adjustScale={false} modifiers={[snapOverlayToCursor]}>
                  {activeDragItem && (
                    <div
                      style={{
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 7px",
                        background: hexToRgba(theme.accent, 0.95),
                        color: "#fff",
                        border: `1px solid ${theme.accent}`,
                        borderRadius: 11,
                        fontSize: 10.5,
                        fontFamily: theme.fontMono,
                        fontWeight: 600,
                        boxShadow: "0 3px 10px rgba(0,0,0,0.32)",
                        gap: 4,
                        pointerEvents: "none",
                        animation: "dragOverlayFadeIn 100ms ease-out",
                      }}
                    >
                      {activeDragItem.type === "image" ? <Ic.Image width={10} height={10} /> : <Ic.Text width={10} height={10} />}
                      <span>{selection.size > 1 ? selection.size : 1}</span>
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
        <CreateCollectionModal
          open={createCollectionOpen && activeSilo !== null}
          silo={activeSilo}
          onClose={() => setCreateCollectionOpen(false)}
          onCreate={(name, icon, color) => {
            if (activeSilo) createCollection(activeSilo, name, icon, color);
          }}
        />
        <style>{`
          @keyframes dragOverlayFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
        {toast && <Toast msg={toast} />}
      </div>
    </ThemeProvider>
  );
}
