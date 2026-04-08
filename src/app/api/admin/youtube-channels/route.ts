import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured, executeRaw } from "@/db/client";
import { youtubeChannels, videos } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// Ensure the youtube_channels table exists
async function ensureTableExists(): Promise<void> {
  try {
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS youtube_channels (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL UNIQUE,
        channel_name TEXT NOT NULL,
        channel_url TEXT NOT NULL,
        thumbnail_url TEXT,
        description TEXT,
        subscriber_count INTEGER,
        video_count INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        artist_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log("[YouTube API] Table youtube_channels ensured");
  } catch (error) {
    console.error("[YouTube API] Error ensuring table:", error);
    throw error;
  }
}

// Extract channel ID from YouTube URL
function extractChannelId(url: string): string | null {
  // Clean the URL - remove query parameters
  let cleanUrl = url.trim();

  // Remove query parameters (?si=..., etc.)
  const queryIndex = cleanUrl.indexOf("?");
  if (queryIndex !== -1) {
    cleanUrl = cleanUrl.substring(0, queryIndex);
  }

  // Remove trailing slash
  cleanUrl = cleanUrl.replace(/\/+$/, "");

  console.log("[YouTube] Extracting channel ID from:", cleanUrl);

  // Handle various YouTube channel URL formats
  const patterns = [
    /youtube\.com\/channel\/(UC[\w-]+)/,
    /youtube\.com\/c\/([\w-]+)/,
    /youtube\.com\/@([\w-]+)/,
    /youtube\.com\/user\/([\w-]+)/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      console.log("[YouTube] Extracted channel ID:", match[1]);
      return match[1];
    }
  }

  // If it's already a channel ID
  if (cleanUrl.startsWith("UC") && cleanUrl.length === 24) {
    return cleanUrl;
  }

  console.log("[YouTube] Could not extract channel ID from URL");
  return null;
}

// Clean YouTube URL for storage (remove tracking params)
function cleanChannelUrl(url: string): string {
  let cleanUrl = url.trim();

  // Remove query parameters
  const queryIndex = cleanUrl.indexOf("?");
  if (queryIndex !== -1) {
    cleanUrl = cleanUrl.substring(0, queryIndex);
  }

  // Remove trailing slash
  cleanUrl = cleanUrl.replace(/\/+$/, "");

  return cleanUrl;
}

// Fetch channel info from YouTube oEmbed
async function fetchChannelInfo(channelUrl: string): Promise<{
  name: string;
  thumbnail?: string;
} | null> {
  try {
    // Try to get info from a video on the channel
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(channelUrl)}&format=json`
    );

    if (response.ok) {
      const data = await response.json();
      return {
        name: data.author_name || "Unknown Channel",
        thumbnail: data.thumbnail_url,
      };
    }
  } catch (error) {
    console.error("[YouTube Channels] Failed to fetch channel info:", error);
  }

  return null;
}

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Ensure table exists
    await ensureTableExists();

    const channels = await db
      .select()
      .from(youtubeChannels)
      .orderBy(asc(youtubeChannels.displayOrder), desc(youtubeChannels.createdAt));

    return NextResponse.json({
      success: true,
      data: channels,
    });
  } catch (error) {
    console.error("[API] Error fetching YouTube channels:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch YouTube channels" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[YouTube API] POST request received");

    if (!isDatabaseConfigured()) {
      console.error("[YouTube API] Database not configured");
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    // Ensure table exists first
    await ensureTableExists();

    const body = await request.json();
    const { channelUrl, channelName, artistId, isActive = true } = body;

    console.log("[YouTube API] Request body:", { channelUrl, channelName, artistId, isActive });

    if (!channelUrl) {
      return NextResponse.json(
        { success: false, error: "Channel URL is required" },
        { status: 400 }
      );
    }

    // Clean the URL (remove tracking params)
    const cleanUrl = cleanChannelUrl(channelUrl);
    console.log("[YouTube API] Cleaned URL:", cleanUrl);

    // Extract channel ID
    const channelId = extractChannelId(channelUrl);
    console.log("[YouTube API] Extracted channel ID:", channelId);

    // Check if channel already exists
    if (channelId) {
      try {
        const existing = await db
          .select()
          .from(youtubeChannels)
          .where(eq(youtubeChannels.channelId, channelId))
          .limit(1);

        if (existing.length > 0) {
          console.log("[YouTube API] Channel already exists:", existing[0].channelName);
          return NextResponse.json(
            { success: false, error: `El canal "${existing[0].channelName}" ya existe` },
            { status: 400 }
          );
        }
      } catch (dbError) {
        console.error("[YouTube API] Error checking existing channel:", dbError);
        // Continue anyway - table might not exist yet
      }
    }

    // Try to fetch channel info
    console.log("[YouTube API] Fetching channel info...");
    const channelInfo = await fetchChannelInfo(cleanUrl);
    console.log("[YouTube API] Channel info:", channelInfo);

    const id = generateUUID();
    const finalChannelName = channelName || channelInfo?.name || "Canal de YouTube";

    console.log("[YouTube API] Creating channel with:", {
      id,
      channelId: channelId || id,
      channelName: finalChannelName,
      channelUrl: cleanUrl,
    });

    const [channel] = await db
      .insert(youtubeChannels)
      .values({
        id,
        channelId: channelId || id,
        channelName: finalChannelName,
        channelUrl: cleanUrl,
        thumbnailUrl: channelInfo?.thumbnail || null,
        artistId: artistId || null,
        isActive,
        displayOrder: 0,
      })
      .returning();

    console.log("[YouTube API] Channel created successfully:", channel.channelName);

    return NextResponse.json({
      success: true,
      data: channel,
    });
  } catch (error) {
    console.error("[YouTube API] Error creating channel:", error);
    console.error("[YouTube API] Error details:", (error as Error).message);
    console.error("[YouTube API] Error stack:", (error as Error).stack);

    // Return more specific error message
    const errorMessage = (error as Error).message || "Failed to create YouTube channel";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { id, channelName, isActive, displayOrder, artistId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Channel ID is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (channelName !== undefined) updateData.channelName = channelName;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (artistId !== undefined) updateData.artistId = artistId;

    const [channel] = await db
      .update(youtubeChannels)
      .set(updateData)
      .where(eq(youtubeChannels.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: channel,
    });
  } catch (error) {
    console.error("[API] Error updating YouTube channel:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update YouTube channel" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Channel ID is required" },
        { status: 400 }
      );
    }

    await db.delete(youtubeChannels).where(eq(youtubeChannels.id, id));

    return NextResponse.json({
      success: true,
      message: "Channel deleted",
    });
  } catch (error) {
    console.error("[API] Error deleting YouTube channel:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete YouTube channel" },
      { status: 500 }
    );
  }
}
