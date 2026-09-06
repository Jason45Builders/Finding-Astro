import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

function mapNotification(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: row.title as string,
    body: row.message as string,
    createdAt: row.created_at as string,
    read: row.read_at !== null,
  };
}

const MarkReadSchema = z.object({});

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\/notifications\/?/, "").split("/").filter(Boolean);

    if (pathParts.length === 0) {
      const userId = authResult.user.id;
      const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);
      const { data, error } = await supabaseAdmin().from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
      if (error) return serverError(error.message);
      const notifications = (data ?? []).map(mapNotification);
      const latest = notifications.length > 0 ? new Date(notifications[0].createdAt).toISOString() : new Date().toISOString();
      return new NextResponse(JSON.stringify({ success: true, data: notifications, message: "Notifications loaded" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, must-revalidate",
          "Last-Modified": latest,
        },
      });
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`notification-read:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const url = new URL(req.url);
    const id = url.pathname.replace(/.*\/notifications\//, "").replace(/\/.*$/, "");

    const _parsed = validateBody(MarkReadSchema, {});
    if (!_parsed.ok) return _parsed.response;

    const { error } = await supabaseAdmin().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", authResult.user.id);
    if (error) return serverError(error.message);
    await audit({ tableName: "notifications", recordId: id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: { read_at: new Date().toISOString() } });
    return ok(null, "Notification marked read");
  } catch {
    return serverError();
  }
}
