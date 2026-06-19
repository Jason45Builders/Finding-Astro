import { query } from "../../config/db";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

// Install: npm install expo-server-sdk
// We use a dynamic import so the backend still starts even without the package
// Add to .env: EXPO_ACCESS_TOKEN=your_token

class PushNotificationService {
  private expo: any = null;

  private async getExpo() {
    if (this.expo) return this.expo;
    try {
      const { default: Expo } = await import("expo-server-sdk");
      this.expo = new Expo({ accessToken: env.EXPO_ACCESS_TOKEN, useFcmV1: true });
    } catch {
      logger.warn("expo-server-sdk not installed — push notifications disabled. Run: npm install expo-server-sdk");
    }
    return this.expo;
  }

  async registerToken(userId: string, token: string): Promise<void> {
    await query(`UPDATE users SET push_token=$2, updated_at=NOW() WHERE id=$1`, [userId, token]);
    logger.info("Push token registered", { userId });
  }

  async sendToUser(userId: string, title: string, body: string, data: Record<string, unknown> = {}): Promise<void> {
    const expo = await this.getExpo();
    if (!expo) return;

    const result = await query<{ push_token: string | null }>(`SELECT push_token FROM users WHERE id=$1`, [userId]);
    const token = result.rows[0]?.push_token;
    if (!token) return;

    try {
      await expo.sendPushNotificationsAsync([{ to: token, title, body, data, sound: "default", priority: "high" }]);
    } catch (err) {
      logger.error("Push send failed", { userId, err });
    }
  }

  async sendToUsers(userIds: string[], title: string, body: string, data: Record<string, unknown> = {}): Promise<void> {
    const expo = await this.getExpo();
    if (!expo || userIds.length === 0) return;

    const result = await query<{ push_token: string }>(
      `SELECT push_token FROM users WHERE id=ANY($1) AND push_token IS NOT NULL`, [userIds]
    );
    const tokens = result.rows.map(r => r.push_token).filter(Boolean);
    if (!tokens.length) return;

    const messages = tokens.map(to => ({ to, title, body, data, sound: "default" as const, priority: "high" as const }));
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        logger.error("Push chunk failed", { err });
      }
    }
  }
}

export const pushNotificationService = new PushNotificationService();
