import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().optional(),
});

const hashPassword = async (pw: string) => bcrypt.hash(pw, 10);

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = validateBody(SignupSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { email, password, fullName } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabaseAdmin()
      .from("users")
      .upsert({ email: normalizedEmail, password_hash: passwordHash, full_name: fullName ?? null, role: "citizen", identity_tier: 0, last_active_at: new Date().toISOString() }, { onConflict: "email" })
      .select("id, email")
      .single();

    if (error) return serverError(error.message);
    await audit({ tableName: "users", recordId: data.id, action: "INSERT", actorId: "anonymous", actorRole: "citizen", newData: { email: data.email } });
    return ok({ email: data.email }, "Account created");
  } catch {
    return serverError("Failed to create account");
  }
}
