import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import { audit } from "@/lib/audit";

const PartnerSignupSchema = z.object({
  partnerType: z.enum(["clinic", "store"]),
  name: z.string().min(1),
  address: z.string().optional(),
  wardName: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  clinicType: z.enum(["govt_hospital", "hospital", "clinic"]).optional(),
  acceptsStrays: z.boolean().optional(),
  emergency24hr: z.boolean().optional(),
  hasSurgery: z.boolean().optional(),
  hasInpatient: z.boolean().optional(),
  sellsMedicine: z.boolean().optional(),
  sellsFood: z.boolean().optional(),
  operatingHours: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = validateBody(PartnerSignupSchema, raw);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    if (body.partnerType === "clinic") {
      const { data, error } = await supabaseAdmin().from("partner_clinics").insert({
        name: body.name,
        address: body.address ?? null,
        ward_name: body.wardName ?? null,
        city: body.city ?? null,
        phone: body.phone ?? null,
        latitude: body.latitude ?? 0,
        longitude: body.longitude ?? 0,
        location: body.latitude && body.longitude ? `POINT(${body.longitude} ${body.latitude})` : null,
        clinic_type: body.clinicType ?? "clinic",
        accepts_strays: body.acceptsStrays ?? false,
        emergency_24hr: body.emergency24hr ?? false,
        has_surgery: body.hasSurgery ?? false,
        has_inpatient: body.hasInpatient ?? false,
        operating_hours: body.operatingHours ?? null,
        notes: body.notes ?? null,
        is_verified: false,
        is_active: false,
      }).select("*").single();
      if (error) return serverError(error.message);
      if (data) await audit({ tableName: "partner_clinics", recordId: data.id, action: "INSERT", actorId: "00000000-0000-0000-0000-000000000000", actorRole: "public_signup", newData: data });
      return ok(data, "Clinic signup submitted for review");
    }

    if (body.partnerType === "store") {
      const { data, error } = await supabaseAdmin().from("partner_stores").insert({
        name: body.name,
        address: body.address ?? null,
        ward_name: body.wardName ?? null,
        city: body.city ?? null,
        phone: body.phone ?? null,
        latitude: body.latitude ?? 0,
        longitude: body.longitude ?? 0,
        location: body.latitude && body.longitude ? `POINT(${body.longitude} ${body.latitude})` : null,
        sells_medicine: body.sellsMedicine ?? false,
        sells_food: body.sellsFood ?? true,
        operating_hours: body.operatingHours ?? null,
        is_verified: false,
        is_active: false,
      }).select("*").single();
      if (error) return serverError(error.message);
      if (data) await audit({ tableName: "partner_stores", recordId: data.id, action: "INSERT", actorId: "00000000-0000-0000-0000-000000000000", actorRole: "public_signup", newData: data });
      return ok(data, "Store signup submitted for review");
    }

    return badRequest("VALIDATION_ERROR", "Invalid partner type");
  } catch {
    return serverError();
  }
}
