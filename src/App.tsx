import { useEffect, useMemo, useState } from "react";
import type { ItemType, TabId, ThemeId, AnyClip, TextClip, ImageClip } from "./types";
import { THEMES } from "./themes";
import { ThemeProvider } from "./lib/theme";
import { C } from "./lib/colors";
import { INIT_IMAGES } from "./data/seed";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

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

async function copyToClipboard(text: string): Promise<void> {
  // Tell the Rust watcher to ignore this text so it doesn't re-detect it
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
  const [textClips, setTextClips] = useState<TextClip[]>([]);
  const [imageClips, setImageClips] = useState<ImageClip[]>(INIT_IMAGES);

  const theme = THEMES[themeName];
  const gridCols = 4;

  const fire = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), TOAST_MS);
  };

  // Load persisted history on mount + subscribe to live clipboard events
  useEffect(() => {
    let cancelled = false;

    invoke<TextClip[]>("get_history")
      .then((history) => {
        if (!cancelled) setTextClips(history);
      })
      .catch((e) => console.error("[get_history] failed:", e));

    let unlisten: (() => void) | undefined;
    listen<TextClip>("clipboard://new-item", (event) => {
      if (!cancelled) {
        setTextClips((prev) => {
          // Deduplicate by id to prevent double-adds
          if (prev.some((c) => c.id === event.payload.id)) return prev;
          return [event.payload, ...prev];
        });
      }
    }).then((fn) => {
      if (cancelled) {
        fn(); // Already unmounted — cleanup immediately
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    const h = () => setCtx(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
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

  const handleDoubleClick = (id: number, type: ItemType) => {
    const clip =
      type === "text" || type === "link"
        ? textClips.find((c) => c.id === id)
        : imageClips.find((c) => c.id === id);

    if (clip) {
      const text =
        type === "text" || type === "link"
          ? (clip as TextClip).text
          : (clip as ImageClip).hash;
      copyToClipboard(text).catch(console.error);
    }

    // Reorder locally + persist via Rust command
    const lift = <T extends { id: number }>(setter: React.Dispatch<React.SetStateAction<T[]>>) => {
      setter((prev) => {
        const it = prev.find((c) => c.id === id);
        return it ? [it, ...prev.filter((c) => c.id !== id)] : prev;
      });
    };
    if (type === "text" || type === "link") {
      lift(setTextClips);
      invoke("reorder_clip", { id }).catch(console.error);
    }
    if (type === "image") lift(setImageClips);
    fire("Copié + remonté en tête ↑");
  };

  const buildHandlers = (item: AnyClip, itemType: ItemType): CtxHandlers => ({
    copy: () => {
      const text =
        itemType === "text" || itemType === "link"
          ? (item as TextClip).text
          : (item as ImageClip).hash;
      copyToClipboard(text).catch(console.error);
      fire("Copié ✓");
      setCtx(null);
    },
    edit: () => {
      if (itemType === "image") {
        fire("Ouverture dans Paint...");
        setCtx(null);
      } else {
        setEditor({ item: item as TextClip, itemType });
        setCtx(null);
      }
    },
    pin: () => {
      const toggle = <T extends { id: number; pinned: boolean }>(arr: T[]) =>
        arr.map((c) => (c.id === item.id ? { ...c, pinned: !c.pinned } : c));
      if (itemType === "text" || itemType === "link") setTextClips((prev) => toggle(prev));
      if (itemType === "image") setImageClips((prev) => toggle(prev));
      const wasPinned = (item as TextClip | ImageClip).pinned;
      fire(wasPinned ? "Désépinglé" : "Épinglé ✓");
      setCtx(null);
    },
    delete: () => {
      if (itemType === "text" || itemType === "link") {
        invoke("delete_clip", { id: (item as TextClip).id }).catch(console.error);
        setTextClips((p) => p.filter((c) => c.id !== item.id));
      }
      if (itemType === "image") setImageClips((p) => p.filter((c) => c.id !== item.id));
      fire("Supprimé");
      setCtx(null);
    },
    copyPlain: () => {
      const text =
        itemType === "text" || itemType === "link"
          ? (item as TextClip).text
          : (item as ImageClip).hash;
      copyToClipboard(text).catch(console.error);
      fire("Texte brut copié ✓");
      setCtx(null);
    },
  });

  const handleSave = (id: number, text: string, itemType: ItemType) => {
    if (itemType === "text" || itemType === "link") {
      invoke("update_clip", { id, text }).catch(console.error);
      setTextClips((p) => p.map((c) => (c.id === id ? { ...c, text } : c)));
    }
    fire("Enregistré ✓");
  };

  const q = search.toLowerCase();
  const filteredText = useMemo(
    () => (!search ? textClips : textClips.filter((c) => c.text.toLowerCase().includes(q))),
    [textClips, search, q],
  );
  const filteredImages = useMemo(
    () => (!search ? imageClips : imageClips.filter((c) => c.hash.toLowerCase().includes(q))),
    [imageClips, search, q],
  );
  const autoLinks = useMemo(
    () => textClips.filter((c) => isLinkOrPath(c.text)),
    [textClips],
  );
  const filteredLinks = useMemo(
    () => (!search ? autoLinks : autoLinks.filter((c) => c.text.toLowerCase().includes(q))),
    [autoLinks, search, q],
  );

  const tabCount: Record<TabId, number> = {
    text: filteredText.length,
    images: filteredImages.length,
    links: filteredLinks.length,
    favs: textClips.filter((c) => c.fav).length,
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

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Sidebar
            activeTab={activeTab}
            onTab={setActiveTab}
            onSettings={() => setSettOpen(true)}
            onSystem={() => setSysOpen(true)}
            onCapture={() => fire("Capture (à venir)")}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderLeft: `1px solid ${C.border}`,
            }}
          >
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
                gridCols={gridCols}
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
                }}
              >
                Collections — À venir
              </div>
            )}
            <StatusBar count={tabCount[activeTab] ?? 0} tab={activeTab} />
          </div>
        </div>

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
        {editor && (
          <EditorPanel
            item={editor.item}
            itemType={editor.itemType}
            onSave={handleSave}
            onClose={() => setEditor(null)}
          />
        )}
        {toast && <Toast msg={toast} />}
      </div>
    </ThemeProvider>
  );
}
