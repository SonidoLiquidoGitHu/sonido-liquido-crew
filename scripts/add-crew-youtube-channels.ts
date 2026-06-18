/**
 * Adds the Sonido Líquido crew's YouTube channels to the youtube_channels table.
 *
 * - Reads existing channels and skips duplicates (by channel ID or URL)
 * - Tries to match each channel to an existing artist by name (case-insensitive, accent-insensitive)
 * - Prints a clear before/after report
 *
 * Usage:
 *   bun run scripts/add-crew-youtube-channels.ts
 */
import { db, isDatabaseConfigured } from "@/db/client";
import { youtubeChannels, artists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

interface ChannelInput {
  name: string;
  url: string;
  /** Optional artist slug hint if name matching is ambiguous */
  artistHint?: string;
}

// Channels requested by the user (Hassyel intentionally omitted — its URL was a
// duplicate of Fancy Freak; user needs to provide the correct URL).
const CHANNELS: ChannelInput[] = [
  { name: "Brez", url: "https://www.youtube.com/@brezhiphopmexicoslc25" },
  { name: "Bruno Grasso", url: "https://www.youtube.com/@BrunoGrassosl" },
  { name: "Chas 7P", url: "https://www.youtube.com/@chas7p347" },
  { name: "Dilema", url: "https://www.youtube.com/@dilema999" },
  { name: "Fancy Freak", url: "https://www.youtube.com/@fancyfreakdj" },
  { name: "Kev Cabrone", url: "https://www.youtube.com/@kevcabrone" },
  { name: "Latin Geisha", url: "https://www.youtube.com/@latingeishamx" },
  { name: "Q Master Weed", url: "https://www.youtube.com/@dosocholab" },
  { name: "Reick One", url: "https://www.youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA" },
  { name: "X Santa-Ana", url: "https://www.youtube.com/@xsanta-ana" },
  { name: "Zaque", url: "https://www.youtube.com/@zakeuno" },
  { name: "Peón MC", url: "https://www.youtube.com/@peonmc" },
];

function cleanUrl(url: string): string {
  let u = url.trim();
  const q = u.indexOf("?");
  if (q !== -1) u = u.substring(0, q);
  return u.replace(/\/+$/, "");
}

function extractChannelId(url: string): string | null {
  const u = cleanUrl(url);
  const patterns = [
    /youtube\.com\/channel\/(UC[\w-]+)/,
    /youtube\.com\/c\/([\w-]+)/,
    /youtube\.com\/@([\w-]+)/,
    /youtube\.com\/user\/([\w-]+)/,
  ];
  for (const p of patterns) {
    const m = u.match(p);
    if (m) return m[1];
  }
  if (u.startsWith("UC") && u.length === 24) return u;
  return null;
}

// Normalize for matching: lowercase, strip accents, collapse whitespace, drop punctuation
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchChannelInfo(channelUrl: string): Promise<{ name: string; thumbnail?: string } | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(channelUrl)}&format=json`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (response.ok) {
      const data = await response.json();
      return {
        name: data.author_name || "Unknown Channel",
        thumbnail: data.thumbnail_url,
      };
    }
  } catch (e) {
    // network or timeout — fall through
  }
  return null;
}

async function main() {
  if (!isDatabaseConfigured()) {
    console.error("❌ Database not configured. Set DATABASE_URL and DATABASE_AUTH_TOKEN in .env");
    process.exit(1);
  }

  console.log("=== Adding Sonido Líquido crew YouTube channels ===\n");

  // 1. Load existing channels
  const existing = await db.select().from(youtubeChannels);
  console.log(`Existing channels in DB: ${existing.length}`);
  for (const c of existing) {
    console.log(`  - ${c.channelName}  |  ${c.channelUrl}`);
  }
  console.log("");

  // Index by channelId and by URL for quick duplicate lookup
  const existingByChannelId = new Map(existing.map((c) => [c.channelId, c]));
  const existingByUrl = new Map(existing.map((c) => [cleanUrl(c.channelUrl), c]));

  // 2. Load all artists (for name matching)
  const allArtists = await db.select().from(artists).where(eq(artists.isActive, true));
  console.log(`Active artists in DB: ${allArtists.length}`);
  const artistsByNormName = new Map<string, typeof allArtists[number]>();
  for (const a of allArtists) {
    if (a.name) artistsByNormName.set(normalize(a.name), a);
  }
  console.log("");

  // 3. Process each channel
  const toAdd: Array<{
    id: string;
    channelId: string;
    channelName: string;
    channelUrl: string;
    thumbnailUrl: string | null;
    artistId: string | null;
    artistName: string | null;
  }> = [];

  const skipped: Array<{ name: string; url: string; reason: string }> = [];

  for (const input of CHANNELS) {
    const url = cleanUrl(input.url);
    const channelId = extractChannelId(url);

    // Duplicate check
    if (channelId && existingByChannelId.has(channelId)) {
      skipped.push({ name: input.name, url, reason: `channelId ${channelId} already exists in DB` });
      continue;
    }
    if (existingByUrl.has(url)) {
      skipped.push({ name: input.name, url, reason: "URL already exists in DB" });
      continue;
    }

    // Artist match by name
    let matchedArtist: typeof allArtists[number] | null = null;
    const normInput = normalize(input.name);
    if (artistsByNormName.has(normInput)) {
      matchedArtist = artistsByNormName.get(normInput)!;
    } else {
      // Try contains-match (e.g., "Peón MC" matches "peonmc")
      for (const [norm, artist] of artistsByNormName) {
        if (norm.includes(normInput) || normInput.includes(norm)) {
          matchedArtist = artist;
          break;
        }
      }
    }

    // Fetch oEmbed for nicer display name + thumbnail (best-effort)
    const info = await fetchChannelInfo(url);
    const finalName = input.name; // user-provided name wins

    toAdd.push({
      id: generateUUID(),
      channelId: channelId || generateUUID(),
      channelName: finalName,
      channelUrl: url,
      thumbnailUrl: info?.thumbnail || null,
      artistId: matchedArtist?.id || null,
      artistName: matchedArtist?.name || null,
    });
  }

  // 4. Insert new channels
  if (toAdd.length === 0) {
    console.log("ℹ️  No new channels to add — all are already in the DB or skipped.");
  } else {
    console.log(`=== Adding ${toAdd.length} new channels ===`);
    for (const c of toAdd) {
      try {
        await db.insert(youtubeChannels).values({
          id: c.id,
          channelId: c.channelId,
          channelName: c.channelName,
          channelUrl: c.channelUrl,
          thumbnailUrl: c.thumbnailUrl,
          artistId: c.artistId,
          isActive: true,
          displayOrder: 0,
        });
        const artistTag = c.artistName ? `  →  artist: ${c.artistName}` : "  →  artist: (no match)";
        console.log(`✓ ${c.channelName.padEnd(18)} ${c.channelUrl}${artistTag}`);
      } catch (e) {
        console.error(`✗ Failed to insert ${c.channelName}: ${(e as Error).message}`);
      }
    }
  }

  // 5. Report skipped
  if (skipped.length > 0) {
    console.log(`\n=== Skipped ${skipped.length} duplicates ===`);
    for (const s of skipped) {
      console.log(`  ↪ ${s.name.padEnd(18)} ${s.url}\n     reason: ${s.reason}`);
    }
  }

  // 6. Note about Hassyel
  console.log("\n=== Notes ===");
  console.log("⚠️  Hassyel was NOT added — the URL provided (https://www.youtube.com/@fancyfreakdj)");
  console.log("    is the same as Fancy Freak. Please provide Hassyel's correct YouTube URL and re-run.");

  // 7. Final state
  const finalChannels = await db.select().from(youtubeChannels);
  console.log(`\n=== Final state: ${finalChannels.length} channels in DB ===`);
  for (const c of finalChannels) {
    const status = c.isActive ? "✓" : "✗";
    console.log(`  ${status} ${c.channelName.padEnd(18)} ${c.channelUrl}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
