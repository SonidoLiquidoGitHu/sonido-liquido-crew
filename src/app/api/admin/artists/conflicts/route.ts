import { NextResponse } from "next/server";
import { artistsService } from "@/lib/services";

export async function GET() {
  try {
    const artistsWithConflicts = await artistsService.getWithConflicts();

    return NextResponse.json({
      success: true,
      data: {
        count: artistsWithConflicts.length,
        artists: artistsWithConflicts.map((artist) => ({
          id: artist.id,
          name: artist.name,
          slug: artist.slug,
          role: artist.role,
          verificationStatus: artist.verificationStatus,
          identityConflictFlag: artist.identityConflictFlag,
          adminNotes: artist.adminNotes,
          createdAt: artist.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching artist conflicts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch artist conflicts" },
      { status: 500 }
    );
  }
}
