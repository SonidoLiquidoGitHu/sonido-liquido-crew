// ===========================================
// CATALOGUE DATA FETCHER (shared)
// ===========================================
// Used by both:
//   - /catalogo (HTML UI, server component)
//   - /api/catalogue (JSON endpoint for AI agents)
//
// Both routes are gated behind CATALOGO_ACCESS_KEY (see lib/catalogue-auth.ts).
// The data fetcher itself is unauthenticated — the gate is enforced by the
// caller. This keeps the auth logic in one place.

import { db } from "@/db/client";
import {
  artistExternalProfiles,
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
import { asc, desc, eq } from "drizzle-orm";

// ===========================================
// TYPES (mirror what CatalogoClient expects)
// ===========================================

export type CatalogueArtist = ReturnType<typeof serializeArtist>;
export type CatalogueRelease = ReturnType<typeof serializeRelease>;
export type CatalogueVideo = ReturnType<typeof serializeVideo>;
export type CatalogueEvent = ReturnType<typeof serializeEvent>;
export type CataloguePlaylist = (typeof playlists.$inferSelect);
export type CatalogueBeat = (typeof beats.$inferSelect);
export type CataloguePhoto = ReturnType<typeof serializePhoto>;
export type CatalogueChannel = (typeof youtubeChannels.$inferSelect);
export type CatalogueTimelineItem = {
  id: string;
  type: "release" | "event" | "video";
  date: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  href: string;
};

export type CatalogueData = {
  stats: {
    artists: number;
    releases: number;
    videos: number;
    events: number;
    playlists: number;
    beats: number;
    galleryPhotos: number;
    youtubeChannels: number;
  };
  artists: CatalogueArtist[];
  releases: CatalogueRelease[];
  videos: CatalogueVideo[];
  events: CatalogueEvent[];
  playlists: CataloguePlaylist[];
  beats: CatalogueBeat[];
  galleryPhotos: CataloguePhoto[];
  youtubeChannels: CatalogueChannel[];
  timeline: CatalogueTimelineItem[];
  // Metadata about the fetch itself (useful for AI agents debugging)
  meta: {
    generatedAt: string;
    source: "sonido-liquido-crew";
    version: 1;
  };
};

// ===========================================
// HELPERS
// ===========================================

async function safeQuery<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T | []> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[Catalogue] Failed to fetch ${label}:`, err);
    return [];
  }
}

function toISO(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  return d;
}

function serializeArtist(
  a: typeof artists.$inferSelect,
  profiles: (typeof artistExternalProfiles.$inferSelect)[],
) {
  return {
    ...a,
    profiles,
    createdAt: toISO(a.createdAt) as string,
    updatedAt: toISO(a.updatedAt) as string,
  };
}

function serializeRelease(
  r: typeof releases.$inferSelect,
  artistNames: string[],
) {
  return {
    ...r,
    artistNames,
    releaseDate: toISO(r.releaseDate) as string,
    createdAt: toISO(r.createdAt) as string,
    updatedAt: toISO(r.updatedAt) as string,
  };
}

function serializeVideo(v: typeof videos.$inferSelect) {
  return {
    ...v,
    publishedAt: toISO(v.publishedAt),
    createdAt: toISO(v.createdAt) as string,
    updatedAt: toISO(v.updatedAt) as string,
  };
}

function serializeEvent(e: typeof events.$inferSelect) {
  return {
    ...e,
    eventDate: toISO(e.eventDate) as string,
    createdAt: toISO(e.createdAt) as string,
    updatedAt: toISO(e.updatedAt) as string,
  };
}

function serializePhoto(p: typeof galleryPhotos.$inferSelect) {
  return {
    ...p,
    createdAt: toISO(p.createdAt) as string,
    updatedAt: toISO(p.updatedAt) as string,
  };
}

// ===========================================
// MAIN FETCHER
// ===========================================

/**
 * Fetch the complete catalogue from the database.
 *
 * All queries run in parallel; each is wrapped in safeQuery so a failure
 * in one table (e.g., a missing migration) returns an empty array instead
 * of crashing the whole response.
 */
export async function fetchCatalogueData(): Promise<CatalogueData> {
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
      const map = new Map<
        string,
        (typeof artistExternalProfiles.$inferSelect)[]
      >();
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

  // Build release → artists name map
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

  // Build unified timeline
  const timeline: CatalogueTimelineItem[] = [];

  for (const r of releasesData as (typeof releases.$inferSelect)[]) {
    timeline.push({
      id: `r-${r.id}`,
      type: "release",
      date: (toISO(r.releaseDate) as string) || new Date(0).toISOString(),
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
      date: (toISO(e.eventDate) as string) || new Date(0).toISOString(),
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
      date: (toISO(v.publishedAt) as string) || new Date(0).toISOString(),
      title: v.title,
      subtitle: v.description?.substring(0, 80) || undefined,
      imageUrl: v.thumbnailUrl,
      href: `/videos`,
    });
  }
  timeline.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return {
    stats: {
      artists: (artistsData as unknown[]).length,
      releases: (releasesData as unknown[]).length,
      videos: (videosData as unknown[]).length,
      events: (eventsData as unknown[]).length,
      playlists: (playlistsData as unknown[]).length,
      beats: (beatsData as unknown[]).length,
      galleryPhotos: (galleryPhotosData as unknown[]).length,
      youtubeChannels: (youtubeChannelsData as unknown[]).length,
    },
    artists: (artistsData as (typeof artists.$inferSelect)[]).map((a) =>
      serializeArtist(a, profilesByArtist.get(a.id) || []),
    ),
    releases: (releasesData as (typeof releases.$inferSelect)[]).map((r) =>
      serializeRelease(r, releaseArtistsMap.get(r.id) || []),
    ),
    videos: (videosData as (typeof videos.$inferSelect)[]).map(serializeVideo),
    events: (eventsData as (typeof events.$inferSelect)[]).map(serializeEvent),
    playlists: playlistsData as CataloguePlaylist[],
    beats: beatsData as CatalogueBeat[],
    galleryPhotos: (
      galleryPhotosData as (typeof galleryPhotos.$inferSelect)[]
    ).map(serializePhoto),
    youtubeChannels: youtubeChannelsData as CatalogueChannel[],
    timeline,
    meta: {
      generatedAt: new Date().toISOString(),
      source: "sonido-liquido-crew",
      version: 1 as const,
    },
  };
}
