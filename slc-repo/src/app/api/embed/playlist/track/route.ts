import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { playlistEmbedStats, userPlaylists } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// POST - Track embed view/play
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true });
    }

    const body = await request.json();
    const { slug, type, referrer } = body;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Slug required" },
        { status: 400 }
      );
    }

    // Get playlist ID
    const [playlist] = await db
      .select({ id: userPlaylists.id })
      .from(userPlaylists)
      .where(eq(userPlaylists.slug, slug))
      .limit(1);

    if (!playlist) {
      return NextResponse.json(
        { success: false, error: "Playlist not found" },
        { status: 404 }
      );
    }

    // Parse referrer domain
    let referrerDomain = "direct";
    if (referrer && referrer !== "direct") {
      try {
        const url = new URL(referrer);
        referrerDomain = url.hostname;
      } catch {
        referrerDomain = "unknown";
      }
    }

    // Check if we already have stats for this playlist/referrer combo
    const [existing] = await db
      .select()
      .from(playlistEmbedStats)
      .where(
        and(
          eq(playlistEmbedStats.playlistId, playlist.id),
          eq(playlistEmbedStats.referrerDomain, referrerDomain)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing stats
      if (type === "play") {
        await db
          .update(playlistEmbedStats)
          .set({
            playCount: sql`${playlistEmbedStats.playCount} + 1`,
            lastSeenAt: new Date(),
          })
          .where(eq(playlistEmbedStats.id, existing.id));
      } else {
        await db
          .update(playlistEmbedStats)
          .set({
            viewCount: sql`${playlistEmbedStats.viewCount} + 1`,
            lastSeenAt: new Date(),
          })
          .where(eq(playlistEmbedStats.id, existing.id));
      }
    } else {
      // Create new stats entry
      await db.insert(playlistEmbedStats).values({
        id: generateUUID(),
        playlistId: playlist.id,
        embedType: "iframe",
        referrerDomain,
        referrerUrl: referrer || null,
        viewCount: type === "play" ? 0 : 1,
        playCount: type === "play" ? 1 : 0,
      });
    }

    // Also update main playlist stats
    if (type === "play") {
      await db
        .update(userPlaylists)
        .set({
          playCount: sql`${userPlaylists.playCount} + 1`,
        })
        .where(eq(userPlaylists.id, playlist.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Embed Track] Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
