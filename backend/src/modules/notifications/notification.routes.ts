import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware";
import { AppError } from "../../middleware/error.middleware";
import { validateParams } from "../../middleware/validation.middleware";
import { AuthenticatedRequest } from "../../types/global.types";
import { requiredParam } from "../../utils/express.utils";
import { asyncHandler, sendSuccess } from "../../utils/response";
import { notificationService } from "./notification.service";

const router = Router();

const paramsSchema = z.object({
  id: z.string().uuid()
});

router.get(
  "/",
  authenticate,
  asyncHandler(async (request, response) => {
    const userId = (request as AuthenticatedRequest).user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const notifications = await notificationService.listForUser(userId);
    sendSuccess(response, notifications, "Notifications loaded", { count: notifications.length });
  })
);

router.patch(
  "/:id/read",
  authenticate,
  validateParams(paramsSchema),
  asyncHandler(async (request, response) => {
    const userId = (request as AuthenticatedRequest).user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const notification = await notificationService.markRead(userId, requiredParam(request.params, "id"));

    if (!notification) {
      throw new AppError("Notification not found", 404, "NOT_FOUND");
    }

    sendSuccess(response, notification, "Notification marked as read");
  })
);

export default router;
