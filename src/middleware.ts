import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/admin-auth";

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

    // Verify admin token from cookie
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión." },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      const response = NextResponse.json(
        { error: "Sesión expirada. Inicia sesión de nuevo." },
        { status: 401 }
      );
      // Clear invalid cookie
      response.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-admin-user", payload.user);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
