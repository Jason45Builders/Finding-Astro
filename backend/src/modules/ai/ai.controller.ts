import { Response } from "express";
import { AuthenticatedRequest } from "../../types/global.types";
import { sendSuccess } from "../../utils/response";
import { aiService } from "./ai.service";

class AiController {
  async getMatchSuggestions(request: AuthenticatedRequest, response: Response): Promise<void> {
    const matches = await aiService.getMatchSuggestions(request.body);
    sendSuccess(response, matches, "Match suggestions generated", { count: matches.length });
  }

  async getDuplicatePreview(request: AuthenticatedRequest, response: Response): Promise<void> {
    const duplicates = await aiService.getDuplicatePreview(request.body);
    sendSuccess(response, duplicates, "Duplicate preview generated", { count: duplicates.length });
  }
}

export const aiController = new AiController();
