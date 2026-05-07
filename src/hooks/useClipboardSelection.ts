import { useCallback, useState } from "react";
import type { MouseEvent } from "react";
import type { AnyClip } from "../types";

export function useClipboardSelection() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selection, setSelection] = useState<Set<number>>(new Set());

  const clearSelection = useCallback(() => {
    setSelection(new Set());
    setSelectedId(null);
  }, []);

  const selectOnly = useCallback((id: number) => {
    setSelection(new Set([id]));
    setSelectedId(id);
  }, []);

  const handleSelect = useCallback((id: number, e: MouseEvent, list: AnyClip[]) => {
    const isMulti = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    if (isShift && selectedId !== null) {
      const idxA = list.findIndex((c) => c.id === selectedId);
      const idxB = list.findIndex((c) => c.id === id);
      if (idxA !== -1 && idxB !== -1) {
        const start = Math.min(idxA, idxB);
        const end = Math.max(idxA, idxB);
        setSelection(new Set(list.slice(start, end + 1).map((c) => c.id)));
      }
      return;
    }

    if (isMulti) {
      setSelection((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          if (selectedId === id) {
            setSelectedId(list.find((item) => next.has(item.id))?.id ?? null);
          }
        } else {
          next.add(id);
          setSelectedId(id);
        }
        return next;
      });
      return;
    }

    const isSoloSelected = selection.size === 1 && selection.has(id);
    if (isSoloSelected) {
      clearSelection();
      return;
    }

    selectOnly(id);
  }, [clearSelection, selectOnly, selectedId, selection]);

  return {
    selection,
    clearSelection,
    selectOnly,
    handleSelect,
  };
}
