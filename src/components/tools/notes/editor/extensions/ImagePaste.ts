import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

import { saveNoteAsset } from "../../../../../lib/note-assets";

const PLUGIN_KEY = new PluginKey("notesImagePaste");

async function insertImage(view: EditorView, file: File) {
  if (!file.type.startsWith("image/")) return false;
  try {
    const buf = await file.arrayBuffer();
    const ext = file.type.split("/")[1] || "png";
    const { url } = await saveNoteAsset(new Uint8Array(buf), ext);
    const { schema } = view.state;
    const node = schema.nodes.image?.create({ src: url, alt: "" });
    if (!node) return false;
    const tr = view.state.tr.replaceSelectionWith(node);
    view.dispatch(tr);
    return true;
  } catch (e) {
    console.error("[notes ImagePaste] failed:", e);
    return false;
  }
}

/**
 * Intercepts paste/drop of image files and saves them to the local
 * notes_assets folder, then inserts an `<img>` node referencing the
 * `convertFileSrc()` URL.
 */
export const ImagePaste = Extension.create({
  name: "notesImagePaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: PLUGIN_KEY,
        props: {
          handlePaste(view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;
            for (let i = 0; i < items.length; i++) {
              const it = items[i];
              if (it.kind === "file") {
                const file = it.getAsFile();
                if (file && file.type.startsWith("image/")) {
                  event.preventDefault();
                  void insertImage(view, file);
                  return true;
                }
              }
            }
            return false;
          },
          handleDrop(view, event) {
            const dt = (event as DragEvent).dataTransfer;
            const files = dt?.files;
            if (!files || files.length === 0) return false;
            const imageFiles = Array.from(files).filter((f) =>
              f.type.startsWith("image/"),
            );
            if (imageFiles.length === 0) return false;
            event.preventDefault();
            void Promise.all(imageFiles.map((f) => insertImage(view, f)));
            return true;
          },
        },
      }),
    ];
  },
});
