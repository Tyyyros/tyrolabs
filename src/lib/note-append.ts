import type { NoteFormat } from "../types";

export type AppendableClip =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; url: string }
  | { kind: "image"; assetHash: string; assetExt: string; resolvedUrl: string };

interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
  content?: TipTapNode[];
}

interface TipTapDoc {
  type: "doc";
  content: TipTapNode[];
}

const EMPTY_DOC: TipTapDoc = { type: "doc", content: [] };

function parseDoc(body: string): TipTapDoc {
  if (!body.trim()) return { ...EMPTY_DOC };
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object" && parsed.type === "doc") {
      const doc = parsed as TipTapDoc;
      if (!Array.isArray(doc.content)) doc.content = [];
      return doc;
    }
    return { ...EMPTY_DOC };
  } catch {
    return { ...EMPTY_DOC };
  }
}

function richTextNodes(clip: AppendableClip): TipTapNode[] {
  switch (clip.kind) {
    case "text": {
      const text = clip.text;
      if (!text) return [];
      // Preserve newlines as separate paragraphs (TipTap convention).
      return text.split(/\r?\n/).map((line) => ({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : [],
      }));
    }
    case "link": {
      const label = clip.text || clip.url;
      return [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: label,
              marks: [{ type: "link", attrs: { href: clip.url } }],
            },
          ],
        },
      ];
    }
    case "image": {
      return [
        {
          type: "image",
          attrs: { src: clip.resolvedUrl },
        },
      ];
    }
  }
}

function markdownChunk(clip: AppendableClip): string {
  switch (clip.kind) {
    case "text":
      return clip.text;
    case "link": {
      const label = clip.text || clip.url;
      return `[${label}](${clip.url})`;
    }
    case "image":
      return `![](note-asset://${clip.assetHash}.${clip.assetExt})`;
  }
}

/** Append a clipboard item to a note's body, format-aware.
 *  Pure function — no IO, safe to unit test. */
export function appendToNoteBody(
  body: string,
  format: NoteFormat,
  clip: AppendableClip,
): string {
  if (format === "richtext") {
    const doc = parseDoc(body);
    doc.content.push(...richTextNodes(clip));
    return JSON.stringify(doc);
  }
  // markdown
  const chunk = markdownChunk(clip);
  if (!body.trim()) return chunk;
  return `${body.replace(/\s+$/, "")}\n\n${chunk}`;
}
