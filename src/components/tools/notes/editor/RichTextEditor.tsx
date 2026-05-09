import { useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

import { useTheme } from "../../../../lib/theme";
import { C, hexToRgba } from "../../../../lib/colors";
import { Ic } from "../../../icons";
import { SlashCommand } from "./extensions/SlashCommand";
import { ImagePaste } from "./extensions/ImagePaste";
import { ResizableImage } from "./extensions/ResizableImage";
import { FloatingToolbar } from "./FloatingToolbar";
import type { SlashItem } from "./SlashMenu";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

function safeParse(value: string): unknown {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") return parsed;
    return null;
  } catch {
    return null;
  }
}

const slashItems = ({ query: _query }: { query: string }): SlashItem[] => [
  {
    title: "Titre 1",
    description: "Grand titre de section",
    icon: <Ic.H1 width={16} height={16} />,
    shortcut: "#",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Titre 2",
    description: "Sous-section",
    icon: <Ic.H2 width={16} height={16} />,
    shortcut: "##",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Titre 3",
    description: "Sous-titre",
    icon: <Ic.H2 width={14} height={14} />,
    shortcut: "###",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Liste à puces",
    description: "Liste non ordonnée",
    icon: <Ic.ListBullet width={15} height={15} />,
    shortcut: "*",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Liste numérotée",
    description: "Liste ordonnée 1. 2. 3.",
    icon: <Ic.ListNumber width={15} height={15} />,
    shortcut: "1.",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Citation",
    description: "Bloc de citation",
    icon: <Ic.Quote width={15} height={15} />,
    shortcut: ">",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Bloc de code",
    description: "Code monospace pré-formaté",
    icon: <Ic.Code width={15} height={15} />,
    shortcut: "```",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
];

export function RichTextEditor({ value, onChange }: Props) {
  const theme = useTheme();
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const initialContent = useMemo(() => safeParse(value) ?? value ?? "", [value]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // history is on by default
      }),
      Placeholder.configure({
        placeholder: "Tapez '/' pour les commandes…",
      }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      ImagePaste,
      SlashCommand.configure({ items: slashItems }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "tyrolabs-rte-content",
      },
    },
    onUpdate({ editor }) {
      const json = editor.getJSON();
      onChangeRef.current(JSON.stringify(json));
    },
  });

  // Sync external value (note swap) without rebuilding the editor.
  const lastSyncedValueRef = useRef(value);
  useEffect(() => {
    if (!editor) return;
    if (value === lastSyncedValueRef.current) return;
    lastSyncedValueRef.current = value;
    const next = safeParse(value) ?? value ?? "";
    const currentJson = JSON.stringify(editor.getJSON());
    if (currentJson === value) return;
    editor.commands.setContent(next as never, false);
  }, [editor, value]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "var(--bg)",
      }}
    >
      <style>{`
        .tyrolabs-rte-content {
          padding: 16px 24px;
          font-family: ${theme.fontUI};
          font-size: 14px;
          color: ${C.t1};
          line-height: 1.6;
          outline: none;
          min-height: 100%;
          overflow-y: auto;
        }
        .tyrolabs-rte-content p { margin: 0 0 8px; }
        .tyrolabs-rte-content h1 { font-size: 22px; font-weight: 700; margin: 18px 0 8px; }
        .tyrolabs-rte-content h2 { font-size: 18px; font-weight: 700; margin: 14px 0 6px; }
        .tyrolabs-rte-content h3 { font-size: 15px; font-weight: 700; margin: 12px 0 4px; }
        .tyrolabs-rte-content ul, .tyrolabs-rte-content ol { padding-left: 22px; margin: 4px 0 8px; }
        .tyrolabs-rte-content li { margin: 2px 0; }
        .tyrolabs-rte-content blockquote {
          border-left: 3px solid ${theme.accent};
          padding: 4px 12px;
          margin: 8px 0;
          color: ${C.t2};
          background: ${hexToRgba(theme.accent, 0.05)};
        }
        .tyrolabs-rte-content code {
          font-family: ${theme.fontMono};
          font-size: 12.5px;
          background: ${C.rowHov};
          padding: 1px 4px;
          border-radius: 3px;
        }
        .tyrolabs-rte-content pre {
          font-family: ${theme.fontMono};
          font-size: 12.5px;
          background: ${C.rowHov};
          padding: 10px 14px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 6px 0 10px;
        }
        .tyrolabs-rte-content pre code { background: transparent; padding: 0; }
        .tyrolabs-rte-content img {
          display: block;
          max-width: 100%;
          border-radius: 6px;
        }
        .tyrolabs-resizable-image {
          position: relative;
          display: inline-block;
          margin: 6px 0;
          max-width: 100%;
          line-height: 0;
        }
        .tyrolabs-resizable-image img {
          max-width: 100%;
          width: auto;
          height: auto;
        }
        /* Default cap when no explicit width persisted yet — keeps newly
           inserted images sensibly small (Notion / Word style). Once the
           user drags the handle, the inline style.width takes over and
           this cap no longer applies. */
        .tyrolabs-resizable-image img:not([style*="width"]) {
          max-height: 360px;
        }
        .tyrolabs-resize-handle {
          position: absolute;
          right: -4px;
          bottom: -4px;
          width: 14px;
          height: 14px;
          border-radius: 4px;
          background: ${theme.accent};
          border: 2px solid ${theme.bg};
          cursor: nwse-resize;
          opacity: 0;
          transition: opacity 0.12s ease;
          touch-action: none;
          z-index: 1;
        }
        .tyrolabs-resizable-image:hover .tyrolabs-resize-handle,
        .tyrolabs-resizable-image.is-resizing .tyrolabs-resize-handle {
          opacity: 1;
        }
        .tyrolabs-resizable-image.is-resizing img {
          /* Pendant le drag, on ignore le cap par défaut pour suivre le pointeur. */
          max-height: none;
        }
        .tyrolabs-resizable-image.ProseMirror-selectednode {
          outline: 2px solid ${hexToRgba(theme.accent, 0.6)};
          outline-offset: 2px;
          border-radius: 6px;
        }
        .tyrolabs-rte-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: ${C.t3};
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
      <EditorContent
        editor={editor}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      />
      <FloatingToolbar editor={editor} />
    </div>
  );
}
