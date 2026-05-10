import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to protect admin routes.
 *
 * Strategy:
 * - All /admin/* PAGE routes require a session cookie (except /admin/login)
 * - All /api/admin/* API routes are allowed through (they handle their own auth)
 * - All /api/auth/* routes are allowed through (auth endpoints)
 * - Spotify OAuth callback routes are allowed (they need to work without a session
 *   since the user is being redirected FROM Spotify)
 *
 * The cookie check here is lightweight — we just check for the presence of the
 * admin_session cookie. The actual session token is validated server-side by
 * the /api/auth/check endpoint and by API routes that need authentication.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow ALL API routes through — they handle their own auth
  // This is critical for:
  //   - /api/admin/spotify/* — OAuth callback flow (no session cookie yet)
  //   - /api/auth/* — Login, logout, session check
  //   - All other admin API endpoints
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow access to the login page
  if (pathname === "/admin/login") {
    // If user already has a session, redirect to dashboard
    const sessionToken = request.cookies.get("admin_session")?.value;
    if (sessionToken) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Check for session cookie on all other admin pages
  const sessionToken = request.cookies.get("admin_session")?.value;

  if (!sessionToken) {
    // Redirect to login page
    const loginUrl = new URL("/admin/login", request.url);
    // Store the original URL so we can redirect back after login
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all admin routes except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/admin/:path*",
  ],
};
