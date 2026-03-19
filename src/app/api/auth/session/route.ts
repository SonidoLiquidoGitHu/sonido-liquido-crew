import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token");

    if (token?.value) {
      return NextResponse.json({
        authenticated: true,
      });
    }

    return NextResponse.json({
      authenticated: false,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({
      authenticated: false,
    });
  }
}
