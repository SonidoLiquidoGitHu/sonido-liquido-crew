import { db } from "@/db/client";
import { tags, verticalVideoTags, verticalVideos } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// ===========================================
// GET - List all vertical videos (admin)
// ===========================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");
    const search = searchParams.get("search");
    const publishedOnly = searchParams.get("published") === "true";

    const query = db
      .select()
      .from(verticalVideos)
      .orderBy(desc(verticalVideos.createdAt));

    // Apply filters
    const conditions = [];
    if (artistId) conditions.push(eq(verticalVideos.artistId, artistId));
    if (publishedOnly) conditions.push(eq(verticalVideos.isPublished, true));
    if (search) conditions.push(like(verticalVideos.title, `%${search}%`));

    let allVideos;
    if (conditions.length > 0) {
      allVideos = await db
        .select()
        .from(verticalVideos)
        .where(and(...conditions))
        .orderBy(desc(verticalVideos.createdAt));
    } else {
      allVideos = await db
        .select()
        .from(verticalVideos)
        .orderBy(desc(verticalVideos.createdAt));
    }

    // Fetch tags for each video
    const videosWithTags = await Promise.all(
      allVideos.map(async (video) => {
        const videoTagRows = await db
          .select({ tag: tags })
          .from(verticalVideoTags)
          .innerJoin(tags, eq(verticalVideoTags.tagId, tags.id))
          .where(eq(verticalVideoTags.videoId, video.id));

        return {
          ...video,
          tags: videoTagRows.map((row) => row.tag),
        };
      }),
    );

    return NextResponse.json({ success: true, data: videosWithTags });
  } catch (error) {
    console.error("Failed to fetch vertical videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vertical videos" },
      { status: 500 },
    );
  }
}

// ===========================================
// POST - Create a new vertical video
// ===========================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      duration,
      width,
      height,
      fileSize,
      mimeType,
      platform,
      platformId,
      platformUrl,
      embedUrl,
      artistId,
      eventId,
      isFeatured,
      isPublished,
      tagIds,
    } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: "Video URL is required" },
        { status: 400 },
      );
    }

    const videoId = generateUUID();

    await db.insert(verticalVideos).values({
      id: videoId,
      title: title || null,
      description: description || null,
      videoUrl,
      thumbnailUrl: thumbnailUrl || null,
      duration: duration || null,
      width: width || null,
      height: height || null,
      fileSize: fileSize || null,
      mimeType: mimeType || null,
      platform: platform || null,
      platformId: platformId || null,
      platformUrl: platformUrl || null,
      embedUrl: embedUrl || null,
      artistId: artistId || null,
      eventId: eventId || null,
      isFeatured: isFeatured || false,
      isPublished: isPublished !== false,
      displayOrder: 0,
    });

    // Add tags if provided
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await db.insert(verticalVideoTags).values({
          id: generateUUID(),
          videoId,
          tagId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: videoId },
    });
  } catch (error) {
    console.error("Failed to create vertical video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create vertical video" },
      { status: 500 },
    );
  }
}

// ===========================================
// PATCH - Update a vertical video
// ===========================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, tagIds, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing video ID" },
        { status: 400 },
      );
    }

    // Build update object - only include allowed fields
    const allowedFields = [
      "title",
      "description",
      "thumbnailUrl",
      "duration",
      "width",
      "height",
      "isFeatured",
      "isPublished",
      "displayOrder",
      "artistId",
      "eventId",
      "platform",
      "platformId",
      "platformUrl",
      "embedUrl",
    ];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await db
        .update(verticalVideos)
        .set(updateData)
        .where(eq(verticalVideos.id, id));
    }

    // Update tags if provided
    if (tagIds !== undefined) {
      // Delete existing tags
      await db
        .delete(verticalVideoTags)
        .where(eq(verticalVideoTags.videoId, id));
      // Insert new tags
      for (const tagId of tagIds) {
        await db.insert(verticalVideoTags).values({
          id: generateUUID(),
          videoId: id,
          tagId,
        });
      }
    }

    // Fetch updated video with tags
    const [updatedVideo] = await db
      .select()
      .from(verticalVideos)
      .where(eq(verticalVideos.id, id));

    const videoTagRows = await db
      .select({ tag: tags })
      .from(verticalVideoTags)
      .innerJoin(tags, eq(verticalVideoTags.tagId, tags.id))
      .where(eq(verticalVideoTags.videoId, id));

    return NextResponse.json({
      success: true,
      data: { ...updatedVideo, tags: videoTagRows.map((r) => r.tag) },
    });
  } catch (error) {
    console.error("Failed to update vertical video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update vertical video" },
      { status: 500 },
    );
  }
}

// ===========================================
// DELETE - Delete a vertical video
// ===========================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing video ID" },
        { status: 400 },
      );
    }

    // Tags will be cascade deleted
    await db.delete(verticalVideos).where(eq(verticalVideos.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete vertical video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete vertical video" },
      { status: 500 },
    );
  }
}
