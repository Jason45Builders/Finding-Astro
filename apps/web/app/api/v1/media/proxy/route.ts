import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";

const PUBLIC_BUCKET = "finding-astro-media";
const PRIVATE_BUCKET = "finding-astro-private";

function extractStorageKey(publicUrl: string | null | undefined): string | null {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const marker = `/object/public/${PUBLIC_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx !== -1) return publicUrl.slice(idx + marker.length);
  return null;
}

function isPrivilegedRole(role: string) {
  const normalized = role.toLowerCase();
  return normalized === "admin" || normalized === "moderator" || normalized === "government" || normalized.includes("admin");
}

async function canReadPrivateMedia(media: {
  uploaded_by_id: string;
  linked_case_id: string | null;
  linked_animal_id: string | null;
}, userId: string, role: string) {
  if (media.uploaded_by_id === userId || isPrivilegedRole(role)) return true;
  if (!media.linked_case_id) return false;

  const admin = supabaseAdmin();
  const checks: PromiseLike<any>[] = [];
  if (media.linked_case_id) {
    checks.push(admin.from("cases").select("reporter_user_id, assigned_to_user_id").eq("id", media.linked_case_id).maybeSingle());
    checks.push(admin.from("case_responses").select("responder_user_id").eq("case_id", media.linked_case_id).eq("responder_user_id", userId).limit(1).maybeSingle());
  }
  if (media.linked_animal_id) {
    checks.push(admin.from("animals").select("caretaker_user_id, created_by_user_id").eq("id", media.linked_animal_id).maybeSingle());
  }
  const results = await Promise.all(checks);
  return results.some((result) => result.data?.reporter_user_id === userId || result.data?.assigned_to_user_id === userId || result.data?.responder_user_id === userId || result.data?.caretaker_user_id === userId || result.data?.created_by_user_id === userId);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mediaId = url.searchParams.get("mediaId");
  const raw = url.searchParams.get("url");
  const key = url.searchParams.get("key");

  try {
    if (mediaId) {
      const authResult = await authMiddleware(req);
      if ("error" in authResult) return authResult.error;

      const { data: media, error: mediaError } = await supabaseAdmin()
        .from("media_uploads")
        .select("id, uploaded_by_id, linked_case_id, linked_animal_id, storage_bucket, storage_key, visibility, status, content_type")
        .eq("id", mediaId)
        .maybeSingle();

      if (mediaError || !media || media.status !== "ready") {
        return new NextResponse("Not found", { status: 404 });
      }
      if (media.storage_bucket !== PRIVATE_BUCKET || media.visibility !== "private") {
        return new NextResponse("Invalid media route", { status: 400 });
      }

      const allowed = await canReadPrivateMedia(
        { uploaded_by_id: media.uploaded_by_id, linked_case_id: media.linked_case_id, linked_animal_id: media.linked_animal_id },
        authResult.user.id,
        authResult.user.role,
      );
      if (!allowed) return new NextResponse("Forbidden", { status: 403 });

      const { data, error } = await supabaseAdmin().storage.from(PRIVATE_BUCKET).download(media.storage_key);
      if (error || !data) return new NextResponse("Not found", { status: 404 });

      const arrayBuffer = await data.arrayBuffer();
      return new NextResponse(Buffer.from(arrayBuffer), {
        status: 200,
        headers: {
          "Content-Type": media.content_type || data.type || "application/octet-stream",
          "Cache-Control": "private, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const storageKey = key || extractStorageKey(raw);
    if (!storageKey) return new NextResponse("Missing key", { status: 400 });

    const { data, error } = await supabaseAdmin().storage.from(PUBLIC_BUCKET).download(storageKey);
    if (error || !data) return new NextResponse("Not found", { status: 404 });

    const arrayBuffer = await data.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
