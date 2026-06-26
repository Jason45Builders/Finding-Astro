import { NextRequest } from "next/server";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  return ok(null, "Logged out");
}
