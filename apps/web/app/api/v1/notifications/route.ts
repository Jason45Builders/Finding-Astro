import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");
    const subResource = pathParts[1];

    if (subResource === "notifications") {
      const userId = authResult.user.id;
      const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);
      const { data, error } = await supabaseAdmin.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
      if (error) return serverError(error.message);
      return ok(data ?? [], "Notifications loaded");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const id = url.pathname.replace(/.*\/notifications\//, "").replace(/\/.*$/, "");

    const { error } = await supabaseAdmin.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", authResult.user.id);
    if (error) return serverError(error.message);
    return ok(null, "Notification marked read");
  } catch {
    return serverError();
  }
}
