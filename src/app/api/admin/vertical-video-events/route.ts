import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { verticalVideoEvents, verticalVideos } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { eq, desc, sql, asc } from "drizzle-orm";

// ===========================================
// Helper: Generate slug from title
// ===========================================
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Multiple hyphens to single
    .replace(/^-|-$/g, "") // Trim leading/trailing hyphens
    + "-" + Math.random().toString(36).substring(2, 6); // Add unique suffix
}

// ===========================================
// GET - List all events with video counts
// ===========================================
export async function GET() {
  try {
    const events = await db
      .select()
      .from(verticalVideoEvents)
      .orderBy(asc(verticalVideoEvents.displayOrder), desc(verticalVideoEvents.eventDate));

    // Get video count for each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const [countResult] = await db
          .select({ total: sql<number>`count(*)` })
          .from(verticalVideos)
          .where(eq(verticalVideos.eventId, event.id));

        return {
          ...event,
          videoCount: countResult?.total || 0,
        };
      })
    );

    return NextResponse.json({ success: true, data: eventsWithCounts });
  } catch (error) {
    console.error("Failed to fetch vertical video events:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// ===========================================
// POST - Create a new event
// ===========================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      description,
      coverImageUrl,
      artistId,
      eventDate,
      location,
      isPublished,
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    const eventId = generateUUID();
    const slug = generateSlug(title);

    await db.insert(verticalVideoEvents).values({
      id: eventId,
      title,
      slug,
      description: description || null,
      coverImageUrl: coverImageUrl || null,
      artistId: artistId || null,
      eventDate: eventDate ? new Date(eventDate) : null,
      location: location || null,
      isPublished: isPublished !== false,
      displayOrder: 0,
    });

    return NextResponse.json({
      success: true,
      data: { id: eventId, slug },
    });
  } catch (error) {
    console.error("Failed to create vertical video event:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create event" },
      { status: 500 }
    );
  }
}

// ===========================================
// PATCH - Update an event (including video assignments)
// ===========================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, videoIds, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing event ID" },
        { status: 400 }
      );
    }

    // Build update object - only include allowed fields
    const allowedFields = [
      "title", "description", "coverImageUrl", "artistId",
      "eventDate", "location", "isPublished", "displayOrder",
    ];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        if (field === "eventDate" && updates[field]) {
          updateData[field] = new Date(updates[field]);
        } else {
          updateData[field] = updates[field];
        }
      }
    }

    // Auto-generate slug if title is changing
    if (updates.title) {
      updateData["slug"] = generateSlug(updates.title);
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await db.update(verticalVideoEvents).set(updateData).where(eq(verticalVideoEvents.id, id));
    }

    // Reassign videos if videoIds is provided
    if (videoIds !== undefined) {
      // First, unassign all videos from this event
      await db
        .update(verticalVideos)
        .set({ eventId: null, updatedAt: new Date() })
        .where(eq(verticalVideos.eventId, id));

      // Then, assign the specified videos to this event
      if (videoIds.length > 0) {
        for (const videoId of videoIds) {
          await db
            .update(verticalVideos)
            .set({ eventId: id, updatedAt: new Date() })
            .where(eq(verticalVideos.id, videoId));
        }
      }
    }

    // Fetch updated event
    const [updatedEvent] = await db
      .select()
      .from(verticalVideoEvents)
      .where(eq(verticalVideoEvents.id, id));

    return NextResponse.json({
      success: true,
      data: updatedEvent,
    });
  } catch (error) {
    console.error("Failed to update vertical video event:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// ===========================================
// DELETE - Delete an event (set eventId to null on videos)
// ===========================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing event ID" },
        { status: 400 }
      );
    }

    // Unassign all videos from this event first
    await db
      .update(verticalVideos)
      .set({ eventId: null, updatedAt: new Date() })
      .where(eq(verticalVideos.eventId, id));

    // Delete the event
    await db.delete(verticalVideoEvents).where(eq(verticalVideoEvents.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete vertical video event:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
