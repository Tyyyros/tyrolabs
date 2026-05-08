export type ItemType = "text" | "image" | "link";
export type TextClipType = "text" | "code" | "link";

export type TabId = "text" | "images" | "links" | "notes" | "password";

export type NoteFormat = "richtext" | "markdown";

export interface Note {
  id: string;
  title: string;
  format: NoteFormat;
  body: string;
  tags: string[];
  date: string;
  time: string;
  updated_at: number;
  cover_hash?: string;
  cover_ext?: string;
  collection_id?: string | null;
  pinned: boolean;
  sort_order: number;
}

export interface NotePatch {
  title?: string;
  body?: string;
  format?: NoteFormat;
  tags?: string[];
  cover_hash?: string;
  cover_ext?: string;
  collection_id?: string;
  pinned?: boolean;
}

export interface SavedNoteAsset {
  hash: string;
  ext: string;
}

/** Silo de collections : trois entités totalement cloisonnées (text / image / link).
 *  Chaque silo possède son propre stockage, ses propres IDs, et ses propres
 *  opérations CRUD. Une action sur un silo n'a aucun effet sur les autres. */
export type CollectionSilo = "text" | "image" | "link";

export interface ClipboardSettings {
  capture_enabled: boolean;
  max_history: number;
}

interface BaseClip {
  id: number;
  text: string;
  date: string;
  time: string;
  fav?: boolean;
  pinned: boolean;
  collection_id?: string | null;
  sort_order?: number;
}

export interface Collection {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface TextClip {
  id: BaseClip["id"];
  text: BaseClip["text"];
  date: BaseClip["date"];
  time: BaseClip["time"];
  type: TextClipType;
  fav?: BaseClip["fav"];
  pinned: BaseClip["pinned"];
  collection_id?: string | null;
  sort_order?: number;
}

export interface ImageClip {
  id: BaseClip["id"];
  text: BaseClip["text"];
  date: BaseClip["date"];
  time: BaseClip["time"];
  type: "image";
  fav?: BaseClip["fav"];
  pinned: BaseClip["pinned"];
  hash: string;
  dims: string;
  hue: number;
  collection_id?: string | null;
  sort_order?: number;
}

export type AnyClip = TextClip | ImageClip;

export function isImageClip(clip: AnyClip): clip is ImageClip {
  return clip.type === "image";
}

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
  light?: boolean;
  /** Override tokens for light mode */
  t1?: string;
  t2?: string;
  t3?: string;
  border?: string;
  borderDim?: string;
  rowHov?: string;
}

export type ThemeId = "command" | "neon" | "obsidian" | "arctic" | "carbon"
  | "daylight" | "cream" | "sakura" | "mint" | "cloud";

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
}


