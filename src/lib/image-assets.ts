import { convertFileSrc, invoke } from "@tauri-apps/api/core";

const imageAssetCache = new Map<string, Promise<string>>();

export function resolveImageAsset(hash: string): Promise<string> {
  const cached = imageAssetCache.get(hash);
  if (cached) return cached;

  const request = invoke<string>("get_image_path", { hash })
    .then((filePath) => convertFileSrc(filePath))
    .catch((error) => {
      imageAssetCache.delete(hash);
      throw error;
    });
  imageAssetCache.set(hash, request);
  return request;
}
