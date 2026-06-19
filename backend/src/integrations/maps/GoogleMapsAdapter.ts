/**
 * GoogleMapsAdapter.ts
 *
 * Production adapter for Google Maps Platform. Requires GOOGLE_MAPS_API_KEY.
 * This is a stub — implement the real HTTP calls when the API key is available.
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

export class GoogleMapsAdapter extends BaseMapsAdapter {
  readonly provider = "google";

  private get apiKey(): string {
    const key = env.GOOGLE_MAPS_API_KEY;
    if (!key) throw new AppError("Google Maps API key not configured", 503, "GOOGLE_MAPS_NOT_CONFIGURED");
    return key;
  }

  private get baseUrl(): string {
    return "https://maps.googleapis.com/maps/api";
  }

  async geocode(address: string): Promise<GeocodeResult[]> {
    console.log(`[GoogleMaps] Geocoding "${address}" (stub)`);

    // TODO: GET {baseUrl}/geocode/json?address={encodeURIComponent(address)}&key={apiKey}
    return [
      {
        formattedAddress: `${address} (Google — stub)`,
        location: { latitude: 0, longitude: 0 },
        placeId: `google_stub_${Date.now()}`,
        provider: this.provider,
      },
    ];
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    this.validateCoordinates(lat, lng);
    console.log(`[GoogleMaps] Reverse geocoding ${lat}, ${lng} (stub)`);

    // TODO: GET {baseUrl}/geocode/json?latlng={lat},{lng}&key={apiKey}
    return {
      formattedAddress: "Google Maps Stub Address",
      placeId: `google_stub_${Date.now()}`,
      components: {},
      provider: this.provider,
    };
  }

  async getDirections(from: GeoLocation, to: GeoLocation): Promise<DirectionsResult> {
    this.validateCoordinates(from.latitude, from.longitude);
    this.validateCoordinates(to.latitude, to.longitude);
    console.log(`[GoogleMaps] Directions from ${from.latitude},${from.longitude} to ${to.latitude},${to.longitude} (stub)`);

    // TODO: GET {baseUrl}/directions/json?origin={from.lat},{from.lng}&destination={to.lat},{to.lng}&key={apiKey}
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
    console.log(`[GoogleMaps] Nearby places for "${type}" (stub)`);

    // TODO: Use Places API (New) or Nearby Search
    // GET https://places.googleapis.com/v1/places:searchNearby
    return { places: [], provider: this.provider };
  }
}
