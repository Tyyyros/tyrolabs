import type { CSSProperties } from "react";
import type { Theme } from "../../../types";

export const BOX_WIDTH = 184;
export const BOX_HEIGHT = 32;

export interface SceneProps {
  theme: Theme;
  hover: boolean;
}

export const sceneBox: CSSProperties = {
  position: "relative",
  width: BOX_WIDTH,
  height: BOX_HEIGHT,
  display: "flex",
  alignItems: "center",
  paddingLeft: 4,
  paddingRight: 4,
  gap: 8,
  overflow: "hidden",
  borderRadius: 4,
};

export const starWrap: CSSProperties = {
  display: "inline-flex",
  width: 24,
  height: 24,
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  zIndex: 2,
  flexShrink: 0,
};

export const textWrap: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  position: "relative",
  zIndex: 2,
  flexShrink: 0,
};

export const textBase: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  whiteSpace: "nowrap",
  position: "relative",
  display: "inline-block",
};

export const absLayer: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
};

export const ornamentBoxStyle = (hover: boolean): CSSProperties => ({
  display: "inline-flex",
  width: 14,
  height: 14,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  opacity: hover ? 0 : 1,
  transition: "opacity 220ms ease-out",
});
