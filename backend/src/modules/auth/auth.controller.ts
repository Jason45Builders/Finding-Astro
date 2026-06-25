import { Response } from "express";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest } from "../../types/global.types";
import { sendSuccess } from "../../utils/response";
import { authService } from "./auth.service";

class AuthController {
  async signup(request: AuthenticatedRequest, response: Response): Promise<void> {
    const payload = await authService.signup(
      request.body.email,
      request.body.password,
      request.body.fullName
    );

    sendSuccess(response, payload, "Account created", undefined, 201);
  }

  async login(request: AuthenticatedRequest, response: Response): Promise<void> {
    const payload = await authService.login(request.body.email, request.body.password);
    sendSuccess(response, payload, "Login successful");
  }

  async getMe(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const user = await authService.getProfile(userId);
    sendSuccess(response, user, "Profile loaded");
  }
}

export const authController = new AuthController();