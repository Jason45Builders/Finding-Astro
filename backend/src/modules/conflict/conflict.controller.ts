import { Response } from "express";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest } from "../../types/global.types";
import { sendCreated, sendSuccess } from "../../utils/response";
import { conflictService } from "./conflict.service";

class ConflictController {
  async logConcern(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const result = await conflictService.logConcern({
      ...request.body,
      reporterUserId: userId
    });

    sendCreated(response, result, "Conflict concern created");
  }

  async listConflicts(_request: AuthenticatedRequest, response: Response): Promise<void> {
    const conflicts = await conflictService.listConflicts();
    sendSuccess(response, conflicts, "Conflict cases loaded", { count: conflicts.length });
  }
}

export const conflictController = new ConflictController();
