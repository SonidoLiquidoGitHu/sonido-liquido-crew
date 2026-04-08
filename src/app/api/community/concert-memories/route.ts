import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { concertMemories, trustedContributors } from "@/db/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// Helper function to check if a user is trusted for photos
async function checkTrustedContributorForPhotos(
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
        autoApprove: contributor.autoApprovePhotos ?? true,
        autoFeature: contributor.autoFeature ?? false,
      };
    }
  } catch (error) {
    console.error("[Trusted Contributors] Error checking for photos:", error);
  }

  return null;
}

// GET - Fetch approved concert memories
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const artistId = searchParams.get("artistId");
    const featured = searchParams.get("featured");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Build conditions
    const conditions = [
      eq(concertMemories.isApproved, true),
      eq(concertMemories.isHidden, false),
    ];

    if (eventId) {
      conditions.push(eq(concertMemories.eventId, eventId));
    }
    // For artistId, we'd need to check taggedArtists JSON, but for simplicity just filter by eventId
    if (featured === "true") {
      conditions.push(eq(concertMemories.isFeatured, true));
    }

    const memories = await db
      .select()
      .from(concertMemories)
      .where(and(...conditions))
      .orderBy(desc(concertMemories.isFeatured), desc(concertMemories.createdAt))
      .limit(limit);

    return NextResponse.json({ success: true, data: memories });
  } catch (error) {
    console.error("[Concert Memories] Error fetching:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar fotos" },
      { status: 500 }
    );
  }
}

// POST - Submit a new concert memory (photo upload)
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const submitterName = formData.get("submitterName") as string;
    const submitterEmail = formData.get("submitterEmail") as string | null;
    const submitterInstagram = formData.get("submitterInstagram") as string | null;
    const eventId = formData.get("eventId") as string | null;
    const eventName = formData.get("eventName") as string | null;
    const eventVenue = formData.get("eventVenue") as string | null;
    const eventCity = formData.get("eventCity") as string | null;
    const caption = formData.get("caption") as string | null;

    if (!file || !submitterName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Foto y nombre son requeridos" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "Solo se permiten imágenes" },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "La imagen no puede superar 10MB" },
        { status: 400 }
      );
    }

    // Upload to Dropbox
    let imageUrl = "";
    try {
      const { dropboxClient } = await import("@/lib/clients/dropbox");
      const isConfigured = await dropboxClient.isConfiguredAsync();

      if (!isConfigured) {
        return NextResponse.json(
          { success: false, error: "Dropbox no está configurado" },
          { status: 503 }
        );
      }

      const buffer = await file.arrayBuffer();
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${generateUUID()}.${ext}`;
      const path = `/concert-memories/${filename}`;

      await dropboxClient.uploadFile(path, buffer);
      imageUrl = await dropboxClient.getSharedLink(path);
    } catch (uploadError) {
      console.error("[Concert Memories] Upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Error al subir la imagen" },
        { status: 500 }
      );
    }

    const id = generateUUID();

    // Check if user is a trusted contributor for auto-approval
    const trustedStatus = await checkTrustedContributorForPhotos(submitterEmail, submitterInstagram);
    const isAutoApproved = trustedStatus?.autoApprove ?? false;
    const isAutoFeatured = trustedStatus?.autoFeature ?? false;

    const [memory] = await db
      .insert(concertMemories)
      .values({
        id,
        submitterName: submitterName.trim(),
        submitterEmail: submitterEmail?.trim() || null,
        submitterInstagram: submitterInstagram?.trim()?.replace("@", "") || null,
        eventId: eventId || null,
        eventName: eventName?.trim() || null,
        eventVenue: eventVenue?.trim() || null,
        eventCity: eventCity?.trim() || null,
        imageUrl,
        thumbnailUrl: imageUrl, // Same URL for now, could generate thumbnail
        caption: caption?.trim() || null,
        isApproved: isAutoApproved,
        isFeatured: isAutoFeatured,
        isHidden: false,
        moderatedAt: isAutoApproved ? new Date() : null,
      })
      .returning();

    console.log(`[Concert Memories] New submission: ${id} by ${submitterName} (auto-approved: ${isAutoApproved}, trusted: ${trustedStatus?.trusted ?? false})`);

    return NextResponse.json({
      success: true,
      data: memory,
      message: isAutoApproved
        ? "¡Gracias! Tu foto ya está publicada."
        : "Foto enviada. Será visible después de aprobación.",
      autoApproved: isAutoApproved,
    });
  } catch (error) {
    console.error("[Concert Memories] Error submitting:", error);
    return NextResponse.json(
      { success: false, error: "Error al enviar la foto" },
      { status: 500 }
    );
  }
}
