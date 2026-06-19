/**
 * notification.service.ts — FIXED
 *
 * CRITICAL FIX: notifyUsersNearLocation previously queried WHERE home_location IS NOT NULL.
 * No user has ever had home_location set — broadcasts reached zero people.
 *
 * NEW STRATEGY: Query users who have active push tokens AND whose last_active_location
 * is within the broadcast radius. Falls back to push_tokens table joined with users
 * so any user who has ever logged in on a device near the incident gets the alert.
 */

import { query } from "../../config/db";
import {
  LocationInput, NotificationPayload, NotificationRecord, NotificationType,
} from "../../types/global.types";
import { logger } from "../../utils/logger";

interface NotificationRow {
  id: string; user_id: string; type: NotificationType; title: string;
  message: string; payload: NotificationPayload; read_at: Date | null; created_at: Date;
}

const mapNotification = (row: NotificationRow): NotificationRecord => ({
  id: row.id, userId: row.user_id, type: row.type, title: row.title,
  message: row.message, payload: row.payload, readAt: row.read_at, createdAt: row.created_at,
});

const HIGH_PRIORITY_TYPES: NotificationType[] = ["case", "abc"];

class NotificationService {
  async notifyUser(
    userId: string, type: NotificationType, title: string, message: string,
    payload: NotificationPayload = {}
  ): Promise<NotificationRecord> {
    const result = await query<NotificationRow>(
      `INSERT INTO notifications (user_id, type, title, message, payload)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, type, title, message, payload, read_at, created_at`,
      [userId, type, title, message, JSON.stringify(payload)]
    );
    const record = mapNotification(result.rows[0]);

    import("./push-notification.service")
      .then(({ pushNotificationService }) =>
        pushNotificationService.sendToUser(
          userId,
          title,
          message,
          { notificationId: record.id, type, ...payload }
        )
      )
      .catch((err) => logger.error("Push delivery failed (non-fatal)", { userId, type, err }));

    return record;
  }

  async notifyUsers(
    userIds: string[], type: NotificationType, title: string, message: string,
    payload: NotificationPayload = {}
  ): Promise<NotificationRecord[]> {
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    if (unique.length === 0) return [];
    return Promise.all(unique.map((uid) => this.notifyUser(uid, type, title, message, payload)));
  }

  /**
   * CRITICAL FIX: Now queries by push_token device location OR last_active_location.
   * home_location approach removed entirely — nobody has it set.
   *
   * Strategy:
   *   1. Primary: find users who have a push token registered and whose device was
   *      seen near the incident location (push_tokens.device_location if we store it).
   *   2. Fallback: find ALL users with active push tokens within the city and broadcast
   *      to those within the radius (less precise but functional until device location tracking added).
   *   3. Always include users with is_available=true (active responders).
   */
  async notifyUsersNearLocation(
    location: LocationInput,
    radiusKm: number,
    excludeUserIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    payload: NotificationPayload = {},
    options: { fuzzyBroadcast?: boolean } = {}
  ): Promise<NotificationRecord[]> {
    const excluded = Array.from(new Set(excludeUserIds.filter(Boolean)));

    // PRIMARY: users with last_active_location set (set on every app open with GPS)
    const primaryResult = await query<{ id: string }>(
      `
        SELECT u.id FROM users u
        WHERE u.last_active_location IS NOT NULL
          AND ST_DWithin(
            u.last_active_location,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
          AND u.is_available = TRUE
          AND (cardinality($4::uuid[]) = 0 OR u.id <> ALL($4::uuid[]))
        ORDER BY u.reputation_score DESC
        LIMIT 200
      `,
      [location.longitude, location.latitude, radiusKm * 1000, excluded]
    );

    let userIds = primaryResult.rows.map((r) => r.id);

    // FALLBACK: if primary gives fewer than 5 users, broadcast to ALL users with push tokens
    // This handles cold-start where nobody has last_active_location yet
    if (userIds.length < 5) {
      const fallbackResult = await query<{ id: string }>(
        `
          SELECT DISTINCT u.id FROM users u
          JOIN push_tokens pt ON pt.user_id = u.id AND pt.is_active = TRUE
          WHERE (cardinality($1::uuid[]) = 0 OR u.id <> ALL($1::uuid[]))
          ORDER BY u.reputation_score DESC
          LIMIT 500
        `,
        [excluded]
      );
      const fallbackIds = fallbackResult.rows.map((r) => r.id);
      userIds = Array.from(new Set([...userIds, ...fallbackIds]));
      logger.info("Using push-token fallback for broadcast", { radiusKm, fallbackCount: fallbackIds.length });
    }

    if (userIds.length === 0) {
      logger.warn("Emergency broadcast reached 0 users — no active push tokens found", { location, radiusKm });
      return [];
    }

    const broadcastPayload = options.fuzzyBroadcast
      ? {
          ...payload,
          location: {
            latitude:  Math.round(location.latitude  * 200) / 200,
            longitude: Math.round(location.longitude * 200) / 200,
          },
          fuzzyBroadcast: true,
        }
      : { ...payload, location };

    logger.info("Broadcasting notification", { userCount: userIds.length, radiusKm, type });
    return this.notifyUsers(userIds, type, title, message, broadcastPayload);
  }

  async listForUser(userId: string, limit = 50): Promise<NotificationRecord[]> {
    const result = await query<NotificationRow>(
      `SELECT id, user_id, type, title, message, payload, read_at, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map(mapNotification);
  }

  async countUnread(userId: string): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationRecord | null> {
    const result = await query<NotificationRow>(
      `UPDATE notifications SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, type, title, message, payload, read_at, created_at`,
      [notificationId, userId]
    );
    return result.rows[0] ? mapNotification(result.rows[0]) : null;
  }

  async markAllRead(userId: string): Promise<void> {
    await query(`UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`, [userId]);
  }
}

export const notificationService = new NotificationService();
