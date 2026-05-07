import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../../lib/theme";
import { C, hexToRgba } from "../../../lib/colors";
import { Ic } from "../../icons";

interface Props {
  tags: string[];
  suggestions?: string[];
  onChange: (tags: string[]) => void;
}

/** Compact, inline tag input. Suggestions come from the existing note set. */
export function TagPicker({ tags, suggestions = [], onChange }: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = suggestions
    .filter((s) => !tags.includes(s) && s.toLowerCase().includes(draft.toLowerCase()))
    .slice(0, 6);

  const add = (value: string) => {
    const v = value.trim();
    if (!v || tags.includes(v)) return;
    onChange([...tags, v]);
    setDraft("");
  };
  const remove = (value: string) => onChange(tags.filter((t) => t !== value));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!inputRef.current?.parentElement?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      {tags.map((t) => (
        <span
          key={t}
          style={{
            fontSize: 10.5,
            padding: "2px 6px 2px 8px",
            borderRadius: 10,
            background: hexToRgba(theme.accent, 0.18),
            color: theme.accent,
            fontFamily: theme.fontMono,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {t}
          <button
            onClick={() => remove(t)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: theme.accent,
              padding: 0,
              display: "flex",
            }}
          >
            <Ic.X width={9} height={9} strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && tags.length) {
            remove(tags[tags.length - 1]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        onFocus={() => setOpen(true)}
        placeholder={tags.length ? "" : "Ajouter un tag…"}
        style={{
          flex: 1,
          minWidth: 80,
          background: "transparent",
          border: "none",
          outline: "none",
          color: C.t1,
          fontSize: 11,
          fontFamily: theme.fontMono,
        }}
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "var(--bg)",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: 4,
            minWidth: 140,
            boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
            zIndex: 50,
          }}
        >
          {filtered.map((s) => (
            <div
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                add(s);
              }}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                fontFamily: theme.fontMono,
                cursor: "pointer",
                borderRadius: 3,
                color: C.t2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.rowHov)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
