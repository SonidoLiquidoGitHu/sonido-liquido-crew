import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookies } from "@/lib/spotify-auth";

/**
 * POST /api/auth/spotify/logout
 * Clears the Spotify session cookies.
 */
export async function POST() {
  const cookieStore = await cookies();
  const clearCookies = clearSessionCookies();
  for (const c of clearCookies) {
    cookieStore.set(c.name, c.value, c.options as Record<string, string | number | boolean>);
  }

  return NextResponse.json({ success: true });
}
