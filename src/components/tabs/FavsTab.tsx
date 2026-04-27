import { useMemo } from "react";
import type { TextClip, ItemType } from "../../types";
import { useTheme } from "../../lib/theme";
import { C } from "../../lib/colors";
import { Ic } from "../icons";
import { TextRow } from "./TextTab";

interface CtxArgs {
  e: React.MouseEvent;
  item: TextClip;
  itemType: ItemType;
}

interface Props {
  clips: TextClip[];
  onCtx: (a: CtxArgs) => void;
  onDoubleClick: (id: number, type: ItemType) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function FavsTab({ clips, onCtx, onDoubleClick, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const favs = useMemo(() => {
    const f = clips.filter((c) => c.fav);
    return [...f.filter((c) => c.pinned), ...f.filter((c) => !c.pinned)];
  }, [clips]);

  if (!favs.length) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          color: C.t3,
        }}
      >
        <Ic.Star width={32} height={32} style={{ opacity: 0.25 }} strokeWidth={theme.iconStroke} />
        <span style={{ fontSize: 14 }}>Aucun favori</span>
        <span style={{ fontSize: 11, fontFamily: theme.fontMono }}>
          Clic droit → Ajouter aux favoris
        </span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {favs.map((c) => (
        <TextRow
          key={c.id}
          clip={c}
          onCtx={onCtx}
          onDoubleClick={onDoubleClick}
          theme={theme}
          selected={selectedId === c.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
