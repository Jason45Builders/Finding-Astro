export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

function finiteCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Normalizes coordinates from API objects that may expose either
 * { location: { latitude, longitude } }, { location: { lat, lng } },
 * or latitude/longitude directly on the object.
 */
export function getMapCoordinates(value: unknown): MapCoordinates | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const nested =
    record.location && typeof record.location === "object"
      ? (record.location as Record<string, unknown>)
      : record;

  const latitude = finiteCoordinate(nested.latitude ?? nested.lat);
  const longitude = finiteCoordinate(nested.longitude ?? nested.lng);

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

export const DEFAULT_MAP_CENTER: [number, number] = [13.0827, 80.2707];
