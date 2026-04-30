import { db } from "@/db/client";
import {
  releases,
  releaseArtists,
  artists,
  type Release,
  type NewRelease,
} from "@/db/schema";
import { eq, and, desc, asc, gte, lte, sql, like } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

// ===========================================
// RELEASES REPOSITORY
// ===========================================

export const releasesRepository = {
  /**
   * Get all releases
   */
  async findAll(options: {
    type?: Release["releaseType"];
    artistId?: string;
    year?: number;
    isUpcoming?: boolean;
    isFeatured?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<Release[]> {
    const conditions = [];

    if (options.type) {
      conditions.push(eq(releases.releaseType, options.type));
    }
    if (options.isUpcoming !== undefined) {
      conditions.push(eq(releases.isUpcoming, options.isUpcoming));
    }
    if (options.isFeatured) {
      conditions.push(eq(releases.isFeatured, true));
    }
    if (options.year) {
      const startDate = new Date(options.year, 0, 1);
      const endDate = new Date(options.year, 11, 31);
      conditions.push(
        gte(releases.releaseDate, startDate),
        lte(releases.releaseDate, endDate)
      );
    }

    let query = db
      .select()
      .from(releases)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(releases.releaseDate));

    if (options.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    if (options.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    // If filtering by artist, join with releaseArtists
    if (options.artistId) {
      return db
        .select({ release: releases })
        .from(releaseArtists)
        .innerJoin(releases, eq(releaseArtists.releaseId, releases.id))
        .where(eq(releaseArtists.artistId, options.artistId))
        .orderBy(desc(releases.releaseDate))
        .then((results) => results.map((r) => r.release));
    }

    return query;
  },

  /**
   * Get release by ID
   */
  async findById(id: string): Promise<Release | null> {
    const [release] = await db
      .select()
      .from(releases)
      .where(eq(releases.id, id))
      .limit(1);

    return release || null;
  },

  /**
   * Get release by slug
   */
  async findBySlug(slug: string): Promise<Release | null> {
    const [release] = await db
      .select()
      .from(releases)
      .where(eq(releases.slug, slug))
      .limit(1);

    return release || null;
  },

  /**
   * Get release with artists
   */
  async findBySlugWithArtists(slug: string) {
    const release = await this.findBySlug(slug);
    if (!release) return null;

    const releaseArtistsData = await db
      .select({
        artist: artists,
        isPrimary: releaseArtists.isPrimary,
      })
      .from(releaseArtists)
      .innerJoin(artists, eq(releaseArtists.artistId, artists.id))
      .where(eq(releaseArtists.releaseId, release.id));

    const primaryArtist = releaseArtistsData.find((ra) => ra.isPrimary)?.artist || null;

    return {
      ...release,
      artists: releaseArtistsData.map((ra) => ra.artist),
      primaryArtist,
    };
  },

  /**
   * Get upcoming releases
   */
  async findUpcoming(limit = 5): Promise<Release[]> {
    const now = new Date();
    return db
      .select()
      .from(releases)
      .where(and(
        eq(releases.isUpcoming, true),
        gte(releases.releaseDate, now)
      ))
      .orderBy(asc(releases.releaseDate))
      .limit(limit);
  },

  /**
   * Get next upcoming release (for countdown)
   */
  async findNextUpcoming(): Promise<Release | null> {
    const [release] = await this.findUpcoming(1);
    return release || null;
  },

  /**
   * Get featured releases
   */
  async findFeatured(limit = 10): Promise<Release[]> {
    return db
      .select()
      .from(releases)
      .where(eq(releases.isFeatured, true))
      .orderBy(desc(releases.releaseDate))
      .limit(limit);
  },

  /**
   * Get latest releases
   */
  async findLatest(limit = 10): Promise<Release[]> {
    return db
      .select()
      .from(releases)
      .orderBy(desc(releases.releaseDate))
      .limit(limit);
  },

  /**
   * Search releases
   */
  async search(query: string, limit = 10): Promise<Release[]> {
    return db
      .select()
      .from(releases)
      .where(like(releases.title, `%${query}%`))
      .orderBy(desc(releases.releaseDate))
      .limit(limit);
  },

  /**
   * Count releases
   */
  async count(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(releases);

    return result?.count || 0;
  },

  /**
   * Get releases per year
   */
  async countByYear(): Promise<{ year: number; count: number }[]> {
    const results = await db
      .select({
        year: sql<number>`strftime('%Y', releases.release_date, 'unixepoch')`,
        count: sql<number>`count(*)`,
      })
      .from(releases)
      .groupBy(sql`strftime('%Y', releases.release_date, 'unixepoch')`)
      .orderBy(desc(sql`strftime('%Y', releases.release_date, 'unixepoch')`));

    return results.map((r) => ({
      year: Number(r.year),
      count: r.count,
    }));
  },

  /**
   * Get releases per artist
   */
  async countByArtist(): Promise<{ artistId: string; artistName: string; count: number }[]> {
    const results = await db
      .select({
        artistId: artists.id,
        artistName: artists.name,
        count: sql<number>`count(*)`,
      })
      .from(releaseArtists)
      .innerJoin(artists, eq(releaseArtists.artistId, artists.id))
      .groupBy(artists.id, artists.name)
      .orderBy(desc(sql`count(*)`));

    return results;
  },

  /**
   * Create release
   */
  async create(
    data: Omit<NewRelease, "id" | "createdAt" | "updatedAt">,
    artistIds: string[],
    primaryArtistId?: string
  ): Promise<Release> {
    const id = generateUUID();
    const slug = data.slug || slugify(data.title);

    const [release] = await db
      .insert(releases)
      .values({
        ...data,
        id,
        slug,
      })
      .returning();

    // Add artist associations
    if (artistIds.length > 0) {
      await db.insert(releaseArtists).values(
        artistIds.map((artistId) => ({
          id: generateUUID(),
          releaseId: id,
          artistId,
          isPrimary: artistId === primaryArtistId,
        }))
      );
    }

    return release;
  },

  /**
   * Update release
   */
  async update(id: string, data: Partial<NewRelease>): Promise<Release | null> {
    const [release] = await db
      .update(releases)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(releases.id, id))
      .returning();

    return release || null;
  },

  /**
   * Delete release
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(releases)
      .where(eq(releases.id, id));

    return (result.rowsAffected ?? 0) > 0;
  },

  /**
   * Find by Spotify ID
   */
  async findBySpotifyId(spotifyId: string): Promise<Release | null> {
    const [release] = await db
      .select()
      .from(releases)
      .where(eq(releases.spotifyId, spotifyId))
      .limit(1);

    return release || null;
  },
};
