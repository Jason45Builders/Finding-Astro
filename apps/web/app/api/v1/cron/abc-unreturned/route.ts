import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError } from "@/lib/api-response";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cronSecret = req.headers.get("x-vercel-cron-secret") ?? req.nextUrl.searchParams.get("secret");
    if (!process.env.CRON_SECRET) {
      return new Response("Cron secret not configured", { status: 500 });
    }
    if (cronSecret !== process.env.CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: staleEvents, error: fetchError } = await supabaseAdmin()
      .from("abc_events")
      .select("id, animal_id, case_id, event_type, created_at, unreturned_alert")
      .eq("unreturned_alert", false)
      .lt("created_at", sevenDaysAgo)
      .order("created_at", { ascending: true });

    if (fetchError) return serverError(fetchError.message);

    const alerts = (staleEvents ?? []).filter((event) => {
      return event.event_type === "surgery" || event.event_type === "capture";
    });

    for (const event of alerts) {
      await supabaseAdmin().from("abc_events").update({ unreturned_alert: true }).eq("id", event.id);
      await audit({ tableName: "abc_events", recordId: event.id, action: "UPDATE", actorId: "cron", actorRole: "system", newData: { unreturned_alert: true, reason: "7_day_unreturned_check" } });
    }

    return ok({ checked: staleEvents?.length ?? 0, alertsTriggered: alerts.length, alerts }, "ABC cron completed");
  } catch {
    return serverError("Cron failed");
  }
}
