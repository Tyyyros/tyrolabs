export type ItemType = "text" | "image" | "link";

export type TabId = "text" | "images" | "links" | "favs" | "colls";

export interface TextClip {
  id: number;
  text: string;
  date: string;
  time: string;
  type: "text" | "code";
  fav: boolean;
  pinned: boolean;
}

export interface ImageClip {
  id: number;
  hash: string;
  dims: string;
  time: string;
  hue: number;
  pinned: boolean;
}

export interface LinkClip {
  id: number;
  url: string;
  title: string;
  date: string;
  time: string;
  sig: string;
  col: string;
  pinned: boolean;
}

export type AnyClip = TextClip | ImageClip | LinkClip;

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
