/**
 * Alternative Spotify sync using public embed/oembed API
 * This doesn't require authentication and has no rate limits
 */

import { db } from "@/db/client";
import { artists, releases, releaseArtists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

interface SpotifyOembedData {
  title: string;
  thumbnail_url: string;
  provider_name: string;
  type: string;
}

interface SpotifyArtistEmbed {
  name: string;
  imageUrl: string | null;
}

interface SpotifyAlbumEmbed {
  id: string;
  name: string;
  type: "album" | "single" | "compilation";
  releaseDate: string;
  imageUrl: string;
  spotifyUrl: string;
  artistName: string;
}

/**
 * Fetch artist info from Spotify's public oembed endpoint
 */
export async function fetchArtistEmbed(spotifyId: string): Promise<SpotifyArtistEmbed | null> {
  try {
    const url = `https://open.spotify.com/oembed?url=https://open.spotify.com/artist/${spotifyId}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch artist embed: ${response.status}`);
      return null;
    }

    const data: SpotifyOembedData = await response.json();

    return {
      name: data.title,
      imageUrl: data.thumbnail_url || null,
    };
  } catch (error) {
    console.error("Error fetching artist embed:", error);
    return null;
  }
}

/**
 * Fetch album/release info from Spotify's public oembed endpoint
 */
export async function fetchAlbumEmbed(spotifyId: string): Promise<{
  title: string;
  imageUrl: string | null;
} | null> {
  try {
    const url = `https://open.spotify.com/oembed?url=https://open.spotify.com/album/${spotifyId}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch album embed: ${response.status}`);
      return null;
    }

    const data: SpotifyOembedData = await response.json();

    return {
      title: data.title,
      imageUrl: data.thumbnail_url || null,
    };
  } catch (error) {
    console.error("Error fetching album embed:", error);
    return null;
  }
}

/**
 * Update artist profile image from Spotify embed
 */
export async function syncArtistImageFromEmbed(artistId: string, spotifyId: string): Promise<boolean> {
  try {
    const embedData = await fetchArtistEmbed(spotifyId);
    if (!embedData || !embedData.imageUrl) {
      return false;
    }

    await db.update(artists)
      .set({
        profileImageUrl: embedData.imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));

    return true;
  } catch (error) {
    console.error("Error syncing artist image:", error);
    return false;
  }
}

/**
 * Sync all artist images from Spotify embeds
 */
export async function syncAllArtistImages(): Promise<{ success: number; failed: number }> {
  const allArtists = await db.select().from(artists);
  let success = 0;
  let failed = 0;

  for (const artist of allArtists) {
    // Get Spotify ID from external profiles or stored spotifyId
    const spotifyProfile = await db.query.artistExternalProfiles.findFirst({
      where: (profiles, { and, eq }) => and(
        eq(profiles.artistId, artist.id),
        eq(profiles.platform, "spotify")
      ),
    });

    const spotifyId = spotifyProfile?.externalId;
    if (!spotifyId) {
      failed++;
      continue;
    }

    // Small delay to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 200));

    const result = await syncArtistImageFromEmbed(artist.id, spotifyId);
    if (result) {
      success++;
      console.log(`✓ Updated image for ${artist.name}`);
    } else {
      failed++;
      console.log(`✗ Failed to update image for ${artist.name}`);
    }
  }

  return { success, failed };
}

/**
 * Add a release manually or from Spotify URL
 */
export async function addReleaseFromSpotify(
  spotifyUrl: string,
  artistId: string,
  releaseType: "album" | "single" | "ep" | "compilation" = "album",
  releaseDate?: Date
): Promise<string | null> {
  try {
    // Extract Spotify ID from URL
    const match = spotifyUrl.match(/album\/([a-zA-Z0-9]+)/);
    if (!match) {
      console.error("Invalid Spotify album URL");
      return null;
    }

    const spotifyId = match[1];

    // Fetch album info from embed
    const embedData = await fetchAlbumEmbed(spotifyId);
    if (!embedData) {
      console.error("Could not fetch album data");
      return null;
    }

    // Create release
    const releaseId = generateUUID();
    const slug = slugify(embedData.title);

    // Check if release already exists
    const existing = await db.query.releases.findFirst({
      where: (r, { eq }) => eq(r.spotifyId, spotifyId),
    });

    if (existing) {
      console.log(`Release "${embedData.title}" already exists`);
      return existing.id;
    }

    await db.insert(releases).values({
      id: releaseId,
      title: embedData.title,
      slug,
      releaseType,
      releaseDate: releaseDate || new Date(),
      spotifyId,
      spotifyUrl,
      coverImageUrl: embedData.imageUrl,
      isFeatured: false,
      isUpcoming: false,
    });

    // Link to artist
    await db.insert(releaseArtists).values({
      id: generateUUID(),
      releaseId,
      artistId,
      isPrimary: true,
    });

    console.log(`✓ Added release: ${embedData.title}`);
    return releaseId;
  } catch (error) {
    console.error("Error adding release from Spotify:", error);
    return null;
  }
}

/**
 * Batch add releases from a list of Spotify URLs
 */
export async function batchAddReleasesFromSpotify(
  items: Array<{
    spotifyUrl: string;
    artistName: string;
    releaseType?: "album" | "single" | "ep" | "compilation";
    releaseDate?: string;
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const item of items) {
    // Find artist
    const artist = await db.query.artists.findFirst({
      where: (a, { eq }) => eq(a.name, item.artistName),
    });

    if (!artist) {
      console.error(`Artist not found: ${item.artistName}`);
      failed++;
      continue;
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = await addReleaseFromSpotify(
      item.spotifyUrl,
      artist.id,
      item.releaseType || "album",
      item.releaseDate ? new Date(item.releaseDate) : undefined
    );

    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}
