import { artistsService } from "@/lib/services";
import { NextResponse } from "next/server";

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const artists = await artistsService.getAllWithProfiles();

    // Transform data into a format useful for public components
    const roster = artists.map((artist) => {
      const profiles = artist.externalProfiles || [];

      // Extract specific platform profiles
      const spotify = profiles.find((p) => p.platform === "spotify");
      const youtube = profiles.find((p) => p.platform === "youtube");
      const instagram = profiles.find((p) => p.platform === "instagram");
      const mixcloud = profiles.find((p) => p.platform === "mixcloud");

      return {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        role: artist.role,
        tintColor: artist.tintColor,
        profileImageUrl: artist.profileImageUrl,
        isFeatured: artist.isFeatured,
        isActive: artist.isActive,
        sortOrder: artist.sortOrder,
        // Platform profiles
        spotifyId: spotify?.externalId || null,
        spotifyUrl: spotify?.externalUrl || null,
        youtubeUrl: youtube?.externalUrl || null,
        youtubeHandle: youtube?.handle || null,
        instagramUrl: instagram?.externalUrl || null,
        instagramHandle: instagram?.handle || null,
        mixcloudUrl: mixcloud?.externalUrl || null,
        mixcloudHandle: mixcloud?.handle || null,
        // All profiles for flexibility
        externalProfiles: profiles.map((p) => ({
          platform: p.platform,
          externalId: p.externalId,
          externalUrl: p.externalUrl,
          handle: p.handle,
          isVerified: p.isVerified,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: roster,
    });
  } catch (error) {
    console.error("[API /artists/roster] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch roster" },
      { status: 500 },
    );
  }
}
