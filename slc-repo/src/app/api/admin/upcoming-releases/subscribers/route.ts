import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { presaveSubscribers, upcomingReleases } from "@/db/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// GET - List subscribers for an upcoming release or all
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [], stats: {} });
    }

    const { searchParams } = new URL(request.url);
    const releaseId = searchParams.get("releaseId");
    const stats = searchParams.get("stats") === "true";

    // If requesting stats only
    if (stats) {
      // Get subscriber counts per release
      const releasesWithCounts = await db
        .select({
          id: upcomingReleases.id,
          title: upcomingReleases.title,
          artistName: upcomingReleases.artistName,
          releaseDate: upcomingReleases.releaseDate,
          presaveCount: upcomingReleases.presaveCount,
          viewCount: upcomingReleases.viewCount,
          isActive: upcomingReleases.isActive,
          coverImageUrl: upcomingReleases.coverImageUrl,
        })
        .from(upcomingReleases)
        .orderBy(desc(upcomingReleases.presaveCount))
        .limit(10);

      // Get total subscribers count
      const [totalResult] = await db
        .select({ count: count() })
        .from(presaveSubscribers);

      // Get recent subscribers
      const recentSubscribers = await db
        .select({
          id: presaveSubscribers.id,
          email: presaveSubscribers.email,
          subscribedAt: presaveSubscribers.subscribedAt,
          notified: presaveSubscribers.notified,
          releaseTitle: upcomingReleases.title,
          releaseId: upcomingReleases.id,
        })
        .from(presaveSubscribers)
        .leftJoin(upcomingReleases, eq(presaveSubscribers.upcomingReleaseId, upcomingReleases.id))
        .orderBy(desc(presaveSubscribers.subscribedAt))
        .limit(20);

      // Calculate conversion rate
      const [viewsResult] = await db
        .select({ totalViews: sql<number>`SUM(${upcomingReleases.viewCount})` })
        .from(upcomingReleases);

      const totalSubscribers = totalResult?.count || 0;
      const totalViews = viewsResult?.totalViews || 0;
      const conversionRate = totalViews > 0 ? ((totalSubscribers / totalViews) * 100).toFixed(2) : "0";

      return NextResponse.json({
        success: true,
        data: {
          topReleases: releasesWithCounts,
          recentSubscribers,
          totalSubscribers,
          totalViews,
          conversionRate,
        },
      });
    }

    // Get subscribers for specific release
    if (releaseId) {
      const subscribers = await db
        .select()
        .from(presaveSubscribers)
        .where(eq(presaveSubscribers.upcomingReleaseId, releaseId))
        .orderBy(desc(presaveSubscribers.subscribedAt));

      return NextResponse.json({
        success: true,
        data: subscribers,
        count: subscribers.length,
      });
    }

    // Get all subscribers grouped by release
    const allSubscribers = await db
      .select({
        id: presaveSubscribers.id,
        email: presaveSubscribers.email,
        subscribedAt: presaveSubscribers.subscribedAt,
        notified: presaveSubscribers.notified,
        releaseId: presaveSubscribers.upcomingReleaseId,
        releaseTitle: upcomingReleases.title,
        artistName: upcomingReleases.artistName,
      })
      .from(presaveSubscribers)
      .leftJoin(upcomingReleases, eq(presaveSubscribers.upcomingReleaseId, upcomingReleases.id))
      .orderBy(desc(presaveSubscribers.subscribedAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      data: allSubscribers,
    });
  } catch (error) {
    console.error("[Presave Subscribers] Error fetching:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar suscriptores" },
      { status: 500 }
    );
  }
}

// POST - Mark subscribers as notified or export list
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action, releaseId, subscriberIds } = body;

    if (action === "mark_notified" && releaseId) {
      // Mark all subscribers for a release as notified
      await db
        .update(presaveSubscribers)
        .set({ notified: true })
        .where(eq(presaveSubscribers.upcomingReleaseId, releaseId));

      console.log(`[Presave Subscribers] Marked all as notified for release: ${releaseId}`);

      return NextResponse.json({
        success: true,
        message: "Suscriptores marcados como notificados",
      });
    }

    if (action === "mark_notified" && subscriberIds && Array.isArray(subscriberIds)) {
      // Mark specific subscribers as notified
      for (const id of subscriberIds) {
        await db
          .update(presaveSubscribers)
          .set({ notified: true })
          .where(eq(presaveSubscribers.id, id));
      }

      console.log(`[Presave Subscribers] Marked ${subscriberIds.length} as notified`);

      return NextResponse.json({
        success: true,
        message: `${subscriberIds.length} suscriptores marcados como notificados`,
      });
    }

    if (action === "export" && releaseId) {
      // Export subscriber emails for a release
      const subscribers = await db
        .select({ email: presaveSubscribers.email })
        .from(presaveSubscribers)
        .where(eq(presaveSubscribers.upcomingReleaseId, releaseId));

      const emails = subscribers.map((s) => s.email);

      return NextResponse.json({
        success: true,
        data: {
          emails,
          count: emails.length,
          csv: emails.join("\n"),
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Acción no válida" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Presave Subscribers] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a subscriber
export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de suscriptor requerido" },
        { status: 400 }
      );
    }

    await db.delete(presaveSubscribers).where(eq(presaveSubscribers.id, id));

    console.log(`[Presave Subscribers] Deleted: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Presave Subscribers] Error deleting:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar suscriptor" },
      { status: 500 }
    );
  }
}
