import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("fa_token")?.value;
  const { pathname } = request.nextUrl;

  // Root landing page is public
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Auth pages (login, signup)
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  
  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Allow guest access for reporting cases
  if (pathname === "/cases/new") {
    return NextResponse.next();
  }

  // If no token exists and visiting a protected route, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
// 
