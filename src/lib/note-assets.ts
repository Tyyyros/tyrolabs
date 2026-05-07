import { convertFileSrc, invoke } from "@tauri-apps/api/core";

const noteAssetCache = new Map<string, Promise<string>>();

function key(hash: string, ext: string) {
  return `${hash}.${ext}`;
}

/** Returns a `convertFileSrc()` URL pointing at the on-disk note asset. */
export function resolveNoteAsset(hash: string, ext: string): Promise<string> {
  const k = key(hash, ext);
  const cached = noteAssetCache.get(k);
  if (cached) return cached;

  const request = invoke<string>("get_note_asset_path", { hash, ext })
    .then((filePath) => convertFileSrc(filePath))
    .catch((error) => {
      noteAssetCache.delete(k);
      throw error;
    });
  noteAssetCache.set(k, request);
  return request;
}

/** Persists raw bytes to the local notes_assets folder, returns the hash & ext. */
export async function saveNoteAsset(
  bytes: Uint8Array,
  ext: string,
): Promise<{ hash: string; ext: string; url: string }> {
  const result = await invoke<{ hash: string; ext: string }>("save_note_asset_cmd", {
    bytes: Array.from(bytes),
    ext,
  });
  const url = await resolveNoteAsset(result.hash, result.ext);
  return { ...result, url };
}

/** Builds the `note-asset://<hash>.<ext>` reference inserted in note bodies.
 *  Backend GC reads this scheme via `extract_asset_refs` to know what files to clean. */
export function noteAssetRef(hash: string, ext: string): string {
  return `note-asset://${hash}.${ext}`;
}

/** Parses a `note-asset://...` ref or full URL back to (hash, ext). */
export function parseNoteAssetRef(ref: string): { hash: string; ext: string } | null {
  const m = ref.match(/note-asset:\/\/([A-Za-z0-9_-]+)\.([A-Za-z0-9]+)/);
  if (!m) return null;
  return { hash: m[1], ext: m[2] };
}
