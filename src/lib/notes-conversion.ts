/**
 * TipTap JSON → Markdown pour l'export `.md`.
 *
 * Best-effort : les nœuds custom non couverts par `tiptap-markdown`
 * (callouts, tableaux complexes, etc.) sont simplifiés ou perdus.
 *
 * On utilise un éditeur TipTap **headless** (pas monté dans le DOM) comme
 * convertisseur — c'est l'API supportée par tiptap-markdown.
 */

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Markdown } from "tiptap-markdown";

let cached: Editor | null = null;
function headless(): Editor {
  if (cached) return cached;
  cached = new Editor({
    extensions: [
      StarterKit.configure({}),
      Image,
      Markdown.configure({ html: false, linkify: true, breaks: true }),
    ],
    content: "",
  });
  return cached;
}

/** Convertit un body TipTap (JSON stringifié) en markdown. */
export function tipTapToMarkdown(body: string): string {
  if (!body) return "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Pas du JSON — on suppose déjà du markdown ou du plain text.
    return body;
  }
  if (!parsed || typeof parsed !== "object") return body;
  const editor = headless();
  editor.commands.setContent(parsed as never, false);
  // tiptap-markdown attache une storage.markdown
  const storage = (editor.storage as Record<string, unknown>).markdown as
    | { getMarkdown: () => string }
    | undefined;
  return storage?.getMarkdown() ?? body;
}
