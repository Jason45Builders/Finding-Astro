const BUCKET = "finding-astro-media";
const PROXY_PATH = "/api/v1/media/proxy";

export function normalizePhotoUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  if (rawUrl.startsWith("data:")) return rawUrl;
  if (rawUrl.startsWith("/")) return rawUrl;

  if (rawUrl.includes(`/object/public/${BUCKET}/`)) {
    const marker = `/object/public/${BUCKET}/`;
    const idx = rawUrl.indexOf(marker);
    const key = rawUrl.slice(idx + marker.length);
    const encodedKey = encodeURIComponent(key);
    return `${PROXY_PATH}?key=${encodedKey}`;
  }

  return rawUrl;
}

export function getStorageKeyFromPublicUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx !== -1) return publicUrl.slice(idx + marker.length);
  return publicUrl;
}
