import { NotificationItem } from "../types/user.types";
import { apiRequest } from "./api";

class NotificationService {
  async listNotifications(token: string): Promise<NotificationItem[]> {
    return apiRequest<NotificationItem[]>("/notifications", { token });
  }

  async markRead(token: string, notificationId: string): Promise<NotificationItem> {
    return apiRequest<NotificationItem>(`/notifications/${notificationId}/read`, {
      method: "PATCH",
      token
    });
  }
}

export const notificationService = new NotificationService();
