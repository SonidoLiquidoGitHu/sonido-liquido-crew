import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Check if the current admin session is valid.
 * Returns the user info if authenticated, or an error if not.
 * Used by the middleware and frontend to verify auth state.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("admin_session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false });
    }

    // Look up session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, sessionToken))
      .limit(1);

    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      try {
        await db.delete(sessions).where(eq(sessions.token, sessionToken));
      } catch {
        // Ignore
      }
      return NextResponse.json({ authenticated: false });
    }

    // Get user info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[Auth] Check error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
