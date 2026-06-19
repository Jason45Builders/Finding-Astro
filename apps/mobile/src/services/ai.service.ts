import { AnimalFormValues, DuplicateCandidate, MatchSuggestion } from "../types/animal.types";
import { apiRequest } from "./api";

class AiService {
  async getMatchSuggestions(
    token: string,
    payload: {
      animalId?: string;
      species?: string;
      color?: string | null;
      location: {
        latitude: number;
        longitude: number;
      };
      radiusKm?: number;
    }
  ): Promise<MatchSuggestion[]> {
    return apiRequest<MatchSuggestion[]>("/ai/matches", {
      method: "POST",
      token,
      body: payload
    });
  }

  async getDuplicatePreview(token: string, payload: AnimalFormValues): Promise<DuplicateCandidate[]> {
    return apiRequest<DuplicateCandidate[]>("/ai/duplicates", {
      method: "POST",
      token,
      body: payload
    });
  }
}

export const aiService = new AiService();
