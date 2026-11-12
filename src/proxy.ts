import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Fast pre-check only: sends visitors without a session cookie to the login page.
 * Real authorisation happens server-side in every admin layout, server action and route handler.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname !== "/admin" ? `?next=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
