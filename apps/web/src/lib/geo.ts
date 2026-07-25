/**
 * Supabase/PostgREST returns PostGIS geography/geometry columns as EWKB hex
 * strings (e.g. "0101000020E6100000..."), not {latitude, longitude} objects.
 * Every route that selects a `location` column needs to decode it before
 * sending it to the frontend, which expects {latitude, longitude} | null.
 */
export function parseWKBPoint(value: unknown): { latitude: number; longitude: number } | null {
  if (!value) return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    if (typeof v.latitude === "number" && typeof v.longitude === "number") {
      return { latitude: v.latitude, longitude: v.longitude };
    }
    return null;
  }

  if (typeof value !== "string") return null;
  const hex = value.trim();
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length < 42) return null;

  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    const view = new DataView(bytes.buffer);
    const littleEndian = bytes[0] === 1;
    const typeAndFlags = view.getUint32(1, littleEndian);
    const hasSRID = (typeAndFlags & 0x20000000) !== 0;
    const offset = hasSRID ? 9 : 5;
    if (bytes.length < offset + 16) return null;

    const longitude = view.getFloat64(offset, littleEndian);
    const latitude = view.getFloat64(offset + 8, littleEndian);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

function snapToGrid(lat: number, lng: number, gridMeters: number): { lat: number; lng: number } {
  const earthRadius = 6371000;
  const latGrid = (gridMeters / earthRadius) * (180 / Math.PI);
  const lngGrid = (gridMeters / (earthRadius * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);
  return {
    lat: Math.round(lat / latGrid) * latGrid,
    lng: Math.round(lng / lngGrid) * lngGrid,
  };
}

/** Decodes a raw location value, then applies identity-tier-gated fuzzing (<Tier 2 => ~250m grid snap). */
export function fuzzyLocation(rawValue: unknown, tier: number | undefined): { latitude: number; longitude: number } | null {
  const loc = parseWKBPoint(rawValue);
  if (!loc) return null;
  if (tier === undefined || tier < 2) {
    const snapped = snapToGrid(loc.latitude, loc.longitude, 250);
    return { latitude: Math.round(snapped.lat * 10000) / 10000, longitude: Math.round(snapped.lng * 10000) / 10000 };
  }
  return loc;
}

/** Decodes a raw location value with no tier-based fuzzing (for records where precision isn't privacy-sensitive, e.g. cases, partners). */
export function decodeLocation(rawValue: unknown): { latitude: number; longitude: number } | null {
  return parseWKBPoint(rawValue);
}
