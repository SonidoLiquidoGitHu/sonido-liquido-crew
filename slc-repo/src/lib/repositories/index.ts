import { db } from "@/db/client";
import {
  videos,
  events,
  products,
  orders,
  orderItems,
  subscribers,
  playlists,
  syncJobs,
  syncLogs,
  siteSettings,
  type Video,
  type NewVideo,
  type Event,
  type NewEvent,
  type Product,
  type NewProduct,
  type Order,
  type NewOrder,
  type Subscriber,
  type NewSubscriber,
  type Playlist,
  type NewPlaylist,
  type SyncJob,
  type NewSyncJob,
  type SiteSetting,
} from "@/db/schema";
import { eq, and, desc, asc, gte, lt, sql, like } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

// ===========================================
// RE-EXPORT MAIN REPOSITORIES
// ===========================================

export { artistsRepository } from "./artists";
export { releasesRepository } from "./releases";

// ===========================================
// VIDEOS REPOSITORY
// ===========================================

export const videosRepository = {
  async findAll(options: { limit?: number; artistId?: string; isFeatured?: boolean } = {}) {
    const conditions = [];
    if (options.artistId) conditions.push(eq(videos.artistId, options.artistId));
    if (options.isFeatured) conditions.push(eq(videos.isFeatured, true));

    let query = db
      .select()
      .from(videos)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(videos.publishedAt));

    if (options.limit) query = query.limit(options.limit) as typeof query;
    return query;
  },

  async findById(id: string) {
    const [video] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return video || null;
  },

  async findByYouTubeId(youtubeId: string) {
    const [video] = await db.select().from(videos).where(eq(videos.youtubeId, youtubeId)).limit(1);
    return video || null;
  },

  async findFeatured(limit = 5) {
    return db.select().from(videos).where(eq(videos.isFeatured, true))
      .orderBy(desc(videos.publishedAt)).limit(limit);
  },

  async count() {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(videos);
    return result?.count || 0;
  },

  async create(data: Omit<NewVideo, "id" | "createdAt" | "updatedAt">) {
    const [video] = await db.insert(videos).values({ ...data, id: generateUUID() }).returning();
    return video;
  },

  async update(id: string, data: Partial<NewVideo>) {
    const [video] = await db.update(videos).set({ ...data, updatedAt: new Date() })
      .where(eq(videos.id, id)).returning();
    return video || null;
  },

  async delete(id: string) {
    const result = await db.delete(videos).where(eq(videos.id, id));
    return (result.rowsAffected ?? 0) > 0;
  },
};

// ===========================================
// EVENTS REPOSITORY
// ===========================================

export const eventsRepository = {
  async findAll(options: { upcoming?: boolean; past?: boolean; limit?: number } = {}) {
    const conditions = [];
    const now = new Date();

    if (options.upcoming) {
      conditions.push(gte(events.eventDate, now));
      conditions.push(eq(events.isCancelled, false));
    }

    if (options.past) {
      conditions.push(lt(events.eventDate, now));
    }

    let query = db.select().from(events)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(options.past ? desc(events.eventDate) : asc(events.eventDate));

    if (options.limit) query = query.limit(options.limit) as typeof query;
    return query;
  },

  async findById(id: string) {
    const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    return event || null;
  },

  async findUpcoming(limit = 5) {
    return this.findAll({ upcoming: true, limit });
  },

  async findPast(limit = 10) {
    return this.findAll({ past: true, limit });
  },

  async count() {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(events);
    return result?.count || 0;
  },

  async create(data: Omit<NewEvent, "id" | "createdAt" | "updatedAt">) {
    const [event] = await db.insert(events).values({ ...data, id: generateUUID() }).returning();
    return event;
  },

  async update(id: string, data: Partial<NewEvent>) {
    const [event] = await db.update(events).set({ ...data, updatedAt: new Date() })
      .where(eq(events.id, id)).returning();
    return event || null;
  },

  async delete(id: string) {
    const result = await db.delete(events).where(eq(events.id, id));
    return (result.rowsAffected ?? 0) > 0;
  },
};

// ===========================================
// PRODUCTS REPOSITORY
// ===========================================

export const productsRepository = {
  async findAll(options: { category?: string; isActive?: boolean; limit?: number } = {}) {
    const conditions = [];
    if (options.category) conditions.push(eq(products.category, options.category as Product["category"]));
    if (options.isActive !== undefined) conditions.push(eq(products.isActive, options.isActive));

    let query = db.select().from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt));

    if (options.limit) query = query.limit(options.limit) as typeof query;
    return query;
  },

  async findById(id: string) {
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return product || null;
  },

  async findBySlug(slug: string) {
    const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    return product || null;
  },

  async count(isActive = true) {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(products)
      .where(isActive ? eq(products.isActive, true) : undefined);
    return result?.count || 0;
  },

  async create(data: Omit<NewProduct, "id" | "createdAt" | "updatedAt">) {
    const slug = slugify(data.name);
    const [product] = await db.insert(products).values({ ...data, id: generateUUID(), slug }).returning();
    return product;
  },

  async update(id: string, data: Partial<NewProduct>) {
    const [product] = await db.update(products).set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id)).returning();
    return product || null;
  },

  async delete(id: string) {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowsAffected ?? 0) > 0;
  },
};

// ===========================================
// SUBSCRIBERS REPOSITORY
// ===========================================

export const subscribersRepository = {
  async findAll(options: { isActive?: boolean; limit?: number; offset?: number } = {}) {
    const conditions = [];
    if (options.isActive !== undefined) conditions.push(eq(subscribers.isActive, options.isActive));

    let query = db.select().from(subscribers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(subscribers.subscribedAt));

    if (options.limit) query = query.limit(options.limit) as typeof query;
    if (options.offset) query = query.offset(options.offset) as typeof query;
    return query;
  },

  async findByEmail(email: string) {
    const [subscriber] = await db.select().from(subscribers)
      .where(eq(subscribers.email, email.toLowerCase())).limit(1);
    return subscriber || null;
  },

  async count(isActive = true) {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(subscribers)
      .where(isActive ? eq(subscribers.isActive, true) : undefined);
    return result?.count || 0;
  },

  async create(data: { email: string; name?: string; source?: string }) {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      if (!existing.isActive) {
        return this.resubscribe(existing.id);
      }
      return existing;
    }

    const [subscriber] = await db.insert(subscribers).values({
      id: generateUUID(),
      email: data.email.toLowerCase(),
      name: data.name,
      source: data.source,
      isActive: true,
    }).returning();
    return subscriber;
  },

  async resubscribe(id: string) {
    const [subscriber] = await db.update(subscribers).set({
      isActive: true,
      unsubscribedAt: null,
      subscribedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(subscribers.id, id)).returning();
    return subscriber || null;
  },

  async unsubscribe(email: string) {
    const [subscriber] = await db.update(subscribers).set({
      isActive: false,
      unsubscribedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(subscribers.email, email.toLowerCase())).returning();
    return subscriber || null;
  },
};

// ===========================================
// PLAYLISTS REPOSITORY
// ===========================================

export const playlistsRepository = {
  async findAll(options: { isOfficial?: boolean; isFeatured?: boolean } = {}) {
    const conditions = [];
    if (options.isOfficial) conditions.push(eq(playlists.isOfficial, true));
    if (options.isFeatured) conditions.push(eq(playlists.isFeatured, true));

    return db.select().from(playlists)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(playlists.createdAt));
  },

  async findBySpotifyId(spotifyId: string) {
    const [playlist] = await db.select().from(playlists)
      .where(eq(playlists.spotifyId, spotifyId)).limit(1);
    return playlist || null;
  },

  async create(data: Omit<NewPlaylist, "id" | "createdAt" | "updatedAt">) {
    const [playlist] = await db.insert(playlists).values({ ...data, id: generateUUID() }).returning();
    return playlist;
  },

  async update(id: string, data: Partial<NewPlaylist>) {
    const [playlist] = await db.update(playlists).set({ ...data, updatedAt: new Date() })
      .where(eq(playlists.id, id)).returning();
    return playlist || null;
  },
};

// ===========================================
// SYNC JOBS REPOSITORY
// ===========================================

export const syncJobsRepository = {
  async findLatest(source?: SyncJob["source"]) {
    const conditions = [];
    if (source) conditions.push(eq(syncJobs.source, source));

    const [job] = await db.select().from(syncJobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(syncJobs.createdAt)).limit(1);
    return job || null;
  },

  async findById(id: string) {
    const [job] = await db.select().from(syncJobs).where(eq(syncJobs.id, id)).limit(1);
    return job || null;
  },

  async create(data: Omit<NewSyncJob, "id" | "createdAt" | "updatedAt">) {
    const [job] = await db.insert(syncJobs).values({ ...data, id: generateUUID() }).returning();
    return job;
  },

  async update(id: string, data: Partial<NewSyncJob>) {
    const [job] = await db.update(syncJobs).set({ ...data, updatedAt: new Date() })
      .where(eq(syncJobs.id, id)).returning();
    return job || null;
  },

  async addLog(syncJobId: string, level: "info" | "warning" | "error", message: string, metadata?: Record<string, unknown>) {
    await db.insert(syncLogs).values({
      id: generateUUID(),
      syncJobId,
      level,
      message,
      metadata: metadata || null,
    });
  },

  async getLogs(syncJobId: string) {
    return db.select().from(syncLogs)
      .where(eq(syncLogs.syncJobId, syncJobId))
      .orderBy(asc(syncLogs.createdAt));
  },
};

// ===========================================
// SITE SETTINGS REPOSITORY
// ===========================================

export const siteSettingsRepository = {
  async findAll() {
    return db.select().from(siteSettings).orderBy(asc(siteSettings.key));
  },

  async get(key: string): Promise<string | null> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    return setting?.value || null;
  },

  async set(key: string, value: string, type: SiteSetting["type"] = "string") {
    const existing = await this.get(key);
    if (existing !== null) {
      await db.update(siteSettings).set({ value, updatedAt: new Date() })
        .where(eq(siteSettings.key, key));
    } else {
      await db.insert(siteSettings).values({ id: generateUUID(), key, value, type });
    }
  },

  async getMultiple(keys: string[]): Promise<Record<string, string | null>> {
    const settings = await db.select().from(siteSettings)
      .where(sql`${siteSettings.key} IN (${keys.map((k) => `'${k}'`).join(",")})`);

    const result: Record<string, string | null> = {};
    for (const key of keys) {
      result[key] = settings.find((s) => s.key === key)?.value || null;
    }
    return result;
  },
};
