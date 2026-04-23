import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [
      artists,
      releases,
      beats,
      events,
      products,
      subscribers,
      videos,
      campaigns,
      galleryItems,
    ] = await Promise.all([
      db.artist.count(),
      db.release.count(),
      db.beat.count(),
      db.event.count(),
      db.product.count(),
      db.subscriber.count(),
      db.video.count(),
      db.campaign.count(),
      db.galleryItem.count(),
    ]);

    // Recent activity: last 5 created items across models
    const [recentReleases, recentBeats, recentEvents, recentSubscribers] =
      await Promise.all([
        db.release.findMany({
          take: 3,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            createdAt: true,
            artist: { select: { name: true } },
          },
        }),
        db.beat.findMany({
          take: 3,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            createdAt: true,
            artist: { select: { name: true } },
          },
        }),
        db.event.findMany({
          take: 3,
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, createdAt: true },
        }),
        db.subscriber.findMany({
          take: 3,
          orderBy: { createdAt: "desc" },
          select: { id: true, email: true, createdAt: true },
        }),
      ]);

    const recentActivity = [
      ...recentReleases.map((r) => ({
        type: "lanzamiento" as const,
        id: r.id,
        title: r.title,
        subtitle: r.artist.name,
        createdAt: r.createdAt,
      })),
      ...recentBeats.map((b) => ({
        type: "beat" as const,
        id: b.id,
        title: b.title,
        subtitle: b.artist.name,
        createdAt: b.createdAt,
      })),
      ...recentEvents.map((e) => ({
        type: "evento" as const,
        id: e.id,
        title: e.title,
        subtitle: null,
        createdAt: e.createdAt,
      })),
      ...recentSubscribers.map((s) => ({
        type: "suscriptor" as const,
        id: s.id,
        title: s.email,
        subtitle: null,
        createdAt: s.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return NextResponse.json({
      counts: {
        artists,
        releases,
        beats,
        events,
        products,
        subscribers,
        videos,
        campaigns,
        galleryItems,
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Error al obtener resumen del dashboard" },
      { status: 500 }
    );
  }
}
