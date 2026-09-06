import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { corsHeaders } from "@/lib/cors";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next({
      request: { headers: request.headers },
    });
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin);
    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value);
    }
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: cors });
    }
    return response;
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(key: string) {
          return request.cookies.get(key)?.value;
        },
        set(key: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name: key, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name: key, value, ...options });
        },
        remove(key: string, options: Record<string, unknown>) {
          request.cookies.set({ name: key, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name: key, value: "", ...options });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
