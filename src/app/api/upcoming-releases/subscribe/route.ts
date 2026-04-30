import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { presaveSubscribers, upcomingReleases } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// POST - Subscribe to a specific release's notifications
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Servicio no disponible" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { email, releaseId, releaseSlug } = body;

    if (!email || (!releaseId && !releaseSlug)) {
      return NextResponse.json(
        { success: false, error: "Email y release son requeridos" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Email inválido" },
        { status: 400 }
      );
    }

    // Find the release
    let release;
    if (releaseId) {
      [release] = await db
        .select()
        .from(upcomingReleases)
        .where(eq(upcomingReleases.id, releaseId))
        .limit(1);
    } else if (releaseSlug) {
      [release] = await db
        .select()
        .from(upcomingReleases)
        .where(eq(upcomingReleases.slug, releaseSlug))
        .limit(1);
    }

    if (!release) {
      return NextResponse.json(
        { success: false, error: "Lanzamiento no encontrado" },
        { status: 404 }
      );
    }

    // Check if release is still upcoming
    if (new Date(release.releaseDate) <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Este lanzamiento ya fue publicado" },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const [existing] = await db
      .select()
      .from(presaveSubscribers)
      .where(
        and(
          eq(presaveSubscribers.upcomingReleaseId, release.id),
          eq(presaveSubscribers.email, email.toLowerCase().trim())
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Ya estás suscrito a este lanzamiento",
        alreadySubscribed: true,
      });
    }

    // Create subscription
    const [subscriber] = await db
      .insert(presaveSubscribers)
      .values({
        id: generateUUID(),
        upcomingReleaseId: release.id,
        email: email.toLowerCase().trim(),
      })
      .returning();

    // Increment presave count on the release
    await db
      .update(upcomingReleases)
      .set({
        presaveCount: sql`${upcomingReleases.presaveCount} + 1`,
      })
      .where(eq(upcomingReleases.id, release.id));

    console.log(`[Release Subscribe] New subscription: ${email} for "${release.title}"`);

    return NextResponse.json({
      success: true,
      message: "¡Te notificaremos cuando salga!",
      data: {
        releaseTitle: release.title,
        releaseDate: release.releaseDate,
      },
    });
  } catch (error) {
    console.error("[Release Subscribe] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al suscribirse" },
      { status: 500 }
    );
  }
}

// GET - Check if email is subscribed to a release
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, subscribed: false });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const releaseId = searchParams.get("releaseId");

    if (!email || !releaseId) {
      return NextResponse.json(
        { success: false, error: "Email y releaseId son requeridos" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(presaveSubscribers)
      .where(
        and(
          eq(presaveSubscribers.upcomingReleaseId, releaseId),
          eq(presaveSubscribers.email, email.toLowerCase().trim())
        )
      )
      .limit(1);

    return NextResponse.json({
      success: true,
      subscribed: !!existing,
    });
  } catch (error) {
    console.error("[Release Subscribe] Error checking:", error);
    return NextResponse.json({ success: true, subscribed: false });
  }
}

// DELETE - Unsubscribe from a release
export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Servicio no disponible" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const releaseId = searchParams.get("releaseId");

    if (!email || !releaseId) {
      return NextResponse.json(
        { success: false, error: "Email y releaseId son requeridos" },
        { status: 400 }
      );
    }

    // Delete subscription
    const result = await db
      .delete(presaveSubscribers)
      .where(
        and(
          eq(presaveSubscribers.upcomingReleaseId, releaseId),
          eq(presaveSubscribers.email, email.toLowerCase().trim())
        )
      );

    // Decrement presave count
    await db
      .update(upcomingReleases)
      .set({
        presaveCount: sql`MAX(0, ${upcomingReleases.presaveCount} - 1)`,
      })
      .where(eq(upcomingReleases.id, releaseId));

    console.log(`[Release Subscribe] Unsubscribed: ${email} from ${releaseId}`);

    return NextResponse.json({
      success: true,
      message: "Suscripción cancelada",
    });
  } catch (error) {
    console.error("[Release Subscribe] Error unsubscribing:", error);
    return NextResponse.json(
      { success: false, error: "Error al cancelar suscripción" },
      { status: 500 }
    );
  }
}
