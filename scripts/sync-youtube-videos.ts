/**
 * Sync YouTube videos for Sonido Líquido Crew artists
 * Run with: bunx tsx scripts/sync-youtube-videos.ts
 *
 * Note: This uses the YouTube oEmbed API and RSS feeds (no API key required)
 */

// Load environment variables
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import { db, isDatabaseConfigured } from "../src/db/client";
import { videos, artists } from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import { artistsRoster } from "../src/lib/data/artists-roster";

// Generate UUID
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Create slug
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// Extract channel ID from YouTube URL
function extractChannelId(url: string): { type: "handle" | "channel" | "user"; value: string } | null {
  if (!url) return null;

  // @handle format
  const handleMatch = url.match(/youtube\.com\/@([^/?]+)/);
  if (handleMatch) return { type: "handle", value: handleMatch[1] };

  // channel/ID format
  const channelMatch = url.match(/youtube\.com\/channel\/([^/?]+)/);
  if (channelMatch) return { type: "channel", value: channelMatch[1] };

  // user/name format
  const userMatch = url.match(/youtube\.com\/user\/([^/?]+)/);
  if (userMatch) return { type: "user", value: userMatch[1] };

  return null;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
}

// Fetch videos from YouTube RSS feed (no API key needed)
async function fetchChannelVideos(channelInfo: { type: string; value: string }): Promise<YouTubeVideo[]> {
  try {
    // For handles, we need to first get the channel ID
    let channelId = "";

    if (channelInfo.type === "handle") {
      // Try to get channel ID from handle by fetching the channel page
      try {
        const handleUrl = `https://www.youtube.com/@${channelInfo.value}`;
        const response = await fetch(handleUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)"
          }
        });

        if (response.ok) {
          const html = await response.text();
          // Extract channel ID from page
          const match = html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/);
          if (match) {
            channelId = match[1];
          }
        }
      } catch (e) {
        console.log(`     ⚠️ Couldn't resolve handle @${channelInfo.value}`);
      }
    } else if (channelInfo.type === "channel") {
      channelId = channelInfo.value;
    }

    if (!channelId) {
      return [];
    }

    // Fetch RSS feed
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await fetch(rssUrl);

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const videos: YouTubeVideo[] = [];

    // Parse XML (simple regex parsing)
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

    for (const entry of entries.slice(0, 50)) { // Limit to 50 videos
      const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);

      if (videoIdMatch && titleMatch) {
        videos.push({
          videoId: videoIdMatch[1],
          title: titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
          description: "",
          publishedAt: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
          thumbnailUrl: `https://i.ytimg.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`,
        });
      }
    }

    return videos;
  } catch (error) {
    console.error(`     ❌ Error fetching videos:`, error);
    return [];
  }
}

async function main() {
  console.log("\n📺 SINCRONIZANDO VIDEOS DE YOUTUBE");
  console.log("=".repeat(50));

  if (!isDatabaseConfigured()) {
    console.error("❌ Database not configured");
    process.exit(1);
  }

  // Get all artists from DB
  const dbArtists = await db.select().from(artists);
  console.log(`\n📋 ${dbArtists.length} artistas en la base de datos\n`);

  // Get existing video IDs
  const existingVideos = await db.select({ youtubeId: videos.youtubeId }).from(videos);
  const existingIds = new Set(existingVideos.map(v => v.youtubeId).filter(Boolean));
  console.log(`📦 ${existingIds.size} videos ya en la base de datos\n`);

  // Stats
  let totalFound = 0;
  let totalCreated = 0;
  let totalSkipped = 0;
  let artistsWithVideos = 0;

  // Process each roster artist
  for (const rosterArtist of artistsRoster) {
    console.log(`\n🎬 ${rosterArtist.name}`);

    // Find artist in DB
    const dbArtist = dbArtists.find(a =>
      a.name.toLowerCase() === rosterArtist.name.toLowerCase()
    );

    if (!dbArtist) {
      console.log(`   ⚠️ No encontrado en BD, saltando`);
      continue;
    }

    // Skip if no YouTube URL
    if (!rosterArtist.youtubeUrl) {
      console.log(`   ⏭️ Sin canal de YouTube`);
      continue;
    }

    // Extract channel info
    const channelInfo = extractChannelId(rosterArtist.youtubeUrl);
    if (!channelInfo) {
      console.log(`   ⚠️ URL de YouTube no válida: ${rosterArtist.youtubeUrl}`);
      continue;
    }

    console.log(`   📡 Canal: ${channelInfo.type}/${channelInfo.value}`);

    // Fetch videos
    const ytVideos = await fetchChannelVideos(channelInfo);
    console.log(`   📦 ${ytVideos.length} videos encontrados`);

    if (ytVideos.length > 0) {
      artistsWithVideos++;
    }

    totalFound += ytVideos.length;

    for (const video of ytVideos) {
      // Skip if already exists
      if (existingIds.has(video.videoId)) {
        totalSkipped++;
        continue;
      }

      // Create video
      const videoId = generateUUID();
      const slug = `${slugify(video.title)}-${videoId.slice(0, 8)}`;

      try {
        await db.insert(videos).values({
          id: videoId,
          title: video.title,
          slug,
          youtubeId: video.videoId,
          youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          thumbnailUrl: video.thumbnailUrl,
          description: video.description,
          artistId: dbArtist.id,
          publishDate: new Date(video.publishedAt),
          isPublished: true,
          isFeatured: false,
        });

        existingIds.add(video.videoId);
        totalCreated++;
        console.log(`   ✅ ${video.title.slice(0, 50)}...`);
      } catch (e) {
        // Skip duplicates
      }
    }

    // Wait between artists
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 RESUMEN:");
  console.log(`   Artistas con videos: ${artistsWithVideos}`);
  console.log(`   Total encontrados: ${totalFound}`);
  console.log(`   Nuevos creados: ${totalCreated}`);
  console.log(`   Ya existentes: ${totalSkipped}`);
  console.log("=".repeat(50) + "\n");
}

main().catch(console.error);
