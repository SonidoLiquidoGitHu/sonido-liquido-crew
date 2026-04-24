import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "slc_admin_token";
const ADMIN_API_PREFIX = "/api/admin";
const AUTH_ROUTES = [
  "/api/admin/auth/login",
  "/api/admin/auth/check",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /api/admin/* routes (excluding auth login/check)
  if (pathname.startsWith(ADMIN_API_PREFIX)) {
    const isAuthRoute = AUTH_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );

    if (isAuthRoute) {
      return NextResponse.next();
    }

    // Check if admin token cookie exists
    // Full token verification happens in the API routes using Node.js crypto
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión." },
        { status: 401 }
      );
    }

    // Basic token format check (must be base64.signature)
    const parts = token.split(".");
    if (parts.length !== 2) {
      const response = NextResponse.json(
        { error: "Sesión expirada. Inicia sesión de nuevo." },
        { status: 401 }
      );
      response.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
