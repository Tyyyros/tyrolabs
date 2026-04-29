import { useEffect, useMemo, useState } from "react";
import type { AnyClip, ItemType, TabId, TextClip, ThemeId } from "./types";
import { THEMES } from "./themes";
import { ThemeProvider } from "./lib/theme";
import { C } from "./lib/colors";
import { useClipboardStore } from "./lib/clipboard-store";
import { invoke } from "@tauri-apps/api/core";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, pointerWithin } from "@dnd-kit/core";
import { CollectionBar } from "./components/groups/CollectionBar";
import { CreateCollectionModal } from "./components/groups/CreateCollectionModal";

import { TitleBar } from "./components/layout/TitleBar";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";

import { TextTab } from "./components/tabs/TextTab";
import { ImagesTab } from "./components/tabs/ImagesTab";
import { LinksTab } from "./components/tabs/LinksTab";
import { FavsTab } from "./components/tabs/FavsTab";

import { CtxMenu, type CtxHandlers } from "./components/overlays/CtxMenu";
import { SysDrawer } from "./components/overlays/SysDrawer";
import { Settings } from "./components/overlays/Settings";
import { EditorPanel } from "./components/overlays/EditorPanel";

import { Toast } from "./components/ui/Toast";

interface CtxState {
  x: number;
  y: number;
  item: AnyClip;
  itemType: ItemType;
}

interface EditorState {
  item: TextClip;
  itemType: ItemType;
}

function isLinkOrPath(text: string): boolean {
  if (/^https?:\/\//i.test(text)) return true;
  if (/^ftp:\/\//i.test(text)) return true;
  if (/^file:\/\/\//i.test(text)) return true;
  if (/^[A-Za-z]:\\/i.test(text)) return true;
  if (/^\\\\/.test(text)) return true;
  return false;
}

const TOAST_MS = 2200;

export default function App() {
  const [themeName, setThemeName] = useState<ThemeId>("command");
  const [activeTab, setActiveTab] = useState<TabId>("text");
  const [winPinned, setWinPinned] = useState(true);
  const [search, setSearch] = useState("");
  const [ctx, setCtx] = useState<CtxState | null>(null);
  const [sysOpen, setSysOpen] = useState(false);
  const [settOpen, setSettOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);

  const {
    textClips,
    imageClips,
    collections,
    copyClip,
    copyAndPromoteClip,
    togglePinned,
    deleteClip,
    openClip,
    updateTextClip,
    createCollection,
    deleteCollection,
    setClipCollection,
    reorderInCollection,
  } = useClipboardStore();

  const theme = THEMES[themeName];
  const fire = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), TOAST_MS);
  };

  useEffect(() => {
    const closeCtx = () => setCtx(null);
    document.addEventListener("click", closeCtx);
    return () => document.removeEventListener("click", closeCtx);
  }, []);

  const handleCtx = ({
    e,
    item,
    itemType,
  }: {
    e: React.MouseEvent;
    item: AnyClip;
    itemType: ItemType;
  }) => {
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY, item, itemType });
  };

  const handleDoubleClick = (id: number, itemType: ItemType) => {
    copyAndPromoteClip(id, itemType)
      .then((didCopy) => {
        if (didCopy) fire("Copié + remonté en tête ↑");
      })
      .catch(console.error);
  };

  const buildHandlers = (item: AnyClip, itemType: ItemType): CtxHandlers => ({
    copy: () => {
      copyClip(item, itemType)
        .then(() => fire("Copié ✓"))
        .catch(console.error);
      setCtx(null);
    },
    edit: () => {
      if (itemType === "image") {
        fire("Ouverture dans Paint...");
      } else {
        setEditor({ item: item as TextClip, itemType });
      }
      setCtx(null);
    },
    pin: () => {
      togglePinned(item.id, itemType);
      fire(item.pinned ? "Désépinglé" : "Épinglé ✓");
      setCtx(null);
    },
    delete: () => {
      deleteClip(item.id, itemType);
      fire("Supprimé");
      setCtx(null);
    },
    copyPlain: () => {
      copyClip(item, itemType)
        .then(() => fire("Texte brut copié ✓"))
        .catch(console.error);
      setCtx(null);
    },
    open: () => {
      openClip(item, itemType);
      if (itemType === "link") fire("Ouverture en cours...");
      if (itemType === "image") fire("Ouverture dans Paint...");
      setCtx(null);
    },
  });

  const handleSave = (id: number, text: string, itemType: ItemType, copyAfter?: boolean) => {
    updateTextClip(id, text, itemType, copyAfter)
      .then(() => fire(copyAfter ? "Enregistré et copié ✓" : "Enregistré ✓"))
      .catch(console.error);
  };

  const collectionClipCounts = useMemo(() => {
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
  const filteredText = useMemo(
    () => (!search ? baseText : baseText.filter((clip) => clip.text.toLowerCase().includes(q))),
    [q, search, baseText],
  );
  const filteredImages = useMemo(
    () => (!search ? baseImages : baseImages.filter((clip) => clip.hash.toLowerCase().includes(q))),
    [baseImages, q, search],
  );
  const autoLinks = useMemo(() => textClips.filter((clip) => isLinkOrPath(clip.text)), [textClips]);
  const filteredLinks = useMemo(
    () => (!search ? autoLinks : autoLinks.filter((clip) => clip.text.toLowerCase().includes(q))),
    [autoLinks, q, search],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    // Drop on a collection slot
    if (over.id.toString().startsWith("collection-drop-")) {
      const collectionId = over.data.current?.collectionId;
      const clipId = active.data.current?.clipId;
      if (collectionId && clipId !== undefined) {
        setClipCollection(clipId, collectionId, 0).then(() => fire("Déplacé vers la collection ✓"));
      }
    }
    // Drop to reorder inside collection
    else if (activeCollectionId && over.id !== active.id) {
       const clipId = active.data.current?.clipId;
       const overId = over.data.current?.clipId;
       const type = active.data.current?.type;
       if (clipId && overId && type) {
          const list = type === "text" || type === "link" ? (type === "link" ? filteredLinks : filteredText) : filteredImages;
          const oldIndex = list.findIndex(c => c.id === clipId);
          const newIndex = list.findIndex(c => c.id === overId);
          if (oldIndex !== -1 && newIndex !== -1) {
             const newList = [...list];
             const [moved] = newList.splice(oldIndex, 1);
             newList.splice(newIndex, 0, moved);
             reorderInCollection(newList.map(c => c.id));
          }
       }
    }
  };

  const tabCount: Record<TabId, number> = {
    text: filteredText.length,
    images: filteredImages.length,
    links: filteredLinks.length,
    favs: textClips.filter((clip) => clip.fav).length,
    colls: 0,
  };

  return (
    <ThemeProvider theme={theme}>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          fontFamily: theme.fontUI,
          color: C.t1,
          overflow: "hidden",
          position: "relative",
          transition: "background 0.3s",
        }}
      >
        <TitleBar
          pinned={winPinned}
          onPin={() => setWinPinned((p) => !p)}
          search={search}
          onSearch={setSearch}
        />

        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <Sidebar
              activeTab={activeTab}
              onTab={(tab) => {
                setActiveTab(tab);
                setActiveCollectionId(null);
              }}
              onSettings={() => setSettOpen(true)}
              onSystem={() => setSysOpen(true)}
              onCapture={() => {
                  invoke("start_screen_capture")
                    .then(() => fire("Capture lancée ✓"))
                    .catch((e) => fire(`Erreur capture : ${e}`));
                }}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderLeft: `1px solid ${C.border}`,
                position: "relative",
              }}
            >
              {/* CollectionBar is always visible above the main view unless searching or in favs */}
              {activeTab !== "favs" && !search && (
                <CollectionBar
                  collections={activeTab === "colls" ? collections : collections.filter(g => g.origin_tab === activeTab)}
                  activeCollectionId={activeCollectionId}
                  onSelectCollection={setActiveCollectionId}
                  onCreateCollection={() => setCreateCollectionOpen(true)}
                  onDeleteCollection={deleteCollection}
                  collectionClipCounts={collectionClipCounts}
                />
              )}

              {activeTab === "text" && (
                <TextTab
                  clips={filteredText}
                  onCtx={handleCtx}
                  onDoubleClick={handleDoubleClick}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
              {activeTab === "images" && (
                <ImagesTab
                  images={filteredImages}
                  onCtx={handleCtx}
                  onDoubleClick={handleDoubleClick}
                  gridCols={4}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
              {activeTab === "links" && (
                <LinksTab
                  links={filteredLinks}
                  onCtx={handleCtx}
                  onDoubleClick={handleDoubleClick}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
              {activeTab === "favs" && (
                <FavsTab
                  clips={textClips}
                  onCtx={handleCtx}
                  onDoubleClick={handleDoubleClick}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
              {activeTab === "colls" && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.t3,
                    fontSize: 13,
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 48 }}>🗂️</span>
                  <span>Toutes vos collections apparaissent dans la barre ci-dessus</span>
                </div>
              )}

              <StatusBar count={tabCount[activeTab] ?? 0} tab={activeTab} />

              {editor && (
                <EditorPanel
                  item={editor.item}
                  itemType={editor.itemType}
                  onSave={handleSave}
                  onClose={() => setEditor(null)}
                />
              )}
            </div>
          </div>
        </DndContext>

        {ctx && (
          <CtxMenu
            x={ctx.x}
            y={ctx.y}
            item={ctx.item}
            itemType={ctx.itemType}
            handlers={buildHandlers(ctx.item, ctx.itemType)}
          />
        )}
        {sysOpen && <SysDrawer onClose={() => setSysOpen(false)} />}
        {settOpen && (
          <Settings
            onClose={() => setSettOpen(false)}
            themeName={themeName}
            onThemeChange={setThemeName}
          />
        )}
        <CreateCollectionModal
          open={createCollectionOpen}
          onClose={() => setCreateCollectionOpen(false)}
          onCreate={(name, icon, color) => createCollection(name, icon, color, activeTab)}
        />
        {toast && <Toast msg={toast} />}
      </div>
    </ThemeProvider>
  );
}
