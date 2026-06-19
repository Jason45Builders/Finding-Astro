export type AnimalStatus = "community" | "lost" | "found" | "reunited" | "adopted";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Animal {
  id: string;
  name: string | null;
  species: string;
  breed: string | null;
  gender: string | null;
  color: string | null;
  approxAgeMonths: number | null;
  size: string | null;
  temperament: string | null;
  distinguishingMarks: string | null;
  description: string | null;
  status: AnimalStatus;
  primaryPhotoUrl: string | null;
  photoUrls: string[];
  isSterilized: boolean;
  lastSeenText: string | null;
  location: Coordinates;
  caretakerUserId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  distanceKm?: number;
}

export interface AnimalSearchFilters {
  species?: string;
  status?: AnimalStatus;
  queryText?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  limit?: number;
}

export interface AnimalFormValues {
  name?: string | null;
  species: string;
  breed?: string | null;
  gender?: string | null;
  color?: string | null;
  approxAgeMonths?: number | null;
  size?: string | null;
  temperament?: string | null;
  distinguishingMarks?: string | null;
  description?: string | null;
  status?: AnimalStatus;
  primaryPhotoUrl?: string | null;
  photoUrls?: string[];
  isSterilized?: boolean;
  lastSeenText?: string | null;
  location: Coordinates;
  caretakerUserId?: string | null;
}

export interface DuplicateCandidate {
  animal: Animal;
  confidence: number;
  reason: string;
}

export interface Sighting {
  id: string;
  animalId: string | null;
  reporterUserId: string;
  matchedAnimalId: string | null;
  description: string;
  locationText: string | null;
  location: Coordinates;
  photoUrl: string | null;
  confidenceScore: number | null;
  createdAt: string;
}

export interface MatchSuggestion {
  type: "animal" | "sighting";
  referenceId: string;
  title: string;
  summary: string;
  confidence: number;
  distanceKm: number;
  coordinates: Coordinates;
  photoUrl: string | null;
}
