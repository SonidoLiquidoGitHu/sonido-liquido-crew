import { db } from "@/db/client";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Admin logout endpoint.
 * Deletes the session from the DB and clears the cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("admin_session")?.value;

    if (sessionToken) {
      // Delete session from DB
      try {
        await db.delete(sessions).where(eq(sessions.token, sessionToken));
      } catch {
        // Ignore DB errors on logout
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0, // Delete cookie
    });

    return response;
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 },
    );
  }
}
