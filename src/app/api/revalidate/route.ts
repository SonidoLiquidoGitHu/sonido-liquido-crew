import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// ===========================================
// ISR REVALIDATION ENDPOINT
// ===========================================
// Called by Netlify scheduled function after sync to refresh cached pages.
// Secured with REVALIDATION_SECRET env var.

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const secret = body.secret || request.nextUrl.searchParams.get("secret");
  const path = body.path || request.nextUrl.searchParams.get("path") || "/";

  // Verify secret
  if (
    process.env.REVALIDATION_SECRET &&
    secret !== process.env.REVALIDATION_SECRET
  ) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    // Revalidate the specified path (and related pages)
    revalidatePath(path);
    if (path === "/") {
      // Also revalidate discografia page when home page is refreshed
      revalidatePath("/discografia");
    }

    console.log(`[Revalidate] Revalidated path: ${path}`);
    return NextResponse.json({ revalidated: true, path });
  } catch (error) {
    console.error("[Revalidate] Error:", error);
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }
}
