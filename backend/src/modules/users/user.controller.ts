import { Response } from "express";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest, CaseType } from "../../types/global.types";
import { requiredParam } from "../../utils/express.utils";
import { sendSuccess } from "../../utils/response";
import { userService } from "./user.service";

class UserController {
  async listUsers(_request: AuthenticatedRequest, response: Response): Promise<void> {
    const users = await userService.listUsers();
    sendSuccess(response, users, "Users loaded", { count: users.length });
  }

  async getUserById(request: AuthenticatedRequest, response: Response): Promise<void> {
    const requester = request.user;

    if (!requester) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    if (
      requiredParam(request.params, "id") !== requester.id &&
      !["admin", "ngo", "govt", "hospital"].includes(requester.role)
    ) {
      throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const user = await userService.getUserById(requiredParam(request.params, "id"));
    sendSuccess(response, user, "User loaded");
  }

  async getMyVolunteerProfile(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const profile = await userService.getVolunteerProfile(userId);
    const activity = await userService.listVolunteerActivity(userId, 15);
    sendSuccess(response, { profile, activity }, "Volunteer profile loaded");
  }

  async updateMyVolunteerProfile(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const profile = await userService.updateVolunteerProfile(userId, request.body);
    sendSuccess(response, profile, "Volunteer profile updated");
  }

  async getNearbyResponders(request: AuthenticatedRequest, response: Response): Promise<void> {
    const latitude = Number(request.query.latitude);
    const longitude = Number(request.query.longitude);
    const caseType =
      typeof request.query.caseType === "string"
        ? (request.query.caseType as CaseType)
        : "rescue";
    const limit = typeof request.query.limit === "string" ? Number(request.query.limit) : 5;

    const responders = await userService.getResponderCandidates(
      { latitude, longitude },
      caseType,
      limit
    );

    sendSuccess(response, responders, "Nearby responders loaded", { count: responders.length });
  }

  async listVolunteerActivity(request: AuthenticatedRequest, response: Response): Promise<void> {
    const requester = request.user;

    if (!requester) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    if (
      requiredParam(request.params, "id") !== requester.id &&
      !["admin", "ngo", "govt", "hospital"].includes(requester.role)
    ) {
      throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const activity = await userService.listVolunteerActivity(requiredParam(request.params, "id"));
    sendSuccess(response, activity, "Volunteer activity loaded", { count: activity.length });
  }
}

export const userController = new UserController();
