import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";

import { useTheme } from "../../../../lib/theme";
import { C } from "../../../../lib/colors";
import { Ic } from "../../../icons";

interface Props {
  editor: Editor | null;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

/** Bubble-style floating toolbar that appears above the current selection. */
export function FloatingToolbar({ editor }: Props) {
  const theme = useTheme();
  const [pos, setPos] = useState<ToolbarPosition | null>(null);

  useEffect(() => {
    if (!editor) {
      setPos(null);
      return;
    }
    const update = () => {
      const { state, view } = editor;
      const { from, to, empty } = state.selection;
      if (empty || !view.hasFocus()) {
        setPos(null);
        return;
      }
      try {
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        const top = Math.min(start.top, end.top);
        const left = (start.left + end.left) / 2;
        setPos({ top, left });
      } catch {
        setPos(null);
      }
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("blur", () => setPos(null));
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!editor || !pos) return null;

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    attrs ? editor.isActive(name, attrs) : editor.isActive(name);

  const Btn = ({
    icon,
    title,
    active,
    onClick,
  }: {
    icon: React.ReactNode;
    title: string;
    active?: boolean;
    onClick: () => void;
  }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      style={{
        background: active ? theme.accent : "transparent",
        color: active ? "#fff" : C.t1,
        border: "none",
        padding: "4px 6px",
        borderRadius: 4,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
      }}
    >
      {icon}
    </button>
  );

  return (
    <div
      style={{
        position: "fixed",
        top: pos.top - 38,
        left: pos.left,
        transform: "translateX(-50%)",
        background: "var(--bg)",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: 3,
        display: "flex",
        gap: 1,
        boxShadow: "0 8px 22px rgba(0,0,0,0.45)",
        zIndex: 200,
      }}
    >
      <Btn
        icon={<Ic.Bold width={13} height={13} />}
        title="Gras"
        active={isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <Btn
        icon={<Ic.Italic width={13} height={13} />}
        title="Italique"
        active={isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <Btn
        icon={<Ic.Code width={13} height={13} />}
        title="Code"
        active={isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <div style={{ width: 1, background: C.borderDim, margin: "2px 2px" }} />
      <Btn
        icon={<Ic.H1 width={13} height={13} />}
        title="Titre 1"
        active={isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <Btn
        icon={<Ic.H2 width={13} height={13} />}
        title="Titre 2"
        active={isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <Btn
        icon={<Ic.Quote width={13} height={13} />}
        title="Citation"
        active={isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
    </div>
  );
}
