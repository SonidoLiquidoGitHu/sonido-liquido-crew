import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { fanWallMessages, trustedContributors } from "@/db/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// Helper function to check if a user is trusted
async function checkTrustedContributor(
  email?: string | null,
  instagram?: string | null
): Promise<{ trusted: boolean; autoApprove: boolean; autoFeature: boolean } | null> {
  if (!email && !instagram) {
    return null;
  }

  try {
    const conditions = [];

    if (email) {
      conditions.push(
        and(
          eq(trustedContributors.identifierType, "email"),
          eq(trustedContributors.identifierValue, email.toLowerCase().trim())
        )
      );
    }

    if (instagram) {
      const cleanInstagram = instagram.replace("@", "").toLowerCase().trim();
      conditions.push(
        and(
          eq(trustedContributors.identifierType, "instagram"),
          eq(trustedContributors.identifierValue, cleanInstagram)
        )
      );
    }

    const [contributor] = await db
      .select()
      .from(trustedContributors)
      .where(
        and(
          eq(trustedContributors.isActive, true),
          conditions.length > 1 ? or(...conditions) : conditions[0]
        )
      )
      .limit(1);

    if (contributor) {
      // Update submission count
      await db
        .update(trustedContributors)
        .set({
          approvedCount: sql`${trustedContributors.approvedCount} + 1`,
          lastSubmissionAt: new Date(),
        })
        .where(eq(trustedContributors.id, contributor.id));

      return {
        trusted: true,
        autoApprove: contributor.autoApproveMessages ?? true,
        autoFeature: contributor.autoFeature ?? false,
      };
    }
  } catch (error) {
    console.error("[Trusted Contributors] Error checking:", error);
  }

  return null;
}

// GET - Fetch approved fan wall messages
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");
    const releaseId = searchParams.get("releaseId");
    const eventId = searchParams.get("eventId");
    const featured = searchParams.get("featured");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Build conditions
    const conditions = [
      eq(fanWallMessages.isApproved, true),
      eq(fanWallMessages.isHidden, false),
    ];

    if (artistId) {
      conditions.push(eq(fanWallMessages.artistId, artistId));
    }
    if (releaseId) {
      conditions.push(eq(fanWallMessages.releaseId, releaseId));
    }
    if (eventId) {
      conditions.push(eq(fanWallMessages.eventId, eventId));
    }
    if (featured === "true") {
      conditions.push(eq(fanWallMessages.isFeatured, true));
    }

    const messages = await db
      .select()
      .from(fanWallMessages)
      .where(and(...conditions))
      .orderBy(desc(fanWallMessages.isFeatured), desc(fanWallMessages.createdAt))
      .limit(limit);

    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error("[Fan Wall] Error fetching messages:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar mensajes" },
      { status: 500 }
    );
  }
}

// POST - Submit a new message (goes to moderation)
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      displayName,
      email,
      message,
      reaction,
      country,
      city,
      artistId,
      releaseId,
      eventId,
    } = body;

    if (!displayName?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nombre y mensaje son requeridos" },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length > 500) {
      return NextResponse.json(
        { success: false, error: "El mensaje no puede superar 500 caracteres" },
        { status: 400 }
      );
    }

    const id = generateUUID();

    // Check if user is a trusted contributor for auto-approval
    const trustedStatus = await checkTrustedContributor(email, null);
    const isAutoApproved = trustedStatus?.autoApprove ?? false;
    const isAutoFeatured = trustedStatus?.autoFeature ?? false;

    const [newMessage] = await db
      .insert(fanWallMessages)
      .values({
        id,
        displayName: displayName.trim(),
        email: email?.trim() || null,
        message: message.trim(),
        reaction: reaction || null,
        country: country?.trim() || null,
        city: city?.trim() || null,
        artistId: artistId || null,
        releaseId: releaseId || null,
        eventId: eventId || null,
        isApproved: isAutoApproved,
        isFeatured: isAutoFeatured,
        isHidden: false,
        moderatedAt: isAutoApproved ? new Date() : null,
        moderatedBy: isAutoApproved ? "auto-trusted" : null,
      })
      .returning();

    console.log(`[Fan Wall] New message submitted: ${id} (auto-approved: ${isAutoApproved}, trusted: ${trustedStatus?.trusted ?? false})`);

    return NextResponse.json({
      success: true,
      data: newMessage,
      message: isAutoApproved
        ? "¡Gracias! Tu mensaje ya está publicado."
        : "Mensaje enviado. Será visible después de aprobación.",
      autoApproved: isAutoApproved,
    });
  } catch (error) {
    console.error("[Fan Wall] Error submitting message:", error);
    return NextResponse.json(
      { success: false, error: "Error al enviar mensaje" },
      { status: 500 }
    );
  }
}
