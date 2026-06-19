/**
 * MapsAdapter.ts
 *
 * Interface for maps / geolocation provider integrations.
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  formattedAddress: string;
  location: GeoLocation;
  placeId: string | null;
  provider: string;
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  placeId: string | null;
  components: {
    streetNumber?: string;
    route?: string;
    locality?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  provider: string;
}

export interface DirectionsStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  startLocation: GeoLocation;
  endLocation: GeoLocation;
}

export interface DirectionsResult {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string | null;
  steps: DirectionsStep[];
  provider: string;
}

export interface NearbyPlace {
  name: string;
  placeId: string | null;
  location: GeoLocation;
  address: string;
  rating: number | null;
  types: string[];
}

export interface NearbyPlacesResult {
  places: NearbyPlace[];
  provider: string;
}

export interface MapsAdapter {
  /** Convert a human-readable address into lat/lng coordinates. */
  geocode(address: string): Promise<GeocodeResult[]>;

  /** Convert lat/lng into a human-readable address. */
  reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult>;

  /** Get driving directions between two points. */
  getDirections(from: GeoLocation, to: GeoLocation): Promise<DirectionsResult>;

  /** Find nearby places of a given type (e.g., "veterinary", "pharmacy"). */
  getNearbyPlaces(location: GeoLocation, type: string, radius: number): Promise<NearbyPlacesResult>;
}

export abstract class BaseMapsAdapter implements MapsAdapter {
  abstract readonly provider: string;

  abstract geocode(address: string): Promise<GeocodeResult[]>;
  abstract reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult>;
  abstract getDirections(from: GeoLocation, to: GeoLocation): Promise<DirectionsResult>;
  abstract getNearbyPlaces(location: GeoLocation, type: string, radius: number): Promise<NearbyPlacesResult>;

  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  protected validateCoordinates(lat: number, lng: number): void {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error(`Invalid latitude: ${lat}`);
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new Error(`Invalid longitude: ${lng}`);
    }
  }
}
