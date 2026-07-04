import { db, isDatabaseConfigured } from "@/db/client";
import { artists, mediaReleases, pressKits } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 },
      );
    }

    // Check for access code or preview mode
    const accessCode = request.nextUrl.searchParams.get("code");
    const isPreview = request.nextUrl.searchParams.get("preview") === "true";

    const [release] = await db
      .select()
      .from(mediaReleases)
      .where(eq(mediaReleases.slug, slug))
      .limit(1);

    if (!release) {
      return NextResponse.json(
        { success: false, error: "Media release not found" },
        { status: 404 },
      );
    }

    // Check if access code is required (not in preview mode)
    if (release.accessCode && release.accessCode !== accessCode && !isPreview) {
      return NextResponse.json(
        { success: false, error: "Access code required" },
        { status: 403 },
      );
    }

    // Check if published (allow preview mode to bypass)
    if (!release.isPublished && !accessCode && !isPreview) {
      return NextResponse.json(
        { success: false, error: "Media release not published" },
        { status: 403 },
      );
    }

    // Increment view count
    await db
      .update(mediaReleases)
      .set({
        viewCount: sql`${mediaReleases.viewCount} + 1`,
      })
      .where(eq(mediaReleases.id, release.id));

    console.log(`[API] Media release viewed: ${release.title}`);

    // Resolve mainArtistId → artist name
    let resolvedArtistName: string | null = null;
    if (release.mainArtistId) {
      const [artistRow] = await db
        .select({ id: artists.id, name: artists.name })
        .from(artists)
        .where(eq(artists.id, release.mainArtistId))
        .limit(1);
      if (artistRow) {
        resolvedArtistName = artistRow.name;
      }
    }

    // Resolve attachedPressKitIds → press kit data
    const attachedPressKits: Array<{
      id: string;
      title: string;
      downloadUrl: string;
      artistName: string | null;
      fileSize: number | null;
    }> = [];

    if (release.attachedPressKitIds) {
      try {
        const kitIds: string[] = JSON.parse(release.attachedPressKitIds);
        if (Array.isArray(kitIds) && kitIds.length > 0) {
          for (const kitId of kitIds) {
            const [kit] = await db
              .select({
                id: pressKits.id,
                title: pressKits.title,
                downloadUrl: pressKits.downloadUrl,
                fileSize: pressKits.fileSize,
                artistId: pressKits.artistId,
              })
              .from(pressKits)
              .where(eq(pressKits.id, kitId))
              .limit(1);

            if (kit) {
              let kitArtistName: string | null = null;
              if (kit.artistId) {
                const [kitArtist] = await db
                  .select({ name: artists.name })
                  .from(artists)
                  .where(eq(artists.id, kit.artistId))
                  .limit(1);
                kitArtistName = kitArtist?.name || null;
              }
              attachedPressKits.push({
                id: kit.id,
                title: kit.title,
                downloadUrl: kit.downloadUrl,
                artistName: kitArtistName,
                fileSize: kit.fileSize,
              });
            }
          }
        }
      } catch (e) {
        console.error("[API] Error parsing attachedPressKitIds:", e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...release,
        resolvedArtistName,
        attachedPressKits,
      },
    });
  } catch (error) {
    console.error("[API] Error fetching media release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch media release" },
      { status: 500 },
    );
  }
}
