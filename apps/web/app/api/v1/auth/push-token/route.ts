import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";

const PushTokenSchema = z.object({
  expoPushToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const raw = await req.json();
    const parsed = validateBody(PushTokenSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { expoPushToken } = parsed.data;

    await supabaseAdmin().from("users").update({ expo_push_token: expoPushToken }).eq("id", authResult.user.id);
    await audit({ tableName: "users", recordId: authResult.user.id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: { expo_push_token: expoPushToken } });
    return ok(null, "Push token registered");
  } catch {
    return serverError("Failed to register push token");
  }
}
