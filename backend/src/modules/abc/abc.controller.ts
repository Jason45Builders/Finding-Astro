import { Response } from "express";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest } from "../../types/global.types";
import { sendCreated, sendSuccess } from "../../utils/response";
import { abcService } from "./abc.service";

class AbcController {
  async createRequest(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const tracking = await abcService.createRequest({
      ...request.body,
      requestedByUserId: userId
    });

    sendCreated(response, tracking, "ABC request created");
  }

  async logEvent(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const tracking = await abcService.logEvent({
      ...request.body,
      requestedByUserId: userId,
      requestedByUserRole: request.user!.role
    });

    sendCreated(response, tracking, "ABC event logged");
  }

  async listTracking(request: AuthenticatedRequest, response: Response): Promise<void> {
    const tracking = await abcService.listTracking(
      typeof request.query.animalId === "string" ? request.query.animalId : undefined
    );

    sendSuccess(response, tracking, "ABC tracking loaded", { count: tracking.length });
  }
}

export const abcController = new AbcController();
