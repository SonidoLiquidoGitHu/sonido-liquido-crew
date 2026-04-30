import { db } from "@/db/client";
import {
  artists,
  artistExternalProfiles,
  artistGalleryAssets,
  releaseArtists,
  releases,
  type Artist,
  type NewArtist,
  type ArtistExternalProfile,
  type NewArtistExternalProfile,
} from "@/db/schema";
import { eq, and, desc, asc, like, sql } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

// ===========================================
// ARTISTS REPOSITORY
// ===========================================

export const artistsRepository = {
  /**
   * Get all artists
   */
  async findAll(options: {
    onlyActive?: boolean;
    onlyFeatured?: boolean;
    role?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Artist[]> {
    const conditions = [];

    if (options.onlyActive !== false) {
      conditions.push(eq(artists.isActive, true));
    }
    if (options.onlyFeatured) {
      conditions.push(eq(artists.isFeatured, true));
    }
    if (options.role) {
      conditions.push(eq(artists.role, options.role as Artist["role"]));
    }

    let query = db
      .select()
      .from(artists)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(artists.sortOrder), asc(artists.name));

    if (options.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    if (options.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    return query;
  },

  /**
   * Get artist by ID
   */
  async findById(id: string): Promise<Artist | null> {
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, id))
      .limit(1);

    return artist || null;
  },

  /**
   * Get artist by slug
   */
  async findBySlug(slug: string): Promise<Artist | null> {
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    return artist || null;
  },

  /**
   * Get artist with all related data
   */
  async findBySlugWithDetails(slug: string) {
    const artist = await this.findBySlug(slug);
    if (!artist) return null;

    const [externalProfiles, galleryAssets, artistReleases] = await Promise.all([
      db
        .select()
        .from(artistExternalProfiles)
        .where(eq(artistExternalProfiles.artistId, artist.id)),
      db
        .select()
        .from(artistGalleryAssets)
        .where(eq(artistGalleryAssets.artistId, artist.id))
        .orderBy(asc(artistGalleryAssets.sortOrder)),
      db
        .select({
          release: releases,
        })
        .from(releaseArtists)
        .innerJoin(releases, eq(releaseArtists.releaseId, releases.id))
        .where(eq(releaseArtists.artistId, artist.id))
        .orderBy(desc(releases.releaseDate)),
    ]);

    return {
      ...artist,
      externalProfiles,
      galleryAssets,
      releases: artistReleases.map((r) => r.release),
      releaseCount: artistReleases.length,
    };
  },

  /**
   * Search artists by name
   */
  async search(query: string, limit = 10): Promise<Artist[]> {
    return db
      .select()
      .from(artists)
      .where(and(
        eq(artists.isActive, true),
        like(artists.name, `%${query}%`)
      ))
      .orderBy(asc(artists.name))
      .limit(limit);
  },

  /**
   * Get artists with identity conflicts
   */
  async findWithConflicts(): Promise<Artist[]> {
    return db
      .select()
      .from(artists)
      .where(eq(artists.identityConflictFlag, true))
      .orderBy(asc(artists.name));
  },

  /**
   * Get featured artists
   */
  async findFeatured(limit = 5): Promise<Artist[]> {
    return db
      .select()
      .from(artists)
      .where(and(
        eq(artists.isActive, true),
        eq(artists.isFeatured, true)
      ))
      .orderBy(asc(artists.sortOrder))
      .limit(limit);
  },

  /**
   * Count artists
   */
  async count(onlyActive = true): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(artists)
      .where(onlyActive ? eq(artists.isActive, true) : undefined);

    return result?.count || 0;
  },

  /**
   * Create artist
   */
  async create(data: Omit<NewArtist, "id" | "slug" | "createdAt" | "updatedAt"> & { slug?: string }): Promise<Artist> {
    const id = generateUUID();
    const slug = data.slug || slugify(data.name);

    const [artist] = await db
      .insert(artists)
      .values({
        ...data,
        id,
        slug,
      })
      .returning();

    return artist;
  },

  /**
   * Update artist
   */
  async update(id: string, data: Partial<NewArtist>): Promise<Artist | null> {
    const [artist] = await db
      .update(artists)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, id))
      .returning();

    return artist || null;
  },

  /**
   * Delete artist
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(artists)
      .where(eq(artists.id, id));

    return (result.rowsAffected ?? 0) > 0;
  },

  /**
   * Add external profile
   */
  async addExternalProfile(
    data: Omit<NewArtistExternalProfile, "id" | "createdAt" | "updatedAt">
  ): Promise<ArtistExternalProfile> {
    const [profile] = await db
      .insert(artistExternalProfiles)
      .values({
        ...data,
        id: generateUUID(),
      })
      .returning();

    return profile;
  },

  /**
   * Get external profiles for artist
   */
  async getExternalProfiles(artistId: string): Promise<ArtistExternalProfile[]> {
    return db
      .select()
      .from(artistExternalProfiles)
      .where(eq(artistExternalProfiles.artistId, artistId));
  },

  /**
   * Update external profile
   */
  async updateExternalProfile(
    id: string,
    data: Partial<NewArtistExternalProfile>
  ): Promise<ArtistExternalProfile | null> {
    const [profile] = await db
      .update(artistExternalProfiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(artistExternalProfiles.id, id))
      .returning();

    return profile || null;
  },

  /**
   * Delete external profile
   */
  async deleteExternalProfile(id: string): Promise<boolean> {
    const result = await db
      .delete(artistExternalProfiles)
      .where(eq(artistExternalProfiles.id, id));

    return (result.rowsAffected ?? 0) > 0;
  },

  /**
   * Find artist by Spotify ID
   */
  async findBySpotifyId(spotifyId: string): Promise<Artist | null> {
    const [result] = await db
      .select({ artist: artists })
      .from(artistExternalProfiles)
      .innerJoin(artists, eq(artistExternalProfiles.artistId, artists.id))
      .where(and(
        eq(artistExternalProfiles.platform, "spotify"),
        eq(artistExternalProfiles.externalId, spotifyId)
      ))
      .limit(1);

    return result?.artist || null;
  },
};
