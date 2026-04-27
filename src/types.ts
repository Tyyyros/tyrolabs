export type ItemType = "text" | "image" | "link";

export type TabId = "text" | "images" | "links" | "favs" | "colls";

export interface TextClip {
  id: number;
  text: string;
  date: string;
  time: string;
  type: string;
  fav: boolean;
  pinned: boolean;
}

export interface ImageClip {
  id: number;
  text: string;
  date: string;
  time: string;
  type: string;
  fav: boolean;
  pinned: boolean;
  hash: string;
  dims: string;
  hue: number;
}

export type AnyClip = TextClip | ImageClip;

export interface Theme {
  id: string;
  name: string;
  desc: string;
  accent: string;
  accentRGB: string;
  fontUI: string;
  fontMono: string;
  iconStroke: number;
  logoPrefix: string;
  logoSuffix: string;
  logoLetterSpacing: string;
  bg: string;
  sidebar: string;
}

export type ThemeId = "command" | "neon" | "obsidian" | "arctic" | "carbon";
