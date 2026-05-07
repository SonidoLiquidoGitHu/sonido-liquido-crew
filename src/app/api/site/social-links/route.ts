import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const revalidate = 300; // Cache for 5 minutes

// Default fallback values (used only when DB is unavailable)
const defaults = {
  spotifyUrl: "https://open.spotify.com/playlist/2y0Z7WdObJY1IvCLCXwUez",
  youtubeUrl: "https://www.youtube.com/@sonidoliquidocrew",
  instagramUrl: "https://www.instagram.com/sonidoliquido/",
  facebookUrl: "https://www.facebook.com/sonidoliquidocrew/",
};

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: defaults });
    }

    // Fetch social link settings from DB
    const settingKeys = [
      "spotify_playlist_url",
      "youtube_channel_url",
      "instagram_url",
      "facebook_url",
    ];

    const settings = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, settingKeys[0])); // Will need to query all

    // Fetch all social settings
    const allSettings = await db.query.siteSettings.findMany();

    const getSetting = (key: string) =>
      allSettings.find((s) => s.key === key)?.value;

    const data = {
      spotifyUrl:
        getSetting("spotify_playlist_url") || defaults.spotifyUrl,
      youtubeUrl:
        getSetting("youtube_channel_url") || defaults.youtubeUrl,
      instagramUrl:
        getSetting("instagram_url") || defaults.instagramUrl,
      facebookUrl:
        getSetting("facebook_url") || defaults.facebookUrl,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API /site/social-links] Error:", error);
    // Return defaults on error
    return NextResponse.json({ success: true, data: defaults });
  }
}
