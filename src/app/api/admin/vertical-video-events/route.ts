import { db } from "@/db/client";
import { verticalVideoEvents, verticalVideos } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { asc, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// ===========================================
// Helper: Generate slug from title
// ===========================================
function generateSlug(title: string): string {
  return `${title
    .toLowerCase()
    .normalize("NFD")
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: intentional range
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Multiple hyphens to single
    .replace(/^-|-$/g, "")}-${Math.random().toString(36).substring(2, 6)}`; // Add unique suffix
}

// ===========================================
// GET - List all events with video counts
// ===========================================
export async function GET() {
  try {
    // Use explicit column selection instead of .select() (all columns).
    // The is_featured column was added to the Drizzle schema in migration
    // 0021, but if that migration hasn't been run on the production DB,
    // .select() would generate SQL referencing a non-existent column and
    // throw — making the admin page show "No hay eventos" even when
    // events exist. Explicit selection is also faster.
    // We try with isFeatured first; if it fails (pre-migration), we fall
    // back to the without-isFeatured query.
    let events: {
      id: string;
      title: string;
      slug: string;
      description: string | null;
      coverImageUrl: string | null;
      artistId: string | null;
      eventDate: Date | null;
      location: string | null;
      isPublished: boolean;
      isFeatured: boolean;
      displayOrder: number;
      createdAt: Date;
      updatedAt: Date;
    }[];

    try {
      events = await db
        .select({
          id: verticalVideoEvents.id,
          title: verticalVideoEvents.title,
          slug: verticalVideoEvents.slug,
          description: verticalVideoEvents.description,
          coverImageUrl: verticalVideoEvents.coverImageUrl,
          artistId: verticalVideoEvents.artistId,
          eventDate: verticalVideoEvents.eventDate,
          location: verticalVideoEvents.location,
          isPublished: verticalVideoEvents.isPublished,
          isFeatured: verticalVideoEvents.isFeatured,
          displayOrder: verticalVideoEvents.displayOrder,
          createdAt: verticalVideoEvents.createdAt,
          updatedAt: verticalVideoEvents.updatedAt,
        })
        .from(verticalVideoEvents)
        .orderBy(
          asc(verticalVideoEvents.displayOrder),
          desc(verticalVideoEvents.eventDate),
        );
    } catch (schemaError) {
      // Fallback: the is_featured column doesn't exist yet (pre-migration
      // 0021). Select without it and default isFeatured to false.
      console.warn(
        "[vertical-video-events GET] is_featured column missing, using fallback query:",
        schemaError instanceof Error ? schemaError.message : schemaError,
      );
      const fallbackEvents = await db
        .select({
          id: verticalVideoEvents.id,
          title: verticalVideoEvents.title,
          slug: verticalVideoEvents.slug,
          description: verticalVideoEvents.description,
          coverImageUrl: verticalVideoEvents.coverImageUrl,
          artistId: verticalVideoEvents.artistId,
          eventDate: verticalVideoEvents.eventDate,
          location: verticalVideoEvents.location,
          isPublished: verticalVideoEvents.isPublished,
          displayOrder: verticalVideoEvents.displayOrder,
          createdAt: verticalVideoEvents.createdAt,
          updatedAt: verticalVideoEvents.updatedAt,
        })
        .from(verticalVideoEvents)
        .orderBy(
          asc(verticalVideoEvents.displayOrder),
          desc(verticalVideoEvents.eventDate),
        );
      events = fallbackEvents.map((e) => ({
        ...e,
        isFeatured: false,
      }));
    }

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
      }),
    );

    return NextResponse.json({ success: true, data: eventsWithCounts });
  } catch (error) {
    console.error("Failed to fetch vertical video events:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch events" },
      { status: 500 },
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
      isFeatured,
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "El título es obligatorio" },
        { status: 400 },
      );
    }

    const eventId = generateUUID();
    const slug = generateSlug(title);

    // Try inserting with isFeatured (post-migration 0021). If the column
    // doesn't exist yet, fall back to inserting without it.
    try {
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
        isFeatured: isFeatured === true,
        displayOrder: 0,
      });
    } catch (insertError) {
      console.warn(
        "[vertical-video-events POST] is_featured column missing, inserting without it:",
        insertError instanceof Error ? insertError.message : insertError,
      );
      // Fallback: insert without isFeatured (pre-migration 0021).
      // Cast to any because the Drizzle schema now includes isFeatured,
      // so TypeScript would reject the values object without it.
      await db
        .insert(verticalVideoEvents)
        .values({
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
        // biome-ignore lint/suspicious/noExplicitAny: pre-migration fallback
        } as any);
    }

    // Revalidate so the new event appears on /reels immediately
    revalidatePath("/reels");

    return NextResponse.json({
      success: true,
      data: { id: eventId, slug },
    });
  } catch (error) {
    console.error("Failed to create vertical video event:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create event" },
      { status: 500 },
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
        { status: 400 },
      );
    }

    // Build update object - only include allowed fields
    const allowedFields = [
      "title",
      "description",
      "coverImageUrl",
      "artistId",
      "eventDate",
      "location",
      "isPublished",
      "isFeatured",
      "displayOrder",
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
      updateData.slug = generateSlug(updates.title);
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      // Try the update. If is_featured is in updateData and the column
      // doesn't exist yet (pre-migration 0021), this will fail — retry
      // without isFeatured so the rest of the update still applies.
      try {
        await db
          .update(verticalVideoEvents)
          .set(updateData)
          .where(eq(verticalVideoEvents.id, id));
      } catch (updateError) {
        if ("isFeatured" in updateData) {
          console.warn(
            "[vertical-video-events PATCH] is_featured column missing, retrying without it:",
            updateError instanceof Error ? updateError.message : updateError,
          );
          const { isFeatured: _omit, ...updateDataWithoutFeatured } =
            updateData;
          void _omit;
          await db
            .update(verticalVideoEvents)
            .set(updateDataWithoutFeatured)
            .where(eq(verticalVideoEvents.id, id));
        } else {
          throw updateError;
        }
      }
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

    // Revalidate the homepage and /reels so featured events appear/disappear
    // immediately. Without this, ISR (5-min cache) would delay the update.
    // Also revalidate the specific event page if it has a slug.
    revalidatePath("/", "layout");
    revalidatePath("/reels");

    return NextResponse.json({
      success: true,
      data: updatedEvent,
    });
  } catch (error) {
    console.error("Failed to update vertical video event:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update event" },
      { status: 500 },
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
        { status: 400 },
      );
    }

    // Unassign all videos from this event first
    await db
      .update(verticalVideos)
      .set({ eventId: null, updatedAt: new Date() })
      .where(eq(verticalVideos.eventId, id));

    // Delete the event
    await db.delete(verticalVideoEvents).where(eq(verticalVideoEvents.id, id));

    // Revalidate so the deleted event disappears from homepage + /reels
    revalidatePath("/", "layout");
    revalidatePath("/reels");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete vertical video event:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete event" },
      { status: 500 },
    );
  }
}
