import { Response } from "express";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest } from "../../types/global.types";
import { sendSuccess } from "../../utils/response";
import { authService } from "./auth.service";

class AuthController {
  async requestOtp(request: AuthenticatedRequest, response: Response): Promise<void> {
    const payload = await authService.requestOtp(
      request.body.phone,
      request.body.fullName
    );

    sendSuccess(response, payload, "OTP generated", undefined, 202);
  }

  async verifyOtp(request: AuthenticatedRequest, response: Response): Promise<void> {
    const payload = await authService.verifyOtp(request.body.phone, request.body.code);
    sendSuccess(response, payload, "OTP verified");
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
