const BUCKET = "finding-astro-media";

export function normalizePhotoUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  if (rawUrl.startsWith("data:")) return rawUrl;
  if (rawUrl.startsWith("http")) return rawUrl;

  if (rawUrl.startsWith("/")) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/${BUCKET}${rawUrl}`;
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
