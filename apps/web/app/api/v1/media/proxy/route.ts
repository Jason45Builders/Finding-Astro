import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "finding-astro-media";

function extractStorageKey(publicUrl: string | null | undefined): string | null {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx !== -1) return publicUrl.slice(idx + marker.length);
  return null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("url");
  const key = url.searchParams.get("key");

  const storageKey = key || extractStorageKey(raw);

  if (!storageKey) {
    return new NextResponse("Missing key", { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(storageKey);
    if (error || !data) return new NextResponse("Not found", { status: 404 });

    const contentType = data.type || "image/jpeg";
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
