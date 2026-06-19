/**
 * MockMapsAdapter.ts
 *
 * Development-only maps adapter. Returns Chennai default data for all queries
 * so that frontend developers can test location features without API keys.
 */

import {
  BaseMapsAdapter,
  GeoLocation,
  GeocodeResult,
  ReverseGeocodeResult,
  DirectionsResult,
  NearbyPlacesResult,
  NearbyPlace,
} from "./MapsAdapter";

const CHENNAI_DEFAULT: GeoLocation = { latitude: 13.0827, longitude: 80.2707 };

const CHENNAI_PLACES: NearbyPlace[] = [
  {
    name: "Blue Cross of India",
    placeId: "mock_bc_chennai",
    location: { latitude: 13.0227, longitude: 80.2544 },
    address: "72 Velachery Road, Guindy, Chennai, Tamil Nadu 600032",
    rating: 4.7,
    types: ["veterinary", "animal_shelter", "ngo"],
  },
  {
    name: "Madras Veterinary College",
    placeId: "mock_mvc_chennai",
    location: { latitude: 13.0827, longitude: 80.2707 },
    address: "Vepery High Road, Chennai, Tamil Nadu 600007",
    rating: 4.5,
    types: ["veterinary", "university"],
  },
  {
    name: "The Pet Vet Clinic",
    placeId: "mock_pvc_chennai",
    location: { latitude: 13.0569, longitude: 80.2425 },
    address: "12th Main Road, Anna Nagar, Chennai, Tamil Nadu 600040",
    rating: 4.3,
    types: ["veterinary", "pet_store"],
  },
  {
    name: "Animal Welfare Board of India",
    placeId: "mock_awbi_chennai",
    location: { latitude: 13.0674, longitude: 80.2376 },
    address: "3rd Seaward Road, Valmiki Nagar, Chennai, Tamil Nadu 600041",
    rating: 4.2,
    types: ["government_office", "animal_shelter"],
  },
];

export class MockMapsAdapter extends BaseMapsAdapter {
  readonly provider = "mock";

  async geocode(address: string): Promise<GeocodeResult[]> {
    console.log(`[MockMaps] Geocoding "${address}"`);

    return [
      {
        formattedAddress: `${address}, Chennai, Tamil Nadu, India (Mock)`,
        location: { ...CHENNAI_DEFAULT },
        placeId: `mock_geocode_${Date.now()}`,
        provider: this.provider,
      },
    ];
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    this.validateCoordinates(lat, lng);
    console.log(`[MockMaps] Reverse geocoding ${lat}, ${lng}`);

    return {
      formattedAddress: "Mock Address, Chennai, Tamil Nadu 600001, India",
      placeId: `mock_revgeo_${Date.now()}`,
      components: {
        route: "Mock Road",
        locality: "Anna Nagar",
        city: "Chennai",
        state: "Tamil Nadu",
        country: "India",
        postalCode: "600001",
      },
      provider: this.provider,
    };
  }

  async getDirections(from: GeoLocation, to: GeoLocation): Promise<DirectionsResult> {
    this.validateCoordinates(from.latitude, from.longitude);
    this.validateCoordinates(to.latitude, to.longitude);
    console.log(`[MockMaps] Directions from ${from.latitude},${from.longitude} to ${to.latitude},${to.longitude}`);

    const distanceMeters = Math.round(
      Math.sqrt(
        Math.pow((to.latitude - from.latitude) * 111_000, 2) +
          Math.pow((to.longitude - from.longitude) * 111_000 * Math.cos((from.latitude * Math.PI) / 180), 2)
      )
    );

    const durationSeconds = Math.round((distanceMeters / 8) * 3.6); // assume ~8 m/s (28 km/h) avg speed

    return {
      distanceMeters,
      durationSeconds,
      polyline: "mock_polyline_data",
      steps: [
        {
          instruction: "Head south on Mock Road toward Chennai city centre",
          distanceMeters: Math.round(distanceMeters * 0.5),
          durationSeconds: Math.round(durationSeconds * 0.5),
          startLocation: { ...from },
          endLocation: { latitude: (from.latitude + to.latitude) / 2, longitude: (from.longitude + to.longitude) / 2 },
        },
        {
          instruction: "Turn left onto Main Road and continue to destination",
          distanceMeters: Math.round(distanceMeters * 0.5),
          durationSeconds: Math.round(durationSeconds * 0.5),
          startLocation: { latitude: (from.latitude + to.latitude) / 2, longitude: (from.longitude + to.longitude) / 2 },
          endLocation: { ...to },
        },
      ],
      provider: this.provider,
    };
  }

  async getNearbyPlaces(location: GeoLocation, type: string, radius: number): Promise<NearbyPlacesResult> {
    this.validateCoordinates(location.latitude, location.longitude);
    const clampedRadius = this.clamp(radius, 100, 50_000);
    console.log(`[MockMaps] Nearby places for "${type}" within ${clampedRadius}m of ${location.latitude},${location.longitude}`);

    // Filter mock places by distance (haversine approximation) and type match
    const filtered = CHENNAI_PLACES.filter((place) => {
      const dLat = ((place.location.latitude - location.latitude) * Math.PI) / 180;
      const dLng = ((place.location.longitude - location.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((location.latitude * Math.PI) / 180) *
          Math.cos((place.location.latitude * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceMeters = 6_371_000 * c;

      const typeMatch =
        place.types.includes(type) ||
        type === "veterinary" ||
        type === "animal_shelter" ||
        type === "ngo";

      return distanceMeters <= clampedRadius && typeMatch;
    });

    return { places: filtered.length > 0 ? filtered : CHENNAI_PLACES.slice(0, 2), provider: this.provider };
  }
}
