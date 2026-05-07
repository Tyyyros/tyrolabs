import { useEffect } from "react";

export function useClipboardShortcuts({
  selectedCount,
  onDelete,
  onCopy,
}: {
  selectedCount: number;
  onDelete: () => void;
  onCopy: () => void;
}) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

      if (event.key === "Delete" && selectedCount > 0) {
        onDelete();
      }

      if (event.key.toLowerCase() === "c" && (event.ctrlKey || event.metaKey) && selectedCount > 1) {
        event.preventDefault();
        onCopy();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCopy, onDelete, selectedCount]);
}
