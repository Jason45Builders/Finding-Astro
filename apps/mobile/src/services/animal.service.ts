import {
  Animal,
  AnimalFormValues,
  AnimalSearchFilters,
  DuplicateCandidate,
  Sighting
} from "../types/animal.types";
import { apiRequest } from "./api";

interface AnimalCreateResponse {
  animal: Animal;
  duplicates: DuplicateCandidate[];
}

class AnimalService {
  async listAnimals(filters: AnimalSearchFilters = {}): Promise<Animal[]> {
    const searchParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    });

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest<Animal[]>(`/animals${suffix}`);
  }

  async getAnimalById(animalId: string): Promise<Animal> {
    return apiRequest<Animal>(`/animals/${animalId}`);
  }

  async createAnimal(token: string, payload: AnimalFormValues): Promise<AnimalCreateResponse> {
    return apiRequest<AnimalCreateResponse>("/animals", {
      method: "POST",
      token,
      body: payload
    });
  }

  async updateAnimal(
    token: string,
    animalId: string,
    payload: Partial<AnimalFormValues>
  ): Promise<AnimalCreateResponse> {
    return apiRequest<AnimalCreateResponse>(`/animals/${animalId}`, {
      method: "PATCH",
      token,
      body: payload
    });
  }

  async reportSighting(
    token: string,
    payload: {
      animalId?: string | null;
      matchedAnimalId?: string | null;
      description: string;
      locationText?: string | null;
      location: {
        latitude: number;
        longitude: number;
      };
      photoUrl?: string | null;
      confidenceScore?: number | null;
    }
  ): Promise<Sighting> {
    return apiRequest<Sighting>("/animals/sightings", {
      method: "POST",
      token,
      body: payload
    });
  }

  async listSightings(animalId?: string): Promise<Sighting[]> {
    const suffix = animalId ? `?animalId=${animalId}` : "";
    return apiRequest<Sighting[]>(`/animals/sightings${suffix}`);
  }
}

export const animalService = new AnimalService();
