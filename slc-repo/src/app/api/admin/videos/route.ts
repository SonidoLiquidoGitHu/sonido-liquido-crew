import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { videos } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allVideos = await db.query.videos.findMany({
      orderBy: (v, { desc }) => [desc(v.createdAt)],
      with: {
        artist: true,
      },
    });

    return NextResponse.json({ success: true, data: allVideos });
  } catch (error) {
    console.error("Failed to fetch videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      youtubeId,
      youtubeUrl,
      thumbnailUrl,
      artistId,
      description,
      isFeatured,
      publishedAt,
    } = body;

    if (!title || !youtubeId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if video already exists
    const existing = await db.query.videos.findFirst({
      where: (v, { eq }) => eq(v.youtubeId, youtubeId),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Este video ya existe" },
        { status: 400 }
      );
    }

    const videoId = generateUUID();

    await db.insert(videos).values({
      id: videoId,
      title,
      youtubeId,
      youtubeUrl: youtubeUrl || `https://www.youtube.com/watch?v=${youtubeId}`,
      thumbnailUrl: thumbnailUrl || `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      artistId: artistId || null,
      description: description || null,
      isFeatured: isFeatured || false,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
    });

    return NextResponse.json({
      success: true,
      data: { id: videoId },
    });
  } catch (error) {
    console.error("Failed to create video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create video" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing video ID" },
        { status: 400 }
      );
    }

    // Build update object - only include allowed fields
    const allowedFields = ["title", "description", "isFeatured", "artistId", "displayOrder"];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Add updatedAt
    updateData.updatedAt = new Date();

    await db.update(videos).set(updateData).where(eq(videos.id, id));

    // Fetch updated video
    const updatedVideo = await db.query.videos.findFirst({
      where: (v, { eq }) => eq(v.id, id),
    });

    return NextResponse.json({ success: true, data: updatedVideo });
  } catch (error) {
    console.error("Failed to update video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update video" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing video ID" },
        { status: 400 }
      );
    }

    await db.delete(videos).where(eq(videos.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete video" },
      { status: 500 }
    );
  }
}
