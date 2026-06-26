import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const { expoPushToken } = body as { expoPushToken: string };
    if (!expoPushToken) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "Expo push token required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    await supabaseAdmin.from("users").update({ expo_push_token: expoPushToken }).eq("id", authResult.user.id);
    return ok(null, "Push token registered");
  } catch {
    return serverError("Failed to register push token");
  }
}
