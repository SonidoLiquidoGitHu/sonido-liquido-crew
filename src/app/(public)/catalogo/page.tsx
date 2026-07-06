import { db } from "@/db/client";
import {
  artistExternalProfiles,
  artistGalleryAssets,
  artists,
  beats,
  events,
  galleryPhotos,
  playlists,
  releaseArtists,
  releases,
  videos,
  youtubeChannels,
} from "@/db/schema";
import { desc, eq, asc } from "drizzle-orm";
import { CatalogoClient } from "./CatalogoClient";

export const metadata = {
  title: "Catálogo | Sonido Líquido Crew",
  description:
    "El catálogo completo de Sonido Líquido Crew: artistas, discografía, videos, eventos, beats, playlists y galería. Busca, filtra y explora todo el colectivo en un solo lugar.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ===========================================
// DATA FETCHERS (return [] on error so page never crashes)
// ===========================================

async function safeQuery<T>(label: string, fn: () => Promise<T>): Promise<T | []> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[Catalogo] Failed to fetch ${label}:`, err);
    return [];
  }
}

// ===========================================
// PAGE
// ===========================================

export default async function CatalogoPage() {
  // Fetch all catalogue data in parallel. Each query is wrapped so a
  // failure in one (e.g., a missing table) doesn't crash the whole page.
  const [
    artistsData,
    artistsWithProfiles,
    releasesData,
    releaseArtistsData,
    videosData,
    eventsData,
    playlistsData,
    beatsData,
    galleryPhotosData,
    youtubeChannelsData,
  ] = await Promise.all([
    safeQuery("artists", () =>
      db
        .select()
        .from(artists)
        .where(eq(artists.isActive, true))
        .orderBy(asc(artists.name)),
    ),
    safeQuery("artists with profiles", async () => {
      const rows = await db
        .select({
          artist: artists,
          profile: artistExternalProfiles,
        })
        .from(artistExternalProfiles)
        .innerJoin(artists, eq(artistExternalProfiles.artistId, artists.id))
        .where(eq(artists.isActive, true));
      // Group profiles by artist
      const map = new Map<string, typeof artistExternalProfiles.$inferSelect[]>();
      for (const row of rows) {
        if (!map.has(row.artist.id)) map.set(row.artist.id, []);
        map.get(row.artist.id)?.push(row.profile);
      }
      return Array.from(map.entries()).map(([artistId, profiles]) => ({
        artistId,
        profiles,
      }));
    }),
    safeQuery("releases", () =>
      db.select().from(releases).orderBy(desc(releases.releaseDate)).limit(200),
    ),
    safeQuery("release-artists", () => db.select().from(releaseArtists)),
    safeQuery("videos", () =>
      db.select().from(videos).orderBy(desc(videos.publishedAt)).limit(200),
    ),
    safeQuery("events", () =>
      db.select().from(events).orderBy(desc(events.eventDate)).limit(100),
    ),
    safeQuery("playlists", () => db.select().from(playlists)),
    safeQuery("beats", () => db.select().from(beats).limit(100)),
    safeQuery("gallery-photos", () =>
      db
        .select()
        .from(galleryPhotos)
        .orderBy(desc(galleryPhotos.createdAt))
        .limit(60),
    ),
    safeQuery("youtube-channels", () =>
      db.select().from(youtubeChannels).where(eq(youtubeChannels.isActive, true)),
    ),
  ]);

  // Build release → artists map (so we can show artist names on release cards)
  const artistsById = new Map<string, (typeof artists.$inferSelect)>();
  for (const a of artistsData as (typeof artists.$inferSelect)[]) {
    artistsById.set(a.id, a);
  }
  const releaseArtistsMap = new Map<string, string[]>();
  for (const ra of releaseArtistsData as (typeof releaseArtists.$inferSelect)[]) {
    if (!releaseArtistsMap.has(ra.releaseId))
      releaseArtistsMap.set(ra.releaseId, []);
    const artistName = artistsById.get(ra.artistId)?.name;
    if (artistName) releaseArtistsMap.get(ra.releaseId)?.push(artistName);
  }

  // Build artist → profiles map
  const profilesByArtist = new Map<
    string,
    (typeof artistExternalProfiles.$inferSelect)[]
  >();
  for (const entry of artistsWithProfiles as {
    artistId: string;
    profiles: (typeof artistExternalProfiles.$inferSelect)[];
  }[]) {
    profilesByArtist.set(entry.artistId, entry.profiles);
  }

  // Build timeline (merge releases + events + video uploads, sorted by date desc)
  type TimelineItem = {
    id: string;
    type: "release" | "event" | "video";
    date: string | Date;
    title: string;
    subtitle?: string;
    imageUrl?: string | null;
    href: string;
  };
  const timeline: TimelineItem[] = [];

  for (const r of releasesData as (typeof releases.$inferSelect)[]) {
    timeline.push({
      id: `r-${r.id}`,
      type: "release",
      date: r.releaseDate,
      title: r.title,
      subtitle: [r.releaseType, (releaseArtistsMap.get(r.id) || []).join(", ")]
        .filter(Boolean)
        .join(" · "),
      imageUrl: r.coverImageUrl,
      href: `/discografia`,
    });
  }
  for (const e of eventsData as (typeof events.$inferSelect)[]) {
    timeline.push({
      id: `e-${e.id}`,
      type: "event",
      date: e.eventDate,
      title: e.title,
      subtitle: [e.venue, e.city, e.country].filter(Boolean).join(", "),
      imageUrl: e.imageUrl,
      href: `/eventos`,
    });
  }
  for (const v of videosData as (typeof videos.$inferSelect)[]) {
    if (!v.publishedAt) continue;
    timeline.push({
      id: `v-${v.id}`,
      type: "video",
      date: v.publishedAt,
      title: v.title,
      subtitle: v.description?.substring(0, 80) || undefined,
      imageUrl: v.thumbnailUrl,
      href: `/videos`,
    });
  }
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Stats
  const stats = {
    artists: (artistsData as unknown[]).length,
    releases: (releasesData as unknown[]).length,
    videos: (videosData as unknown[]).length,
    events: (eventsData as unknown[]).length,
    playlists: (playlistsData as unknown[]).length,
    beats: (beatsData as unknown[]).length,
    galleryPhotos: (galleryPhotosData as unknown[]).length,
    youtubeChannels: (youtubeChannelsData as unknown[]).length,
  };

  // Serialize for client component (Date → ISO string)
  const serialized = {
    stats,
    artists: (artistsData as (typeof artists.$inferSelect)[]).map((a) => ({
      ...a,
      profiles: profilesByArtist.get(a.id) || [],
      createdAt:
        a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
      updatedAt:
        a.updatedAt instanceof Date ? a.updatedAt.toISOString() : a.updatedAt,
    })),
    releases: (releasesData as (typeof releases.$inferSelect)[]).map((r) => ({
      ...r,
      artistNames: releaseArtistsMap.get(r.id) || [],
      releaseDate:
        r.releaseDate instanceof Date
          ? r.releaseDate.toISOString()
          : r.releaseDate,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      updatedAt:
        r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    })),
    videos: (videosData as (typeof videos.$inferSelect)[]).map((v) => ({
      ...v,
      publishedAt:
        v.publishedAt instanceof Date
          ? v.publishedAt.toISOString()
          : v.publishedAt,
      createdAt:
        v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
      updatedAt:
        v.updatedAt instanceof Date ? v.updatedAt.toISOString() : v.updatedAt,
    })),
    events: (eventsData as (typeof events.$inferSelect)[]).map((e) => ({
      ...e,
      eventDate:
        e.eventDate instanceof Date ? e.eventDate.toISOString() : e.eventDate,
      createdAt:
        e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
      updatedAt:
        e.updatedAt instanceof Date ? e.updatedAt.toISOString() : e.updatedAt,
    })),
    playlists: playlistsData as (typeof playlists.$inferSelect)[],
    beats: beatsData as (typeof beats.$inferSelect)[],
    galleryPhotos: (
      galleryPhotosData as (typeof galleryPhotos.$inferSelect)[]
    ).map((p) => ({
      ...p,
      createdAt:
        p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      updatedAt:
        p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
    })),
    youtubeChannels: youtubeChannelsData as (typeof youtubeChannels.$inferSelect)[],
    timeline: timeline.map((t) => ({
      ...t,
      date: t.date instanceof Date ? t.date.toISOString() : t.date,
    })),
  };

  return <CatalogoClient data={serialized} />;
}
