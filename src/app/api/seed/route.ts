import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "../../../lib/db";
export const dynamic = "force-dynamic";
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
export async function POST() {
  try {
    // Initialize database tables
    await initializeDatabase();
    const db = await getClient();
    // Clear existing data to avoid duplicates
    await db.execute("DELETE FROM artists");
    await db.execute("DELETE FROM releases");
    await db.execute("DELETE FROM videos");
    await db.execute("DELETE FROM events");
    // Seed sample artists
    const artists = [
      {
        id: generateId(),
        name: "DJ Sonido",
        display_name: "DJ Sonido",
        slug: "dj-sonido",
        role: "DJ / Producer",
        profile_image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
        spotify_url: "https://open.spotify.com",
        youtube_url: "https://youtube.com",
        instagram_url: "https://instagram.com",
        sort_order: 1,
        is_active: 1,
      },
      {
        id: generateId(),
        name: "MC Líquido",
        display_name: "MC Líquido",
        slug: "mc-liquido",
        role: "MC / Rapper",
        profile_image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
        spotify_url: "https://open.spotify.com",
        youtube_url: "https://youtube.com",
        instagram_url: "https://instagram.com",
        sort_order: 2,
        is_active: 1,
      },
      {
        id: generateId(),
        name: "Beatmaker Flow",
        display_name: "Beatmaker Flow",
        slug: "beatmaker-flow",
        role: "Producer",
        profile_image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
        spotify_url: "https://open.spotify.com",
        sort_order: 3,
        is_active: 1,
      },
    ];
    for (const artist of artists) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO artists (id, name, display_name, slug, role, profile_image_url, spotify_url, youtube_url, instagram_url, sort_order, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          artist.id,
          artist.name,
          artist.display_name,
          artist.slug,
          artist.role,
          artist.profile_image_url,
          artist.spotify_url,
          artist.youtube_url || null,
          artist.instagram_url || null,
          artist.sort_order,
          artist.is_active,
        ],
      });
    }
    // Seed sample releases
    const releases = [
      {
        id: generateId(),
        title: "Ondas Nocturnas",
        title_en: "Night Waves",
        slug: "ondas-nocturnas",
        release_type: "album",
        release_date: "2024-03-15",
        cover_image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop",
        spotify_url: "https://open.spotify.com",
        artist_name: "DJ Sonido",
        description_es: "Un viaje sonoro a través de las noches de la ciudad.",
        description_en: "A sonic journey through city nights.",
        is_published: 1,
      },
      {
        id: generateId(),
        title: "Flujo Urbano",
        title_en: "Urban Flow",
        slug: "flujo-urbano",
        release_type: "ep",
        release_date: "2024-02-01",
        cover_image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=600&fit=crop",
        spotify_url: "https://open.spotify.com",
        artist_name: "MC Líquido",
        description_es: "Ritmos que capturan la esencia de las calles.",
        description_en: "Rhythms that capture the essence of the streets.",
        is_published: 1,
      },
      {
        id: generateId(),
        title: "Momentos",
        title_en: "Moments",
        slug: "momentos",
        release_type: "single",
        release_date: "2024-01-20",
        cover_image_url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&h=600&fit=crop",
        spotify_url: "https://open.spotify.com",
        artist_name: "Beatmaker Flow",
        description_es: "Melodías que cuentan historias.",
        description_en: "Melodies that tell stories.",
        is_published: 1,
      },
    ];
    for (const release of releases) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO releases (id, title, title_en, slug, release_type, release_date, cover_image_url, spotify_url, artist_name, description_es, description_en, is_published)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          release.id,
          release.title,
          release.title_en,
          release.slug,
          release.release_type,
          release.release_date,
          release.cover_image_url,
          release.spotify_url,
          release.artist_name,
          release.description_es,
          release.description_en,
          release.is_published,
        ],
      });
    }
    // Seed sample videos
    const videos = [
      {
        id: generateId(),
        youtube_id: "dQw4w9WgXcQ",
        title: "Ondas Nocturnas - Video Oficial",
        artist_name: "DJ Sonido",
        thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        duration_seconds: 212,
        is_published: 1,
      },
      {
        id: generateId(),
        youtube_id: "jNQXAC9IVRw",
        title: "Flujo Urbano - Videoclip",
        artist_name: "MC Líquido",
        thumbnail_url: "https://i.ytimg.com/vi/jNQXAC9IVRw/maxresdefault.jpg",
        duration_seconds: 180,
        is_published: 1,
      },
    ];
    for (const video of videos) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO videos (id, youtube_id, title, artist_name, thumbnail_url, duration_seconds, is_published)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          video.id,
          video.youtube_id,
          video.title,
          video.artist_name,
          video.thumbnail_url,
          video.duration_seconds,
          video.is_published,
        ],
      });
    }
    // Seed sample events
    const events = [
      {
        id: generateId(),
        title: "Sonido Líquido Live",
        venue: "Club Nocturno",
        city: "CDMX",
        event_date: "2026-04-15",
        event_time: "22:00",
        ticket_url: "https://tickets.example.com",
        is_published: 1,
      },
      {
        id: generateId(),
        title: "Festival Urbano 2026",
        venue: "Arena Central",
        city: "Guadalajara",
        event_date: "2026-05-20",
        event_time: "18:00",
        ticket_url: "https://tickets.example.com",
        is_published: 1,
      },
    ];
    for (const event of events) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO events (id, title, venue, city, event_date, event_time, ticket_url, is_published)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          event.id,
          event.title,
          event.venue,
          event.city,
          event.event_date,
          event.event_time,
          event.ticket_url,
          event.is_published,
        ],
      });
    }
    // Initialize newsletter settings
    await db.execute({
      sql: `INSERT OR REPLACE INTO newsletter_settings (id, popup_title, popup_description)
            VALUES (?, ?, ?)`,
      args: [
        "default",
        "¡Únete a la familia!",
        "Recibe las últimas noticias, lanzamientos exclusivos y acceso anticipado a eventos.",
      ],
    });
    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      data: {
        artists: artists.length,
        releases: releases.length,
        videos: videos.length,
        events: events.length,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
export async function GET() {
  return NextResponse.json({
    message: "Use POST to seed the database",
    endpoint: "/api/seed",
  });
}
