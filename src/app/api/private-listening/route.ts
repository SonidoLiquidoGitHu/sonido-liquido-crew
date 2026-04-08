import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: "This endpoint has been deprecated.",
  }, { status: 410 });
}
