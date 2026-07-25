import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";

const QrCodeSchema = z.object({
  code: z.string().min(1),
  qrType: z.string().min(1),
  linkedAnimalId: z.string().uuid().optional(),
  linkedZoneId: z.string().uuid().optional(),
  linkedCaseId: z.string().uuid().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationText: z.string().optional(),
  displayLabel: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const code = url.pathname.replace(/.*qr-codes\//, "").replace(/\/.*$/, "");

    if (code) {
      const { data, error } = await supabaseAdmin().from("qr_codes").select("*").eq("code", code).maybeSingle();
      if (error) return serverError(error.message);
      if (!data) return notFound("QR code not found");
      return ok(data, "QR code found");
    }

    const { data, error } = await supabaseAdmin().from("qr_codes").select("*").limit(50);
    if (error) return serverError(error.message);
    return ok(data ?? [], "QR codes loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  if (authResult.user.role !== "admin" && authResult.user.role !== "govt" && authResult.user.role !== "ngo") {
    return new Response(JSON.stringify({ success: false, code: "FORBIDDEN", message: "Admin access required" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  try {
    const raw = await req.json();
    const parsed = validateBody(QrCodeSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { code, qrType, linkedAnimalId, linkedZoneId, linkedCaseId, latitude, longitude, locationText, displayLabel } = parsed.data;

    const { data, error } = await supabaseAdmin().from("qr_codes").insert({
      code,
      qr_type: qrType,
      linked_animal_id: linkedAnimalId ?? null,
      linked_zone_id: linkedZoneId ?? null,
      linked_case_id: linkedCaseId ?? null,
      location: latitude && longitude ? `POINT(${longitude} ${latitude})` : null,
      location_text: locationText ?? null,
      display_label: displayLabel ?? null,
      created_by_user_id: authResult.user.id,
      is_active: true,
    }).select("*").single();

    if (error) return serverError(error.message);
    return ok(data, "QR code created");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const qrId = url.pathname.replace(/.*qr-codes\//, "").replace(/\/.*$/, "");
    if (!qrId) return badRequest("VALIDATION_ERROR", "QR code id required");

    const raw = await req.json();
    const parsed = validateBody(z.object({ isActive: z.boolean().optional(), displayLabel: z.string().optional() }).passthrough(), raw);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

    const update: Record<string, unknown> = {};
    if (body.isActive !== undefined) update.is_active = body.isActive;
    if (body.displayLabel !== undefined) update.display_label = body.displayLabel;

    const { data, error } = await supabaseAdmin().from("qr_codes").update(update).eq("id", qrId).select("*").single();
    if (error) return serverError(error.message);
    return ok(data, "QR code updated");
  } catch {
    return serverError();
  }
}
