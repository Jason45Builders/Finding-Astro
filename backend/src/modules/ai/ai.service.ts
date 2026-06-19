import { query } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { DuplicateCandidate, MatchSuggestion } from "../../types/global.types";
import { clamp, haversineDistanceKm } from "../../utils/geo.utils";
import { animalRepository, AnimalMutationInput } from "../animals/animal.repository";

interface AiMatchInput {
  animalId?: string;
  species?: string;
  color?: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  radiusKm?: number;
}

interface SightingCandidateRow {
  id: string;
  description: string;
  photo_url: string | null;
  location_text: string | null;
  latitude: number;
  longitude: number;
  confidence_score: number | null;
}

const sharedTokenScore = (left: string | null | undefined, right: string | null | undefined): number => {
  if (!left || !right) {
    return 0;
  }

  const leftTokens = left.toLowerCase().split(/\s+/);
  const rightTokens = right.toLowerCase().split(/\s+/);
  return leftTokens.some((token) => rightTokens.includes(token)) ? 12 : 0;
};

class AiService {
  async getMatchSuggestions(input: AiMatchInput): Promise<MatchSuggestion[]> {
    let species = input.species;
    let color = input.color ?? null;
    let location = input.location;

    if (input.animalId) {
      const animal = await animalRepository.findById(input.animalId);

      if (!animal) {
        throw new AppError("Animal not found", 404, "ANIMAL_NOT_FOUND");
      }

      species = animal.species;
      color = animal.color;
      location = animal.location;
    }

    if (!species) {
      throw new AppError("Species is required to generate matches", 400, "INVALID_MATCH_INPUT");
    }

    const sightings = await query<SightingCandidateRow>(
      `
        SELECT
          s.id,
          s.description,
          s.photo_url,
          s.location_text,
          ST_Y(s.location::geometry) AS latitude,
          ST_X(s.location::geometry) AS longitude,
          s.confidence_score
        FROM sightings s
        WHERE ST_DWithin(
          s.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        ORDER BY s.created_at DESC
        LIMIT 10
      `,
      [location.longitude, location.latitude, (input.radiusKm ?? 8) * 1000]
    );

    return sightings.rows
      .map((row) => {
        const distanceKm = haversineDistanceKm(location, {
          latitude: Number(row.latitude),
          longitude: Number(row.longitude)
        });
        const confidence = clamp(
          Math.round(
            45 +
              Math.max(0, 25 - distanceKm * 5) +
              sharedTokenScore(color, row.description) +
              (row.confidence_score ? Number(row.confidence_score) * 0.15 : 0)
          ),
          1,
          99
        );

        return {
          type: "sighting" as const,
          referenceId: row.id,
          title: `${species} sighting candidate`,
          summary: row.location_text ?? row.description,
          confidence,
          distanceKm: Number(distanceKm.toFixed(2)),
          coordinates: {
            latitude: Number(row.latitude),
            longitude: Number(row.longitude)
          },
          photoUrl: row.photo_url,
          signal: "sighting_match"
        };
      })
      .sort((left, right) => right.confidence - left.confidence);
  }

  async getDuplicatePreview(input: AnimalMutationInput): Promise<DuplicateCandidate[]> {
    const candidates = await animalRepository.findPotentialDuplicates(input);

    return candidates.map((animal) => {
      const distanceScore = animal.distanceKm !== undefined ? Math.max(0, 45 - animal.distanceKm * 20) : 20;
      const speciesScore = animal.species.toLowerCase() === input.species.toLowerCase() ? 25 : 0;
      const colorScore = sharedTokenScore(input.color, animal.color);
      const breedScore = sharedTokenScore(input.breed, animal.breed);
      const confidence = clamp(Math.round(distanceScore + speciesScore + colorScore + breedScore), 1, 99);

      return {
        animal,
        confidence,
        reason:
          confidence >= 70
            ? "Likely same animal because the profile and map position strongly overlap."
            : "Possible duplicate because the animal is nearby and shares some profile traits."
      };
    });
  }
}

export const aiService = new AiService();
