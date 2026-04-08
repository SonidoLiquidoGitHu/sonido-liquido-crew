import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists } from "@/db/schema/artists";
import { youtubeChannels } from "@/db/schema/videos";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Correct YouTube channel data for each artist
const artistChannels: Record<string, { handle: string; channelUrl: string }> = {
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
    handle: "UCZp_YCv7jK3-lEtvSONNs8A",
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
    handle: "UCMvZBwXGDTnXVV7NbYKWfaA",
    channelUrl: "https://youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA"
  },
  "reick-one": {
    handle: "UCMvZBwXGDTnXVV7NbYKWfaA",
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

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const results: Array<{ artist: string; status: string; oldUrl?: string; newUrl?: string }> = [];

    // Get all artists
    const allArtists = await db.select().from(artists);

    // First, delete ALL existing youtube channels (they're all wrong - pointing to sonidoliquido)
    const deletedChannels = await db.delete(youtubeChannels).returning();
    console.log(`Deleted ${deletedChannels.length} existing channels`);

    // Now create fresh channels for each artist with correct data
    for (const artist of allArtists) {
      const channelData = artistChannels[artist.slug];

      if (!channelData) {
        results.push({
          artist: artist.name,
          status: "skipped_no_mapping",
        });
        continue;
      }

      // Create new channel entry with unique channel_id (use slug to ensure uniqueness)
      const newId = generateUUID();
      const uniqueChannelId = `${channelData.handle}_${artist.slug}`;

      await db.insert(youtubeChannels).values({
        id: newId,
        channelId: uniqueChannelId,
        channelName: artist.name,
        channelUrl: channelData.channelUrl,
        artistId: artist.id,
        isActive: true,
        displayOrder: 0,
      });

      results.push({
        artist: artist.name,
        status: "created",
        newUrl: channelData.channelUrl,
      });
    }

    return NextResponse.json({
      success: true,
      message: "YouTube channels recreated with correct URLs",
      deletedCount: deletedChannels.length,
      results,
      summary: {
        total: results.length,
        created: results.filter(r => r.status === "created").length,
        skipped: results.filter(r => r.status === "skipped_no_mapping").length,
      }
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

    const preview: Array<{ artist: string; slug: string; currentUrl?: string; newUrl?: string; status: string }> = [];

    // Get all artists with their channels
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
          status: "no_mapping",
        });
        continue;
      }

      if (existingChannels.length > 0) {
        const channel = existingChannels[0];
        const needsUpdate = channel.channelUrl !== channelData.channelUrl;

        preview.push({
          artist: artist.name,
          slug: artist.slug,
          currentUrl: channel.channelUrl,
          newUrl: channelData.channelUrl,
          status: needsUpdate ? "needs_update" : "up_to_date",
        });
      } else {
        preview.push({
          artist: artist.name,
          slug: artist.slug,
          newUrl: channelData.channelUrl,
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
      instructions: "Call this endpoint with POST to apply the changes"
    });
  } catch (error) {
    console.error("[Update YouTube Channels Preview] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
