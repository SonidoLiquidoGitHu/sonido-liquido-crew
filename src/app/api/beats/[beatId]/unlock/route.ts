import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { beats, beatDownloads } from "@/db/schema";
import { eq, sql, or } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ beatId: string }> }
) {
  try {
    const { beatId } = await params;
    const body = await request.json();

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    // Get the beat by ID or slug
    const [beat] = await db
      .select()
      .from(beats)
      .where(or(eq(beats.id, beatId), eq(beats.slug, beatId)))
      .limit(1);

    if (!beat) {
      return NextResponse.json(
        { success: false, error: "Beat not found" },
        { status: 404 }
      );
    }

    if (!beat.isActive) {
      return NextResponse.json(
        { success: false, error: "Beat is not available" },
        { status: 410 }
      );
    }

    // Validate required actions
    if (beat.requireEmail && !body.email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    if (beat.requireSpotifyFollow && !body.completedSpotifyFollow) {
      return NextResponse.json(
        { success: false, error: "Spotify follow is required" },
        { status: 400 }
      );
    }

    if (beat.requireSpotifyPlay && !body.completedSpotifyPlay) {
      return NextResponse.json(
        { success: false, error: "Spotify play is required" },
        { status: 400 }
      );
    }

    if (beat.requireHyperfollow && !body.completedHyperfollow) {
      return NextResponse.json(
        { success: false, error: "Hyperfollow is required" },
        { status: 400 }
      );
    }

    // Get request metadata
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const referrer = request.headers.get("referer") || null;

    // Record the download
    await db.insert(beatDownloads).values({
      id: generateUUID(),
      beatId: beat.id,
      email: body.email || null,
      name: body.name || null,
      completedSpotifyFollow: body.completedSpotifyFollow || false,
      completedSpotifyPlay: body.completedSpotifyPlay || false,
      completedHyperfollow: body.completedHyperfollow || false,
      completedInstagramShare: body.completedInstagramShare || false,
      completedFacebookShare: body.completedFacebookShare || false,
      completedCustomAction: body.completedCustomAction || false,
      downloadedAt: new Date(),
      downloadCount: 1,
      ipAddress,
      userAgent,
      referrer,
    });

    // Update beat download count
    await db
      .update(beats)
      .set({
        downloadCount: sql`${beats.downloadCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(beats.id, beat.id));

    console.log(`[API] Beat unlocked: ${beat.title} - ${body.email || "anonymous"}`);

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: beat.fullAudioUrl,
        beatTitle: beat.title,
      },
    });
  } catch (error) {
    console.error("[API] Error unlocking beat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to unlock beat" },
      { status: 500 }
    );
  }
}
