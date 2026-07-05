import { db, isDatabaseConfigured } from "@/db/client";
import {
  type NewRelease,
  type Release,
  artists,
  releaseArtists,
  releases,
  upcomingReleases,
} from "@/db/schema";
import { generateUUID, slugify } from "@/lib/utils";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  like,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";

// ===========================================
// RELEASES REPOSITORY
// ===========================================

export const releasesRepository = {
  /**
   * Get all releases
   */
  async findAll(
    options: {
      type?: Release["releaseType"];
      artistId?: string;
      year?: number;
      isUpcoming?: boolean;
      isFeatured?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<Release[]> {
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
        lte(releases.releaseDate, endDate),
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

    const primaryArtist =
      releaseArtistsData.find((ra) => ra.isPrimary)?.artist || null;

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
      .where(and(eq(releases.isUpcoming, true), gte(releases.releaseDate, now)))
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
   * Get latest releases (excludes upcoming/unreleased)
   */
  async findLatest(limit = 10): Promise<Release[]> {
    return db
      .select()
      .from(releases)
      .where(eq(releases.isUpcoming, false))
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
  async countByArtist(): Promise<
    { artistId: string; artistName: string; count: number }[]
  > {
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
    primaryArtistId?: string,
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
        })),
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
    const result = await db.delete(releases).where(eq(releases.id, id));

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

  /**
   * Auto-convert upcoming_releases whose releaseDate has passed
   * into the releases table so they appear in discografía.
   * Returns count of newly converted releases.
   */
  async autoConvertUpcomingReleases(): Promise<{
    converted: number;
    fixed: number;
  }> {
    if (!isDatabaseConfigured()) return { converted: 0, fixed: 0 };

    const now = new Date();
    let converted = 0;
    let fixed = 0;

    try {
      // 1. Find active upcoming releases whose date has passed and aren't yet converted
      const pastDue = await db
        .select()
        .from(upcomingReleases)
        .where(
          and(
            eq(upcomingReleases.isActive, true),
            lt(upcomingReleases.releaseDate, now),
            sql`${upcomingReleases.releasedReleaseId} IS NULL`,
          ),
        );

      for (const upcoming of pastDue) {
        try {
          // Check if a release with same slug already exists (e.g. from Spotify sync)
          const [existing] = await db
            .select()
            .from(releases)
            .where(eq(releases.slug, upcoming.slug))
            .limit(1);

          if (existing) {
            // Link the upcoming release to the existing one
            // Also sync releaseType from the releases table to keep them consistent
            await db
              .update(upcomingReleases)
              .set({
                releasedReleaseId: existing.id,
                releaseType:
                  existing.releaseType as typeof upcoming.releaseType,
                isActive: false,
                updatedAt: new Date(),
              })
              .where(eq(upcomingReleases.id, upcoming.id));
            converted++;
            continue;
          }

          // Also check by title match (in case slug differs)
          const [byTitle] = await db
            .select()
            .from(releases)
            .where(like(releases.title, `%${upcoming.title}%`))
            .limit(1);

          if (byTitle) {
            // Link and sync releaseType from the releases table to keep them consistent
            await db
              .update(upcomingReleases)
              .set({
                releasedReleaseId: byTitle.id,
                releaseType: byTitle.releaseType as typeof upcoming.releaseType,
                isActive: false,
                updatedAt: new Date(),
              })
              .where(eq(upcomingReleases.id, upcoming.id));
            converted++;
            continue;
          }

          // Create a new release from the upcoming release
          const releaseId = generateUUID();
          const releaseType = upcoming.releaseType as
            | "album"
            | "ep"
            | "single"
            | "maxi-single"
            | "compilation"
            | "mixtape";

          await db.insert(releases).values({
            id: releaseId,
            title: upcoming.title,
            slug: upcoming.slug,
            releaseType,
            releaseDate: upcoming.releaseDate,
            coverImageUrl: upcoming.coverImageUrl,
            description: upcoming.description,
            isUpcoming: false,
            isFeatured: upcoming.isFeatured,
          });

          // Try to find and link the artist by name
          const [matchedArtist] = await db
            .select()
            .from(artists)
            .where(
              or(
                eq(artists.name, upcoming.artistName),
                like(artists.name, `%${upcoming.artistName}%`),
              ),
            )
            .limit(1);

          if (matchedArtist) {
            await db.insert(releaseArtists).values({
              id: generateUUID(),
              releaseId,
              artistId: matchedArtist.id,
              isPrimary: true,
            });
          }

          // Handle featured artists
          if (upcoming.featuredArtists) {
            try {
              const featuredNames = JSON.parse(
                upcoming.featuredArtists,
              ) as string[];
              for (const featName of featuredNames) {
                const [featArtist] = await db
                  .select()
                  .from(artists)
                  .where(
                    or(
                      eq(artists.name, featName),
                      like(artists.name, `%${featName}%`),
                    ),
                  )
                  .limit(1);

                if (featArtist) {
                  const [existingLink] = await db
                    .select()
                    .from(releaseArtists)
                    .where(
                      and(
                        eq(releaseArtists.releaseId, releaseId),
                        eq(releaseArtists.artistId, featArtist.id),
                      ),
                    )
                    .limit(1);

                  if (!existingLink) {
                    await db.insert(releaseArtists).values({
                      id: generateUUID(),
                      releaseId,
                      artistId: featArtist.id,
                      isPrimary: false,
                    });
                  }
                }
              }
            } catch {
              /* featured artists JSON parse error, skip */
            }
          }

          // Mark the upcoming release as converted
          await db
            .update(upcomingReleases)
            .set({
              releasedReleaseId: releaseId,
              isActive: false,
              updatedAt: new Date(),
            })
            .where(eq(upcomingReleases.id, upcoming.id));

          converted++;
        } catch (err) {
          console.error(
            `[autoConvert] Failed to convert "${upcoming.title}":`,
            err,
          );
        }
      }

      // 2. Fix isUpcoming flags on releases whose dates have passed
      const staleUpcoming = await db
        .select({ id: releases.id })
        .from(releases)
        .where(
          and(eq(releases.isUpcoming, true), lt(releases.releaseDate, now)),
        );

      if (staleUpcoming.length > 0) {
        await db
          .update(releases)
          .set({ isUpcoming: false, updatedAt: new Date() })
          .where(
            and(eq(releases.isUpcoming, true), lt(releases.releaseDate, now)),
          );
        fixed = staleUpcoming.length;
      }

      // 3. Sync releaseType for already-linked upcoming releases where types differ
      // This handles cases where the releases table was corrected (e.g. via Spotify sync)
      // but the upcoming_releases table still has the old wrong type
      const linkedUpcoming = await db
        .select({
          upcomingId: upcomingReleases.id,
          upcomingType: upcomingReleases.releaseType,
          releasedReleaseId: upcomingReleases.releasedReleaseId,
        })
        .from(upcomingReleases)
        .where(isNotNull(upcomingReleases.releasedReleaseId));

      let typeSynced = 0;
      for (const linked of linkedUpcoming) {
        try {
          const [linkedRelease] = await db
            .select({ releaseType: releases.releaseType })
            .from(releases)
            .where(eq(releases.id, linked.releasedReleaseId as unknown as string))
            .limit(1);

          if (
            linkedRelease &&
            linkedRelease.releaseType !== linked.upcomingType
          ) {
            await db
              .update(upcomingReleases)
              .set({
                releaseType:
                  linkedRelease.releaseType as typeof upcomingReleases.$inferInsert.releaseType,
                updatedAt: new Date(),
              })
              .where(eq(upcomingReleases.id, linked.upcomingId));
            typeSynced++;
            console.log(
              `[autoConvert] Synced releaseType for "${linked.upcomingId}": ${linked.upcomingType} → ${linkedRelease.releaseType}`,
            );
          }
        } catch {
          /* non-critical */
        }
      }

      // 4. Sync releaseType for active upcoming releases that have a match in releases table
      // (e.g. Spotify sync created the release before the upcoming was converted)
      const activeUpcoming = await db
        .select()
        .from(upcomingReleases)
        .where(eq(upcomingReleases.isActive, true));

      for (const active of activeUpcoming) {
        try {
          // Check by slug match
          const [matchBySlug] = await db
            .select({ id: releases.id, releaseType: releases.releaseType })
            .from(releases)
            .where(eq(releases.slug, active.slug))
            .limit(1);

          const match =
            matchBySlug ||
            (
              await db
                .select({ id: releases.id, releaseType: releases.releaseType })
                .from(releases)
                .where(like(releases.title, `%${active.title}%`))
                .limit(1)
            )[0];

          if (match && match.releaseType !== active.releaseType) {
            await db
              .update(upcomingReleases)
              .set({
                releaseType:
                  match.releaseType as typeof upcomingReleases.$inferInsert.releaseType,
                updatedAt: new Date(),
              })
              .where(eq(upcomingReleases.id, active.id));
            typeSynced++;
            console.log(
              `[autoConvert] Synced active upcoming releaseType for "${active.title}": ${active.releaseType} → ${match.releaseType}`,
            );
          }
        } catch {
          /* non-critical */
        }
      }

      if (converted > 0 || fixed > 0 || typeSynced > 0) {
        console.log(
          `[autoConvert] Converted ${converted} upcoming → releases, fixed ${fixed} isUpcoming flags, synced ${typeSynced} releaseTypes`,
        );
      }

      // 5. Deduplicate releases whose titles differ only by minor variations
      // (e.g. "y" vs "&", accented vs unaccented). Keeps the one with a
      // spotifyId (Spotify-synced version) and deletes the manual duplicate.
      let deduped = 0;
      try {
        const allReleases = await db
          .select({
            id: releases.id,
            title: releases.title,
            slug: releases.slug,
            spotifyId: releases.spotifyId,
          })
          .from(releases);

        // Build a normalized-title map to find duplicates
        const normalize = (t: string) =>
          t
            .toLowerCase()
            .replace(/&/g, "y") // "Beats, Donas & Café" → "beats, donas y café"
            .replace(/\s+/g, " ") // collapse whitespace
            .normalize("NFD")
            .replace(/\p{M}/gu, "") // strip diacritics
            .trim();

        const byNormTitle = new Map<string, typeof allReleases>();
        for (const r of allReleases) {
          const key = normalize(r.title);
          if (!byNormTitle.has(key)) byNormTitle.set(key, []);
          byNormTitle.get(key)?.push(r);
        }

        for (const [, group] of byNormTitle) {
          if (group.length < 2) continue;

          // Prefer the one that has a spotifyId (Spotify-synced = canonical)
          // If both have spotifyId, prefer the one with "&" in the title
          const keep = group.find((r) => r.spotifyId) || group[0];
          const toRemove = group.filter((r) => r.id !== keep.id);

          for (const dup of toRemove) {
            try {
              // Move any artist links from the duplicate to the keeper
              const dupLinks = await db
                .select()
                .from(releaseArtists)
                .where(eq(releaseArtists.releaseId, dup.id));

              for (const link of dupLinks) {
                // Check if this artist is already linked to the keeper
                const [existingLink] = await db
                  .select()
                  .from(releaseArtists)
                  .where(
                    and(
                      eq(releaseArtists.releaseId, keep.id),
                      eq(releaseArtists.artistId, link.artistId),
                    ),
                  )
                  .limit(1);

                if (!existingLink) {
                  await db
                    .update(releaseArtists)
                    .set({ releaseId: keep.id })
                    .where(eq(releaseArtists.id, link.id));
                } else {
                  await db
                    .delete(releaseArtists)
                    .where(eq(releaseArtists.id, link.id));
                }
              }

              // Also update any upcoming_releases pointing to the duplicate
              try {
                await db
                  .update(upcomingReleases)
                  .set({ releasedReleaseId: keep.id })
                  .where(eq(upcomingReleases.releasedReleaseId, dup.id));
              } catch {
                /* non-critical */
              }

              // Delete the duplicate release
              await db
                .delete(releaseArtists)
                .where(eq(releaseArtists.releaseId, dup.id));
              await db.delete(releases).where(eq(releases.id, dup.id));
              deduped++;
              console.log(
                `[autoConvert] Deduplicated: removed "${dup.title}" (keeping "${keep.title}")`,
              );
            } catch (dedupErr) {
              console.error(
                `[autoConvert] Failed to dedup "${dup.title}":`,
                dedupErr,
              );
            }
          }
        }
      } catch (dedupError) {
        console.error("[autoConvert] Deduplication error:", dedupError);
      }

      if (deduped > 0) {
        console.log(`[autoConvert] Removed ${deduped} duplicate release(s)`);
      }
    } catch (error) {
      console.error("[autoConvert] Error:", error);
    }

    return { converted, fixed };
  },
};
