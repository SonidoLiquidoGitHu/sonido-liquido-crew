import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists } from "@/db/schema/artists";
import { artistExternalProfiles } from "@/db/schema";
import { youtubeChannels } from "@/db/schema/videos";
import { eq, and } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { youtubeClient } from "@/lib/clients";

export const dynamic = "force-dynamic";

// YouTube channel data for each artist.
// For handles (@something), the sync will resolve them to real UC... IDs.
// For direct channel IDs (UC...), they can be used as-is.
const artistChannels: Record<string, { handle?: string; channelId?: string; channelUrl: string }> = {
  "brez": {
    handle: "brezhiphopmexicoslc25",
    channelUrl: "https://youtube.com/@brezhiphopmexicoslc25"
  },
  "bruno-grasso": {
    handle: "brunograssosl",
    channelUrl: "https://youtube.com/@brunograssosl"
  },
  "chas-7p": {
    handle: "chas7p347",
    channelUrl: "https://youtube.com/@chas7p347"
  },
  "codak": {
    handle: "codak",
    channelUrl: "https://youtube.com/@codak"
  },
  "dilema": {
    handle: "dilema999",
    channelUrl: "https://youtube.com/@dilema999"
  },
  "doctor-destino": {
    handle: "doctordestinohiphop",
    channelUrl: "https://youtube.com/@doctordestinohiphop"
  },
  "fancy-freak": {
    handle: "fancyfreakdj",
    channelUrl: "https://youtube.com/@fancyfreakdj"
  },
  "hassyel": {
    channelId: "UCZp_YCv7jK3-lEtvSONNs8A",
    channelUrl: "https://youtube.com/channel/UCZp_YCv7jK3-lEtvSONNs8A"
  },
  "kev-cabrone": {
    handle: "kevcabrone",
    channelUrl: "https://youtube.com/@kevcabrone"
  },
  "latin-geisha": {
    handle: "latingeishamx",
    channelUrl: "https://youtube.com/@latingeishamx"
  },
  "pepe-levine": {
    handle: "pepelevine",
    channelUrl: "https://youtube.com/@pepelevine"
  },
  "q-master-weed": {
    handle: "qmasterw",
    channelUrl: "https://youtube.com/@qmasterw"
  },
  "qmw": {
    handle: "qmasterw",
    channelUrl: "https://youtube.com/@qmasterw"
  },
  "reick-uno": {
    channelId: "UCMvZBwXGDTnXVV7NbYKWfaA",
    channelUrl: "https://youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA"
  },
  "reick-one": {
    channelId: "UCMvZBwXGDTnXVV7NbYKWfaA",
    channelUrl: "https://youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA"
  },
  "x-santa-ana": {
    handle: "xsanta-ana",
    channelUrl: "https://youtube.com/@xsanta-ana"
  },
  "zaque": {
    handle: "zakeuno",
    channelUrl: "https://youtube.com/@zakeuno"
  }
};

/**
 * Resolve a handle to a real YouTube channel ID using the API.
 * Returns the real UC... channel ID, or the handle if API is not available.
 */
async function resolveChannelId(handle: string): Promise<string> {
  if (!youtubeClient.isConfigured()) {
    // API not configured — return the handle prefixed so we know it needs resolution later
    console.warn(`[YouTube Channels] API key not configured, cannot resolve @${handle}. Channel will be resolved on first sync.`);
    return `@${handle}`;
  }

  try {
    const channel = await youtubeClient.getChannelByHandle(handle);
    if (channel?.id) {
      console.log(`[YouTube Channels] Resolved @${handle} → ${channel.id}`);
      return channel.id;
    }
    console.warn(`[YouTube Channels] Could not resolve @${handle}, no channel returned`);
    return `@${handle}`;
  } catch (err) {
    console.warn(`[YouTube Channels] Error resolving @${handle}:`, err);
    return `@${handle}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const results: Array<{ artist: string; status: string; channelId?: string; channelUrl?: string }> = [];

    // Get all artists
    const allArtists = await db.select().from(artists);

    // Delete ALL existing youtube channels (they may have wrong IDs)
    const deletedChannels = await db.delete(youtubeChannels).returning();
    console.log(`Deleted ${deletedChannels.length} existing channels`);

    // Create fresh channels for each artist with correct data
    for (const artist of allArtists) {
      const channelData = artistChannels[artist.slug];

      if (!channelData) {
        results.push({
          artist: artist.name,
          status: "skipped_no_mapping",
        });
        continue;
      }

      // Resolve the channel ID: either use the direct channelId or resolve the handle
      let realChannelId: string;
      if (channelData.channelId) {
        // Direct channel ID (UC...) already known
        realChannelId = channelData.channelId;
      } else if (channelData.handle) {
        // Resolve handle to real channel ID
        realChannelId = await resolveChannelId(channelData.handle);
      } else {
        results.push({
          artist: artist.name,
          status: "skipped_no_id_or_handle",
        });
        continue;
      }

      // Create youtube_channels entry
      const newId = generateUUID();
      await db.insert(youtubeChannels).values({
        id: newId,
        channelId: realChannelId,
        channelName: artist.name,
        channelUrl: channelData.channelUrl,
        artistId: artist.id,
        isActive: true,
        displayOrder: 0,
      });

      // Also create/update an entry in artist_external_profiles so the
      // YouTube sync fallback path can find it
      try {
        const existing = await db
          .select()
          .from(artistExternalProfiles)
          .where(and(
            eq(artistExternalProfiles.artistId, artist.id),
            eq(artistExternalProfiles.platform, "youtube")
          ))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(artistExternalProfiles)
            .set({
              externalUrl: channelData.channelUrl,
              externalId: realChannelId.startsWith("UC") ? realChannelId : null,
              updatedAt: new Date(),
            })
            .where(eq(artistExternalProfiles.id, existing[0].id));
        } else {
          await db.insert(artistExternalProfiles).values({
            id: generateUUID(),
            artistId: artist.id,
            platform: "youtube",
            externalUrl: channelData.channelUrl,
            externalId: realChannelId.startsWith("UC") ? realChannelId : null,
            isVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (profileErr) {
        console.warn(`[YouTube Channels] Could not update external profile for ${artist.name}:`, profileErr);
      }

      results.push({
        artist: artist.name,
        status: "created",
        channelId: realChannelId,
        channelUrl: channelData.channelUrl,
      });
    }

    return NextResponse.json({
      success: true,
      message: "YouTube channels recreated with correct data",
      deletedCount: deletedChannels.length,
      results,
      summary: {
        total: results.length,
        created: results.filter(r => r.status === "created").length,
        skipped: results.filter(r => r.status.startsWith("skipped")).length,
        resolvedIds: results.filter(r => r.channelId?.startsWith("UC")).length,
        pendingResolution: results.filter(r => r.channelId?.startsWith("@")).length,
      },
      note: results.some(r => r.channelId?.startsWith("@"))
        ? "Some channels have handles instead of IDs (prefixed with @). They will be resolved to real IDs during the first YouTube sync."
        : undefined,
    });
  } catch (error) {
    console.error("[Update YouTube Channels] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET to preview changes without applying
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const preview: Array<{ artist: string; slug: string; currentUrl?: string; currentChannelId?: string; newUrl?: string; newChannelId?: string; status: string }> = [];

    const allArtists = await db.select().from(artists);

    for (const artist of allArtists) {
      const channelData = artistChannels[artist.slug];

      // Find existing YouTube channel for this artist
      const existingChannels = await db
        .select()
        .from(youtubeChannels)
        .where(eq(youtubeChannels.artistId, artist.id));

      if (!channelData) {
        preview.push({
          artist: artist.name,
          slug: artist.slug,
          currentUrl: existingChannels[0]?.channelUrl,
          currentChannelId: existingChannels[0]?.channelId,
          status: "no_mapping",
        });
        continue;
      }

      const newChannelId = channelData.channelId || `@${channelData.handle}`;

      if (existingChannels.length > 0) {
        const channel = existingChannels[0];
        const needsUpdate = channel.channelUrl !== channelData.channelUrl || channel.channelId !== newChannelId;

        preview.push({
          artist: artist.name,
          slug: artist.slug,
          currentUrl: channel.channelUrl,
          currentChannelId: channel.channelId,
          newUrl: channelData.channelUrl,
          newChannelId,
          status: needsUpdate ? "needs_update" : "up_to_date",
        });
      } else {
        preview.push({
          artist: artist.name,
          slug: artist.slug,
          newUrl: channelData.channelUrl,
          newChannelId,
          status: "will_create",
        });
      }
    }

    return NextResponse.json({
      success: true,
      preview,
      summary: {
        total: preview.length,
        needsUpdate: preview.filter(p => p.status === "needs_update").length,
        willCreate: preview.filter(p => p.status === "will_create").length,
        upToDate: preview.filter(p => p.status === "up_to_date").length,
        noMapping: preview.filter(p => p.status === "no_mapping").length,
      },
      instructions: "Call this endpoint with POST to apply the changes. Handles will be resolved to real channel IDs if YOUTUBE_API_KEY is set.",
    });
  } catch (error) {
    console.error("[Update YouTube Channels Preview] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
