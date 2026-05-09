import { useCallback, useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent, Modifier } from "@dnd-kit/core";
import { invoke } from "@tauri-apps/api/core";

import { Ic } from "./components/icons";
import { CollectionBar } from "./components/groups/CollectionBar";
import { CreateCollectionModal } from "./components/groups/CreateCollectionModal";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { TitleBar } from "./components/layout/TitleBar";
import { CtxMenu, type CtxHandlers } from "./components/overlays/CtxMenu";
import { EditorPanel } from "./components/overlays/EditorPanel";
import { NotePickerModal } from "./components/overlays/NotePickerModal";
import { Settings } from "./components/overlays/Settings";
import { SysDrawer } from "./components/overlays/SysDrawer";
import { ImagesTab } from "./components/tabs/ImagesTab";
import { LinksTab } from "./components/tabs/LinksTab";
import { TextTab } from "./components/tabs/TextTab";
import { NotesPanel } from "./components/tools/notes/NotesPanel";
import { PasswordPanel } from "./components/tools/password/PasswordPanel";
import { Toast } from "./components/ui/Toast";
import { useAppShellEvents, useCaptureShortcut, useTauriAppEvents } from "./hooks/useAppEvents";
import { useClipboardSelection } from "./hooks/useClipboardSelection";
import { useClipboardShortcuts } from "./hooks/useClipboardShortcuts";
import { useClipboardViews } from "./hooks/useClipboardViews";
import { useNotesStore } from "./hooks/useNotesStore";
import { useToast } from "./hooks/useToast";
import { hexToRgba, C } from "./lib/colors";
import { useClipboardStore } from "./lib/clipboard-store";
import { resolveNoteAsset } from "./lib/note-assets";
import { appendToNoteBody, type AppendableClip } from "./lib/note-append";
import { ThemeProvider } from "./lib/theme";
import { useI18n } from "./lib/i18n";
import { THEMES } from "./themes";
import type { AnyClip, ClipboardSettings, ImageClip, ItemType, TabId, TextClip, ThemeId } from "./types";

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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("text");
  const [search, setSearch] = useState("");
  const [ctx, setCtx] = useState<{ x: number; y: number; item: AnyClip; itemType: ItemType } | null>(null);
  const [themeName, setThemeName] = useState<ThemeId>("command");

  // Hydrate le thème depuis le store backend au mount (langue est gérée par I18nProvider).
  useEffect(() => {
    invoke<{ theme?: string }>("get_app_settings")
      .then((settings) => {
        if (settings.theme && settings.theme in THEMES) {
          setThemeName(settings.theme as ThemeId);
        }
      })
      .catch(() => {
        // store indisponible → fallback "command" déjà actif.
      });
  }, []);

  const handleThemeChange = useCallback((next: ThemeId) => {
    setThemeName(next);
    invoke("set_app_settings", { settings: { theme: next } }).catch((error) => {
      console.error("[set_app_settings] theme failed:", error);
    });
  }, []);
  const [sysOpen, setSysOpen] = useState(false);
  const [settOpen, setSettOpen] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  type DragItem = { id: number | string; type: ItemType | "note" };
  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: AnyClip; type: ItemType } | null>(null);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [notePickerClip, setNotePickerClip] = useState<{ items: AnyClip[]; type: ItemType } | null>(null);
  const [pendingOpenNoteId, setPendingOpenNoteId] = useState<string | null>(null);

  const theme = THEMES[themeName];
  const { toast, fire } = useToast();
  const { t, lang } = useI18n();
  const {
    selection,
    clearSelection,
    selectOnly,
    handleSelect,
  } = useClipboardSelection();
  const store = useClipboardStore();
  const notesStore = useNotesStore();
  const {
    textClips,
    imageClips,
    clipboardSettings,
    textCollections,
    imageCollections,
    linkCollections,
    copyPlainText,
    copyMergedClips,
    copyAndPromoteClip,
    togglePinned,
    deleteClips,
    updateTextClip,
    updateClipboardSettings,
    createCollection,
    updateCollection,
    deleteCollection,
    setClipsCollection,
    openClip,
  } = store;

  const views = useClipboardViews({
    activeTab,
    activeCollectionId,
    search,
    textClips,
    imageClips,
    textCollections,
    imageCollections,
    linkCollections,
  });
  const {
    activeSilo,
    activeCollections,
    collectionCounts,
    filteredText,
    filteredImages,
    filteredLinks,
    activeCollectionName,
    statusCount,
  } = views;

  useEffect(() => {
    setActiveCollectionId(null);
    clearSelection();
  }, [activeTab, clearSelection]);

  const dismissMenus = useCallback(() => {
    setCtx(null);
    clearSelection();
  }, [clearSelection]);

  const dismissAll = useCallback(() => {
    dismissMenus();
    setEditingItem(null);
  }, [dismissMenus]);

  useAppShellEvents({ onDismiss: dismissMenus, onEscape: dismissAll });

  // Ferme le menu contextuel au mousedown en dehors du menu.
  // dnd-kit appelle preventDefault() sur pointerdown des lignes triables,
  // ce qui supprime l'événement click — donc le handler click global ne
  // se déclenche pas de façon fiable. mousedown n'est pas affecté.
  useEffect(() => {
    if (!ctx) return;
    const closeOnOutside = (event: globalThis.MouseEvent) => {
      const target = event.target as Element | null;
      if (target && target.closest("[data-ctx-menu]")) return;
      setCtx(null);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [ctx]);

  const [delayedCaptureTrigger, setDelayedCaptureTrigger] = useState(0);

  const handleCapture = useCallback(() => {
    invoke("prepare_capture", { mode: "image" }).catch((error) => {
      console.error(error);
      fire(t("capture.prepare.failed"));
    });
  }, [fire, t]);
  const handleOcrCapture = useCallback(() => {
    invoke("prepare_capture", { mode: "ocr" }).catch((error) => {
      console.error(error);
      fire(t("capture.prepare.failed"));
    });
  }, [fire, t]);

  useTauriAppEvents({
    onOpenSettings: useCallback(() => setSettOpen(true), []),
    onCaptureDone: useCallback(() => setActiveTab("images"), []),
    onOcrDone: useCallback(
      (count: number) => fire(t("capture.ocr.success", { count })),
      [fire, t],
    ),
    onOcrError: useCallback(
      (kind: "empty" | "failed", message?: string) => {
        if (kind === "empty") {
          fire(t("capture.ocr.empty"));
        } else {
          fire(t("capture.ocr.failed", { error: message ?? "" }));
        }
      },
      [fire, t],
    ),
    onTrayCaptureNormal: handleCapture,
    onTrayCaptureDelayed: useCallback(() => {
      setDelayedCaptureTrigger((n) => n + 1);
    }, []),
    onTrayCaptureOcr: handleOcrCapture,
  });

  const capturePulse = useCaptureShortcut(handleCapture);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const selectedTextItems = useCallback(() => {
    const source = activeTab === "links" ? filteredLinks : filteredText;
    return source.filter((clip) => selection.has(clip.id));
  }, [activeTab, filteredLinks, filteredText, selection]);

  const selectedImageItems = useCallback(() => {
    const source = activeTab === "images" ? filteredImages : [];
    return source.filter((clip) => selection.has(clip.id));
  }, [activeTab, filteredImages, selection]);

  const handleBatchDelete = useCallback(() => {
    const selectedText = selectedTextItems();
    const selectedImages = selectedImageItems();
    const textType: ItemType = activeTab === "links" ? "link" : "text";
    const total = selectedText.length + selectedImages.length;
    if (total === 0) return;

    Promise.all([
      selectedText.length ? deleteClips(selectedText.map((clip) => clip.id), textType) : Promise.resolve(),
      selectedImages.length ? deleteClips(selectedImages.map((clip) => clip.id), "image") : Promise.resolve(),
    ])
      .then(() => {
        clearSelection();
        fire(t("toast.deleted.batch", { n: total, s: total > 1 && lang === "fr" ? "s" : "" }));
      })
      .catch((error) => {
        console.error("[delete_clips] failed:", error);
        fire(t("toast.delete.failed"));
      });
  }, [activeTab, clearSelection, deleteClips, fire, selectedImageItems, selectedTextItems, t, lang]);

  const handleBatchCopy = useCallback(() => {
    const selectedText = selectedTextItems();
    const selectedImages = selectedImageItems();
    const hasText = selectedText.length > 0;
    const hasImages = selectedImages.length > 0;
    if (!hasText && !hasImages) return;

    if (hasImages && !hasText) {
      copyMergedClips(selectedImages, "image")
        .then((copied) => {
          if (copied) fire(selectedImages.length > 1 ? t("toast.merge.first_image") : t("toast.image_copied"));
        })
        .catch((error) => {
          console.error("[copy_image] failed:", error);
          fire(t("toast.copy.failed"));
        });
      return;
    }

    const textType: ItemType = activeTab === "links" ? "link" : "text";
    copyMergedClips(selectedText, textType)
      .then((copied) => {
        if (copied) fire(t("toast.merge.batch", { n: selectedText.length, s: selectedText.length > 1 && lang === "fr" ? "s" : "" }));
      })
      .catch((error) => {
        console.error("[copy_text] failed:", error);
        fire(t("toast.copy.failed"));
      });
  }, [activeTab, copyMergedClips, fire, selectedImageItems, selectedTextItems, t, lang]);

  useClipboardShortcuts({
    selectedCount: selection.size,
    onDelete: handleBatchDelete,
    onCopy: handleBatchCopy,
  });

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (!data) return;

    if (data.type === "note" && typeof data.noteId === "string") {
      setActiveDragItem({ id: data.noteId, type: "note" });
      return;
    }

    const clipId = data.clipId;
    const type = data.type;
    if (typeof clipId !== "number" || !type) return;
    setActiveDragItem({ id: clipId, type });
    if (!selection.has(clipId)) {
      selectOnly(clipId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    if (!event.over) return;

    const overData = event.over.data.current;
    const activeData = event.active.data.current;
    if (!overData || !activeData) return;

    // Notes drag: { type: "note", noteId } → { collectionId, silo: "notes" }.
    if (
      activeData.type === "note" &&
      typeof activeData.noteId === "string" &&
      overData.silo === "notes" &&
      typeof overData.collectionId === "string"
    ) {
      notesStore
        .setNotesCollection([activeData.noteId], overData.collectionId)
        .then(() => fire(t("notes.moved")))
        .catch((error) => {
          console.error("[set_notes_collection] failed:", error);
          fire(t("toast.move.failed"));
        });
      return;
    }

    // Clipboard drag (silos text/image/link).
    if (!activeSilo) return;
    const collectionId = overData.collectionId;
    const draggedClipId = activeData.clipId;
    if (typeof collectionId !== "string" || typeof draggedClipId !== "number") return;

    const clipIds = selection.has(draggedClipId) ? Array.from(selection) : [draggedClipId];
    setClipsCollection(clipIds, collectionId, activeSilo)
      .then(() => {
        fire(t("toast.move.batch", { n: clipIds.length, s: clipIds.length > 1 && lang === "fr" ? "s" : "" }));
        clearSelection();
      })
      .catch((error) => {
        console.error("Move failed:", error);
        fire(t("toast.move.failed"));
      });
  };

  const handleDoubleClick = (id: number, type: ItemType) => {
    copyAndPromoteClip(id, type)
      .then((copied) => {
        if (copied) fire(type === "image" ? t("toast.image_copied") : t("toast.copied"));
      })
      .catch((error) => {
        console.error("[copy_clip] failed:", error);
        fire(t("toast.copy.failed"));
      });
  };

  const handleCtx = ({ e, item, itemType }: { e: MouseEvent; item: AnyClip; itemType: ItemType }) => {
    e.preventDefault();
    if (!selection.has(item.id)) {
      selectOnly(item.id);
    }
    setCtx({ x: e.clientX, y: e.clientY, item, itemType });
  };

  const getHandlers = (item: AnyClip, type: ItemType): CtxHandlers => {
    const isTextual = type === "text" || type === "link";
    return {
      copy: () => {
        setCtx(null);
        handleDoubleClick(item.id, type);
      },
      pin: () => {
        setCtx(null);
        togglePinned(item.id, isTextual ? "text" : "image");
      },
      delete: () => {
        setCtx(null);
        deleteClips([item.id], isTextual ? type : "image")
          .then(() => fire(t("toast.deleted")))
          .catch((error) => {
            console.error("[delete_clip] failed:", error);
            fire(t("toast.delete.failed"));
          });
      },
      edit: () => {
        setCtx(null);
        setEditingItem({ item, type });
      },
      copyPlain: isTextual
        ? () => {
            setCtx(null);
            copyPlainText((item as TextClip).text)
              .then(() => fire(t("toast.plain.success")))
              .catch((error) => {
                console.error("[copy_plain] failed:", error);
                fire(t("toast.copy.failed"));
              });
          }
        : undefined,
      open: type === "image"
        ? () => {
            setCtx(null);
            openClip(item, "image");
          }
        : type === "link"
          ? () => {
              setCtx(null);
              openClip(item, "link");
            }
          : undefined,
      addToNote: () => {
        setCtx(null);
        // Collect every selected item of the same type (preserves visible
        // order by filtering from the source list rather than the unordered
        // Set). If selection is empty for any reason, fall back to the
        // single right-clicked item.
        const source =
          type === "image"
            ? filteredImages
            : type === "link"
              ? filteredLinks
              : filteredText;
        const selectedSameType = source.filter((c) => selection.has(c.id));
        const batch = selectedSameType.length > 0 ? selectedSameType : [item];
        setNotePickerClip({ items: batch, type });
      },
    };
  };

  const handleSettingsChange = (settings: ClipboardSettings) => {
    updateClipboardSettings(settings).catch((error) => {
      console.error("[update_clipboard_settings] failed:", error);
      fire(t("toast.settings.failed"));
    });
  };

  // ── Add-to-note pipeline ──────────────────────────────────────────────
  // Build the format-agnostic AppendableClip from a clipboard item.
  // For images we duplicate the asset into the notes_assets/ folder via
  // `clip_image_to_note_asset` (deduplicated by hash on the Rust side).
  const buildAppendable = useCallback(
    async (item: AnyClip, type: ItemType): Promise<AppendableClip> => {
      if (type === "image") {
        const img = item as ImageClip;
        const saved = await invoke<{ hash: string; ext: string }>(
          "clip_image_to_note_asset",
          { hash: img.hash },
        );
        const resolvedUrl = await resolveNoteAsset(saved.hash, saved.ext);
        return {
          kind: "image",
          assetHash: saved.hash,
          assetExt: saved.ext,
          resolvedUrl,
        };
      }
      const txt = (item as TextClip).text || "";
      if (type === "link") {
        return { kind: "link", text: txt, url: txt };
      }
      return { kind: "text", text: txt };
    },
    [],
  );

  const computeNoteTitle = useCallback(
    (item: AnyClip, type: ItemType): string => {
      if (type === "image") {
        return (item as ImageClip).text || t("notes.untitled");
      }
      const raw = ((item as TextClip).text || "").trim();
      if (!raw) return t("notes.untitled");
      if (type === "link") {
        try {
          return new URL(raw).hostname;
        } catch {
          return raw.slice(0, 40) + (raw.length > 40 ? "…" : "");
        }
      }
      const oneLine = raw.split(/\r?\n/)[0] ?? raw;
      return oneLine.slice(0, 40) + (oneLine.length > 40 ? "…" : "");
    },
    [t],
  );

  // Append one or more clips to an existing note in a single update.
  const appendClipsToNote = useCallback(
    async (noteId: string, items: AnyClip[], type: ItemType) => {
      if (items.length === 0) return;
      const note = notesStore.notes.find((n) => n.id === noteId);
      if (!note) return;
      try {
        const appendables = await Promise.all(items.map((item) => buildAppendable(item, type)));
        const newBody = appendables.reduce(
          (body, app) => appendToNoteBody(body, note.format, app),
          note.body,
        );
        await notesStore.updateNote(noteId, { body: newBody });
        setActiveTab("notes");
        setPendingOpenNoteId(noteId);
        const noteTitle = note.title || t("notes.untitled");
        fire(
          items.length > 1
            ? t("notePicker.appendedMany", { count: items.length, title: noteTitle })
            : t("notePicker.appended", { title: noteTitle }),
        );
      } catch (error) {
        console.error("[appendClipsToNote] failed:", error);
        fire(t("notePicker.failed", { error: String(error) }));
      }
    },
    [notesStore, buildAppendable, fire, t],
  );

  const createNoteAndAppend = useCallback(
    async (items: AnyClip[], type: ItemType) => {
      if (items.length === 0) return;
      const title = computeNoteTitle(items[0], type);
      try {
        const note = await notesStore.createNote({ title, format: "richtext" });
        const appendables = await Promise.all(items.map((item) => buildAppendable(item, type)));
        const newBody = appendables.reduce(
          (body, app) => appendToNoteBody(body, note.format, app),
          note.body,
        );
        await notesStore.updateNote(note.id, { body: newBody });
        setActiveTab("notes");
        setPendingOpenNoteId(note.id);
        fire(
          items.length > 1
            ? t("notePicker.createdMany", { count: items.length })
            : t("notePicker.created"),
        );
      } catch (error) {
        console.error("[createNoteAndAppend] failed:", error);
        fire(t("notePicker.failed", { error: String(error) }));
      }
    },
    [notesStore, buildAppendable, computeNoteTitle, fire, t],
  );

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
            onOcrCapture={handleOcrCapture}
            capturePulse={capturePulse}
            delayedCaptureTrigger={delayedCaptureTrigger}
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
                    const current = activeCollections.find((collection) => collection.id === id);
                    if (current) updateCollection(activeSilo, id, name, current.icon, current.color);
                  }}
                  collectionClipCounts={collectionCounts}
                />
              )}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                {activeTab === "text" && <TextTab clips={filteredText} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selection={selection} onSelect={handleSelect} />}
                {activeTab === "images" && <ImagesTab images={filteredImages} gridCols={3} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selection={selection} onSelect={handleSelect} />}
                {activeTab === "links" && <LinksTab links={filteredLinks} onCtx={handleCtx} onDoubleClick={handleDoubleClick} selection={selection} onSelect={handleSelect} />}
                {activeTab === "notes" && (
                  <NotesPanel
                    store={notesStore}
                    search={search}
                    fire={fire}
                    pendingOpenNoteId={pendingOpenNoteId}
                    onPendingOpenConsumed={() => setPendingOpenNoteId(null)}
                  />
                )}
                {activeTab === "password" && <PasswordPanel fire={fire} />}
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
                      {activeDragItem.type === "image" ? (
                        <Ic.Image width={10} height={10} />
                      ) : activeDragItem.type === "note" ? (
                        <Ic.Note width={10} height={10} />
                      ) : (
                        <Ic.Text width={10} height={10} />
                      )}
                      <span>
                        {activeDragItem.type === "note"
                          ? 1
                          : selection.size > 1
                            ? selection.size
                            : 1}
                      </span>
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
                    updateTextClip(id, text, type, copyAfter)
                      .then(() => fire(t("toast.save.success")))
                      .catch((error) => {
                        console.error("[update_clip] failed:", error);
                        fire(t("toast.save.failed"));
                      });
                  }}
                />
              )}
            </DndContext>
          </main>
        </div>
        <StatusBar
          tab={activeTab}
          visibleCount={activeTab === "notes" ? notesStore.notes.length : statusCount}
          selectedCount={activeTab === "notes" ? 0 : selection.size}
          collectionName={activeTab === "notes" ? null : activeCollectionName}
        />
        {ctx && <CtxMenu x={ctx.x} y={ctx.y} item={ctx.item} itemType={ctx.itemType} handlers={getHandlers(ctx.item, ctx.itemType)} />}
        {sysOpen && <SysDrawer onClose={() => setSysOpen(false)} />}
        {settOpen && (
          <Settings
            onClose={() => setSettOpen(false)}
            themeName={themeName}
            onThemeChange={handleThemeChange}
            clipboardSettings={clipboardSettings}
            onClipboardSettingsChange={handleSettingsChange}
          />
        )}
        <CreateCollectionModal
          open={createCollectionOpen && activeSilo !== null}
          silo={activeSilo}
          onClose={() => setCreateCollectionOpen(false)}
          onCreate={(name, icon, color) => {
            if (activeSilo) createCollection(activeSilo, name, icon, color);
          }}
        />
        {notePickerClip && (
          <NotePickerModal
            onClose={() => setNotePickerClip(null)}
            notes={notesStore.notes}
            onPick={(id) => {
              const target = notePickerClip;
              setNotePickerClip(null);
              appendClipsToNote(id, target.items, target.type);
            }}
            onCreate={() => {
              const target = notePickerClip;
              setNotePickerClip(null);
              createNoteAndAppend(target.items, target.type);
            }}
          />
        )}
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
