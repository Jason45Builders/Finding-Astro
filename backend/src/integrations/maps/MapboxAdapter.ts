/**
 * MapboxAdapter.ts
 *
 * Production adapter for Mapbox. Requires MAPBOX_ACCESS_TOKEN.
 * This is a stub — implement the real HTTP calls when the token is available.
 */

import { AppError } from "../../middleware/error.middleware";
import { env } from "../../config/env";
import {
  BaseMapsAdapter,
  GeoLocation,
  GeocodeResult,
  ReverseGeocodeResult,
  DirectionsResult,
  NearbyPlacesResult,
} from "./MapsAdapter";

export class MapboxAdapter extends BaseMapsAdapter {
  readonly provider = "mapbox";

  private get accessToken(): string {
    const token = env.MAPBOX_ACCESS_TOKEN;
    if (!token) throw new AppError("Mapbox access token not configured", 503, "MAPBOX_NOT_CONFIGURED");
    return token;
  }

  private get baseUrl(): string {
    return "https://api.mapbox.com";
  }

  async geocode(address: string): Promise<GeocodeResult[]> {
    console.log(`[Mapbox] Geocoding "${address}" (stub)`);

    // TODO: GET {baseUrl}/geocoding/v5/mapbox.places/{encodeURIComponent(address)}.json?access_token={accessToken}
    return [
      {
        formattedAddress: `${address} (Mapbox — stub)`,
        location: { latitude: 0, longitude: 0 },
        placeId: `mapbox_stub_${Date.now()}`,
        provider: this.provider,
      },
    ];
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    this.validateCoordinates(lat, lng);
    console.log(`[Mapbox] Reverse geocoding ${lat}, ${lng} (stub)`);

    // TODO: GET {baseUrl}/geocoding/v5/mapbox.places/{lng},{lat}.json?access_token={accessToken}
    return {
      formattedAddress: "Mapbox Stub Address",
      placeId: `mapbox_stub_${Date.now()}`,
      components: {},
      provider: this.provider,
    };
  }

  async getDirections(from: GeoLocation, to: GeoLocation): Promise<DirectionsResult> {
    this.validateCoordinates(from.latitude, from.longitude);
    this.validateCoordinates(to.latitude, to.longitude);
    console.log(`[Mapbox] Directions from ${from.latitude},${from.longitude} to ${to.latitude},${to.longitude} (stub)`);

    // TODO: GET {baseUrl}/directions/v5/mapbox/driving/{from.lng},{from.lat};{to.lng},{to.lat}?access_token={accessToken}
    return {
      distanceMeters: 0,
      durationSeconds: 0,
      polyline: null,
      steps: [],
      provider: this.provider,
    };
  }

  async getNearbyPlaces(location: GeoLocation, type: string, radius: number): Promise<NearbyPlacesResult> {
    this.validateCoordinates(location.latitude, location.longitude);
    console.log(`[Mapbox] Nearby places for "${type}" within ${radius}m (stub)`);

    // NOTE: Mapbox doesn't have a direct "nearby places" API like Google Places.
    // Use the Mapbox Search API with proximity bias, or integrate with a POI database.
    return { places: [], provider: this.provider };
  }
}
