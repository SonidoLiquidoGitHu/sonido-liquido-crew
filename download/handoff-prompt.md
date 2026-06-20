# HANDOFF PROMPT — Sonido Líquido Autopost Debugging

Paste everything below this line into a new GLM 5.2 session.

---

## Project Overview

I'm working on **Sonido Líquido**, a Next.js 16 + TypeScript app deployed on Netlify that auto-posts content (events, releases, photos, videos) to Facebook and Instagram. The app uses:
- **Next.js 16** (App Router) with TypeScript
- **Drizzle ORM 0.38.4** with Turso (libSQL) SQLite
- **Meta Graph API** (v23.0) for FB/IG posting
- **Netlify scheduled function** (cron) running hourly that calls `/api/admin/social` to process autoposts
- Admin UI at `/admin/social` for managing schedule and credentials

The user communicates in Spanish sometimes — UI labels and error messages are in Spanish.

## What's Already Done (Prior Sessions)

### 1. Tiered Event Autopost Frequency
Events post 2x/day normally, 3x/day within a week of the event. Implemented with tiered dedup windows (12h far, 8h near).

### 2. Instagram Stories for Events
Event posts go via `postToInstagramStory()` instead of feed/reel. Stories create urgency and match the time-sensitive nature of upcoming events.

### 3. Diagnostics Tool (just added, needs deployment)
Added a `debug-autopost` endpoint and UI panel to help identify why autopost isn't working. **Has not yet been deployed or run by the user.**

## Current Problem — Autopost Not Posting

User report: "there should have been two posts today and nothing." The admin panel shows schedule config of `7, 10, 14, 18` CST hours, but no posts are being generated.

### Likely Root Causes (Need to Confirm via Diagnostics)

1. **Schedule config not persisted to DB** — The `social_credentials` table stores `AUTOPOST_SCHEDULE_HOURS`. If the user set the schedule in the UI but it didn't save, the cron falls back to default `[4, 10, 15]` CST hours (not the user's `[7, 10, 14, 18]`).
2. **Queue empty** — `socialPostQueue` table may have no pending items (regular queue is separate from events).
3. **Meta token expired** — Long-lived tokens expire; need refresh.
4. **Items stuck in "processing"** — Failed posts left in `processing` status block subsequent runs.
5. **CST/UTC mismatch** — Schedule hours shown in UI as CST (Mexico City, UTC-6) but cron compares against UTC hours. Mexico City is permanently UTC-6 (DST abolished in 2022).
6. **No upcoming events** — Events table may be empty, so the event autopost has nothing to post.
7. **Netlify cron not running** — The schedule function may not be triggering.

---

## Database Schema (Complete)

### File: `src/db/schema/social-posts.ts`

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// SOCIAL POST QUEUE TABLE
// Items queued for auto-posting to FB/IG.
// No-repeat logic: WHERE status = 'pending' ORDER BY queue_order
// When all items in a cycle are posted, cycle_number increments and
// statuses reset to 'pending' for a new round.

export const socialPostQueue = sqliteTable("social_post_queue", {
  id: text("id").primaryKey(),
  contentType: text("content_type", {
    enum: ["gallery_photo", "spotify_track", "artist_profile", "curated_track", "vertical_video", "youtube_video", "event"],
  }).notNull(),
  sourceId: text("source_id").notNull(),
  artistId: text("artist_id"),
  releaseId: text("release_id"),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  linkUrl: text("link_url"),
  queueOrder: integer("queue_order").notNull().default(0),
  cycleNumber: integer("cycle_number").notNull().default(1),
  status: text("status", {
    enum: ["pending", "processing", "posted", "failed", "skipped"],
  }).notNull().default("pending"),
  platforms: text("platforms").notNull().default('["facebook","instagram"]'),
  postedPlatforms: text("posted_platforms").default("[]"),
  errorMessage: text("error_message"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  postedAt: integer("posted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// SOCIAL POSTS LOG TABLE
// Immutable log of every post made to FB/IG.
// One row per platform per queue item.

export const socialPostsLog = sqliteTable("social_posts_log", {
  id: text("id").primaryKey(),
  queueId: text("queue_id").notNull(),
  platform: text("platform", {
    enum: ["facebook", "instagram", "instagram_story", "tiktok", "instagram_reel", "facebook_reel"],
  }).notNull(),
  contentType: text("content_type", {
    enum: ["gallery_photo", "spotify_track", "artist_profile", "curated_track", "vertical_video", "youtube_video", "event"],
  }).notNull(),
  sourceId: text("source_id").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  linkUrl: text("link_url"),
  platformPostId: text("platform_post_id"),
  platformPostUrl: text("platform_post_url"),
  metaApiResponse: text("meta_api_response"),
  status: text("status", { enum: ["success", "failed", "rate_limited"] }).notNull(),
  errorMessage: text("error_message"),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  reach: integer("reach").default(0),
  impressions: integer("impressions").default(0),
  metricsUpdatedAt: integer("metrics_updated_at", { mode: "timestamp" }),
  postedAt: integer("posted_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type SocialPostQueue = typeof socialPostQueue.$inferSelect;
export type NewSocialPostQueue = typeof socialPostQueue.$inferInsert;
export type SocialPostsLog = typeof socialPostsLog.$inferSelect;
export type NewSocialPostsLog = typeof socialPostsLog.$inferInsert;
```

### File: `src/db/schema/social-credentials.ts`

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// SOCIAL CREDENTIALS TABLE
// Stores API credentials for social platforms (Meta, etc.)
// These are read by the social clients as a fallback when env vars are not set.
// Credentials stored here take priority over environment variables.

export const socialCredentials = sqliteTable("social_credentials", {
  id: text("id").primaryKey(),
  platform: text("platform", { enum: ["meta", "tiktok"] }).notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  isFromUi: integer("is_from_ui", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type SocialCredential = typeof socialCredentials.$inferSelect;
export type NewSocialCredential = typeof socialCredentials.$inferInsert;
```

**Key config keys stored in `socialCredentials`** (with `platform="meta"`):
- `META_APP_ID`, `META_APP_SECRET`, `META_SYSTEM_USER_TOKEN`, `FACEBOOK_PAGE_ID`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID` (optional)
- `AUTOPOST_SCHEDULE_HOURS` (CSV like "7,10,14,18")
- `AUTOPOST_POSTS_PER_RUN` (default 1)
- `AUTOPOST_MAX_POSTS_PER_DAY` (default 3)

---

## Netlify Cron Function (Complete)

### File: `netlify/functions/social-auto-post.ts`

```typescript
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// NETLIFY SCHEDULED FUNCTION - SOCIAL AUTO-POSTER
// Runs every hour and processes N items per run based on config.
// The actual posting is controlled by AUTOPOST_POSTS_PER_RUN and
// AUTOPOST_SCHEDULE_HOURS stored in the social_credentials DB table.
//
// IMPORTANT: Upcoming events are autoposted INDEPENDENTLY at each
// scheduled time — they do NOT consume the regular queue's daily
// post limit. The regular queue continues its round-robin rotation.
//
// Event autopost frequency is tiered based on proximity:
//   - More than 1 week before the event: 2x/day (12-hour dedup)
//   - Within 1 week of the event: 3x/day (8-hour dedup)
// Events post to Facebook (feed) + Instagram (Story, not feed/Reel).
//
// Mexico City is permanently UTC-6 (DST abolished in 2022).

const DEFAULT_POSTS_PER_RUN = 1;
const DEFAULT_MAX_POSTS_PER_DAY = 3;
const DEFAULT_SCHEDULE_HOURS = [4, 10, 15]; // 4am, 10am, 3pm CST
const CST_OFFSET = 6; // Mexico City = UTC-6

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const startTime = Date.now();
  console.log("[Social Auto-Post] Starting scheduled post run...");

  const siteUrl = process.env.URL || process.env.DEPLOY_URL || "https://sonidoliquido.com";
  const cronSecret = process.env.CRON_SECRET || "";

  const isManualTrigger = event.httpMethod === "POST";
  const authHeader = event.headers["authorization"] || "";
  if (isManualTrigger && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
  };

  try {
    // 1. Fetch schedule config from API
    const configUrl = `${siteUrl}/api/admin/social?action=schedule-config`;
    let postsPerRun = DEFAULT_POSTS_PER_RUN;
    let scheduleHours: number[] = DEFAULT_SCHEDULE_HOURS;
    let maxPostsPerDay = DEFAULT_MAX_POSTS_PER_DAY;

    try {
      const configRes = await fetch(configUrl, { headers, signal: AbortSignal.timeout(10_000) });
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.success && configData.data) {
          postsPerRun = configData.data.postsPerRun || DEFAULT_POSTS_PER_RUN;
          if (configData.data.scheduleHours && configData.data.scheduleHours.length > 0) {
            scheduleHours = configData.data.scheduleHours;
          }
          maxPostsPerDay = configData.data.maxPostsPerDay || DEFAULT_MAX_POSTS_PER_DAY;
        }
      }
    } catch (err) {
      console.warn("[Social Auto-Post] Could not fetch schedule config:", err);
    }

    // 2. Check if we should post at this hour (CST → UTC conversion)
    const currentHourUTC = new Date().getUTCHours();
    const utcScheduleHours = scheduleHours.map(h => (h + CST_OFFSET) % 24);
    const shouldPostNow = utcScheduleHours.includes(currentHourUTC);

    if (!shouldPostNow && !isManualTrigger) {
      const nextCstHour = scheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)
        .find(entry => entry.utc > currentHourUTC) || scheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)[0];

      console.log(`[Social Auto-Post] Not scheduled for this hour (UTC ${currentHourUTC}). Next: ${nextCstHour?.cst}:00 CST`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `Not scheduled for this hour. Next scheduled: ${nextCstHour?.cst}:00 CST`,
          skipped: true,
          currentHourUTC,
          scheduleHours,
          utcScheduleHours,
        }),
      };
    }

    console.log(`[Social Auto-Post] Hour matches! Processing up to ${postsPerRun} item(s).`);

    // 3. STEP 1: AUTOPOST UPCOMING EVENT (independent of queue)
    let eventAutopostResult: { success: boolean; message: string; event?: any } | null = null;

    try {
      console.log("[Social Auto-Post] Step 1: Checking for upcoming events to autopost...");
      const eventResponse = await fetch(`${siteUrl}/api/admin/social`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "autopost-upcoming-event" }),
        signal: AbortSignal.timeout(50_000),
      });
      const eventData = await eventResponse.json();

      if (eventData.success) {
        console.log(`[Social Auto-Post] Event autoposted: ${eventData.message}`);
        eventAutopostResult = { success: true, message: eventData.message, event: eventData.event };
      } else if (eventData.noEvents) {
        eventAutopostResult = { success: false, message: "No upcoming events" };
      } else if (eventData.alreadyPosted) {
        eventAutopostResult = { success: false, message: "Event already posted recently" };
      } else {
        eventAutopostResult = { success: false, message: eventData.message || eventData.error || "Unknown error" };
      }
    } catch (err) {
      eventAutopostResult = { success: false, message: err instanceof Error ? err.message : "Unknown error" };
    }

    // 4. STEP 2: PROCESS REGULAR QUEUE (with daily limit)
    // Count posts made today (exclude autopost-event-* entries)
    let postsMadeToday = 0;
    try {
      const logRes = await fetch(`${siteUrl}/api/admin/social`, { headers, signal: AbortSignal.timeout(10_000) });
      if (logRes.ok) {
        const logData = await logRes.json();
        if (logData.success && logData.data?.recentLogs) {
          const now = new Date();
          const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
          const startOfDayCST = new Date(startOfDayUTC.getTime() - CST_OFFSET * 60 * 60 * 1000);
          postsMadeToday = logData.data.recentLogs.filter(
            (log: any) =>
              log.status === "success" &&
              new Date(log.postedAt) >= startOfDayCST &&
              !log.queueId?.startsWith("autopost-event-")
          ).length;
        }
      }
    } catch (err) {
      console.warn("[Social Auto-Post] Could not check today's post count:", err);
    }

    if (postsMadeToday >= maxPostsPerDay) {
      console.log(`[Social Auto-Post] Daily limit reached: ${postsMadeToday}/${maxPostsPerDay}.`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: !!eventAutopostResult?.success,
          message: `Daily queue limit reached. Event autopost: ${eventAutopostResult?.message || "N/A"}`,
          eventAutopost: eventAutopostResult,
          queueResult: { skipped: true, reason: "daily_limit_reached", postsMadeToday, maxPostsPerDay },
        }),
      };
    }

    const remainingQuota = maxPostsPerDay - postsMadeToday;
    const itemsToProcess = Math.min(postsPerRun, remainingQuota);

    const results: Array<{ success: boolean; message: string }> = [];
    let processedCount = 0;

    for (let i = 0; i < itemsToProcess; i++) {
      try {
        const response = await fetch(`${siteUrl}/api/admin/social`, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "process-next" }),
          signal: AbortSignal.timeout(50_000),
        });
        const data = await response.json();

        if (response.ok && data.success) {
          results.push({ success: true, message: data.message });
          processedCount++;
        } else if (response.ok && !data.success) {
          results.push({ success: false, message: data.message });
          break;
        } else {
          results.push({ success: false, message: data.error || data.message || "API error" });
        }
      } catch (err) {
        results.push({ success: false, message: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const successCount = results.filter(r => r.success).length;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: eventAutopostResult?.success || successCount > 0,
        message: `Event: ${eventAutopostResult?.message || "N/A"} | Queue: ${successCount}/${results.length}`,
        elapsed: `${elapsed}s`,
        eventAutopost: eventAutopostResult,
        queueResults: results,
        config: { postsPerRun, scheduleHours, maxPostsPerDay, itemsToProcess, postsMadeToday },
      }),
    };
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Internal error",
        error: error instanceof Error ? error.message : "Unknown error",
        elapsed: `${elapsed}s`,
      }),
    };
  }
};

export { handler };
```

**IMPORTANT**: In `netlify.toml`, the cron schedule should be:
```toml
[[plugins]]
package = "@netlify/plugin-functions-core"

[functions."social-auto-post"]
schedule = "0 * * * *"
```

---

## Key API Route Sections

### File: `src/app/api/admin/social/route.ts` (key sections only — file is 2296 lines total)

**POST action dispatch** (around line 200-260):
```typescript
const action = body.action as string;
switch (action) {
  case "process-next": return await handleProcessNext();
  case "autopost-upcoming-event": return await handleAutopostUpcomingEvent();
  case "reset-cycle": return await handleResetCycle();
  case "skip-item": return await handleSkipItem(body.queueId as string);
  case "validate-token": return await handleValidateToken();
  case "save-schedule-config": return await handleSaveScheduleConfig(body);
  case "debug-autopost": return await handleDebugAutopost();
  // ... other cases
}
```

**Schedule config reader** (`getScheduleConfig`, around line 2113):
```typescript
async function getScheduleConfig(): Promise<{
  scheduleHours: number[];
  postsPerRun: number;
  maxPostsPerDay: number;
}> {
  try {
    const creds = await db
      .select()
      .from(socialCredentials)
      .where(eq(socialCredentials.platform, "meta"));

    const credMap = new Map(creds.map(c => [c.key, c.value]));

    const scheduleHoursStr = credMap.get("AUTOPOST_SCHEDULE_HOURS");
    const postsPerRunStr = credMap.get("AUTOPOST_POSTS_PER_RUN");
    const maxPostsPerDayStr = credMap.get("AUTOPOST_MAX_POSTS_PER_DAY");

    let scheduleHours = DEFAULT_SCHEDULE_HOURS; // [4, 10, 15]
    if (scheduleHoursStr) {
      const parsed = scheduleHoursStr.split(",").map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 23);
      if (parsed.length > 0) scheduleHours = parsed.sort((a, b) => a - b);
    }

    // ... postsPerRun, maxPostsPerDay parsing ...

    return { scheduleHours, postsPerRun, maxPostsPerDay };
  } catch (error) {
    console.warn("[Social API] Error reading schedule config:", error);
    return { scheduleHours: DEFAULT_SCHEDULE_HOURS, postsPerRun: DEFAULT_POSTS_PER_RUN, maxPostsPerDay: DEFAULT_MAX_POSTS_PER_DAY };
  }
}
```

**Save schedule config handler** (`handleSaveScheduleConfig`):
```typescript
async function handleSaveScheduleConfig(body: Record<string, unknown>) {
  const { scheduleHours, postsPerRun, maxPostsPerDay } = body;
  const configToSave: Array<{ key: string; value: string }> = [];

  if (Array.isArray(scheduleHours)) {
    const validHours = scheduleHours
      .map(Number)
      .filter((n: number) => !isNaN(n) && n >= 0 && n <= 23)
      .sort((a: number, b: number) => a - b);
    if (validHours.length > 0) {
      configToSave.push({ key: "AUTOPOST_SCHEDULE_HOURS", value: validHours.join(",") });
    }
  }

  // ... postsPerRun, maxPostsPerDay ...

  for (const config of configToSave) {
    const existing = await db
      .select({ id: socialCredentials.id })
      .from(socialCredentials)
      .where(and(eq(socialCredentials.platform, "meta"), eq(socialCredentials.key, config.key)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(socialCredentials)
        .set({ value: config.value, updatedAt: new Date() } as any)  // <-- `as any` is the workaround
        .where(and(eq(socialCredentials.platform, "meta"), eq(socialCredentials.key, config.key)));
    } else {
      await db.insert(socialCredentials).values({
        id: crypto.randomUUID(),
        platform: "meta",
        key: config.key,
        value: config.value,
        isFromUi: true,
      } as any);
    }
  }

  return NextResponse.json({ success: true, message: "Configuración guardada", data: await getScheduleConfig() });
}
```

**Autopost upcoming event handler** (`handleAutopostUpcomingEvent`, line 1591):
```typescript
async function handleAutopostUpcomingEvent() {
  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({ success: false, message: "Meta API not configured." });
  }

  try {
    const now = new Date();
    const upcomingEvents = await db
      .select({
        id: events.id, title: events.title, venue: events.venue, city: events.city,
        country: events.country, eventDate: events.eventDate, eventTime: events.eventTime,
        ticketUrl: events.ticketUrl, imageUrl: events.imageUrl, isFeatured: events.isFeatured,
      })
      .from(events)
      .where(and(gt(events.eventDate, now), eq(events.isCancelled, false), isNotNull(events.imageUrl)))
      .orderBy(events.eventDate)
      .limit(5);

    if (upcomingEvents.length === 0) {
      return NextResponse.json({ success: false, message: "No upcoming events with images.", noEvents: true });
    }

    // Tiered dedup: 12h if >1 week away, 8h if within 1 week
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const DEDUP_FAR_MS = 12 * 60 * 60;   // 12 hours in seconds
    const DEDUP_NEAR_MS = 8 * 60 * 60;   // 8 hours in seconds

    let selectedEvent: typeof upcomingEvents[0] | null = null;
    let selectedDedupWindow = DEDUP_FAR_MS;

    for (const event of upcomingEvents) {
      const timeUntilEvent = new Date(event.eventDate).getTime() - now.getTime();
      const dedupWindow = timeUntilEvent <= ONE_WEEK_MS ? DEDUP_NEAR_MS : DEDUP_FAR_MS;

      const recentlyPosted = await db
        .select({ id: socialPostsLog.id })
        .from(socialPostsLog)
        .where(and(
          eq(socialPostsLog.contentType, "event"),
          eq(socialPostsLog.sourceId, event.id),
          eq(socialPostsLog.status, "success"),
          drizzleSql`${socialPostsLog.postedAt} > (unixepoch() - ${dedupWindow})`
        ))
        .limit(1);

      if (recentlyPosted.length === 0) {
        selectedEvent = event;
        selectedDedupWindow = dedupWindow;
        break;
      }
    }

    if (!selectedEvent) {
      return NextResponse.json({ success: false, message: "All upcoming events already posted recently.", alreadyPosted: true });
    }

    const eventLinkUrl = `${SITE_URL}/proximos`;
    const caption = generateCaption({
      contentType: "event",
      eventTitle: selectedEvent.title,
      eventVenue: selectedEvent.venue,
      eventCity: selectedEvent.city,
      eventDate: selectedEvent.eventDate,
      eventTime: selectedEvent.eventTime || undefined,
      ticketUrl: selectedEvent.ticketUrl || undefined,
      linkUrl: eventLinkUrl,
    });

    const publicImageUrl = ensurePublicImageUrl(selectedEvent.imageUrl!);

    const results: {
      facebook?: { success: boolean; postId?: string; postUrl?: string; error?: string };
      instagram_story?: { success: boolean; mediaId?: string; permalink?: string; error?: string };
    } = {};

    // Post to Facebook (regular feed)
    const fbResult = await postToFacebook(publicImageUrl, caption, eventLinkUrl);
    results.facebook = {
      success: fbResult.success,
      postId: fbResult.postId || undefined,
      postUrl: fbResult.postUrl || undefined,
      error: fbResult.error || undefined,
    };

    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `autopost-event-${selectedEvent.id}`,
        platform: "facebook",
        contentType: "event",
        sourceId: selectedEvent.id,
        imageUrl: publicImageUrl,
        caption,
        linkUrl: eventLinkUrl,
        platformPostId: fbResult.postId,
        platformPostUrl: fbResult.postUrl,
        metaApiResponse: null,
        status: fbResult.success ? "success" : "failed",
        errorMessage: fbResult.error || null,
        postedAt: new Date(),
      } as any);  // <-- `as any` workaround for Drizzle TS errors
    } catch (logError) {
      console.error("[Social API] Failed to log autopost FB event:", logError);
    }

    // Post to Instagram as a Story (not feed, not Reel)
    const igResult = await postToInstagramStory(publicImageUrl, caption, eventLinkUrl);
    results.instagram_story = {
      success: igResult.success,
      mediaId: igResult.mediaId || undefined,
      permalink: igResult.permalink || undefined,
      error: igResult.error || undefined,
    };

    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `autopost-event-${selectedEvent.id}`,
        platform: "instagram_story",
        contentType: "event",
        sourceId: selectedEvent.id,
        imageUrl: publicImageUrl,
        caption,
        linkUrl: eventLinkUrl,
        platformPostId: igResult.mediaId,
        platformPostUrl: igResult.permalink,
        metaApiResponse: null,
        status: igResult.success ? "success" : "failed",
        errorMessage: igResult.error || null,
        postedAt: new Date(),
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log autopost IG Story event:", logError);
    }

    const anySuccess = results.facebook?.success || results.instagram_story?.success;
    return NextResponse.json({
      success: anySuccess,
      message: anySuccess
        ? `Evento autoposteado: "${selectedEvent.title}"`
        : `Error al autopostear evento "${selectedEvent.title}"`,
      event: { id: selectedEvent.id, title: selectedEvent.title, venue: selectedEvent.venue, city: selectedEvent.city, eventDate: selectedEvent.eventDate },
      results,
    });
  } catch (error) {
    console.error("[Social API] Autopost upcoming event error:", error);
    return NextResponse.json({ success: false, message: "Error al autopostear evento próximo", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
```

**Diagnostics handler** (`handleDebugAutopost`, line 1395):
```typescript
async function handleDebugAutopost() {
  const now = new Date();
  const diagnostics: Record<string, unknown> = {
    timestamp: now.toISOString(),
    timestampUTC: now.toUTCString(),
  };

  // 1. Check Meta API configuration
  const metaConfigured = await isMetaConfiguredAsync();
  diagnostics.metaConfigured = metaConfigured;

  if (metaConfigured) {
    try {
      const tokenInfo = await validateToken();
      diagnostics.tokenValid = tokenInfo.isValid;
      diagnostics.tokenError = tokenInfo.isValid ? null : (tokenInfo.raw?.message || "Invalid token");
    } catch (err) {
      diagnostics.tokenValid = false;
      diagnostics.tokenError = err instanceof Error ? err.message : "Token validation failed";
    }
  }

  // 2. Check schedule config
  try {
    const config = await getScheduleConfig();
    diagnostics.scheduleConfig = config;

    const CST_OFFSET = 6;
    const utcScheduleHours = config.scheduleHours.map(h => (h + CST_OFFSET) % 24);
    const currentHourUTC = now.getUTCHours();
    const currentHourCST = (currentHourUTC - CST_OFFSET + 24) % 24;

    diagnostics.currentTimeUTC = currentHourUTC;
    diagnostics.currentTimeCST = currentHourCST;
    diagnostics.utcScheduleHours = utcScheduleHours;
    diagnostics.shouldPostNow = utcScheduleHours.includes(currentHourUTC);
    diagnostics.nextScheduledCST = config.scheduleHours
      .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
      .sort((a, b) => a.utc - b.utc)
      .find(entry => entry.utc > currentHourUTC)?.cst || config.scheduleHours[0];
  } catch (err) {
    diagnostics.scheduleConfigError = err instanceof Error ? err.message : "Failed to read schedule config";
  }

  // 3. Check queue status
  try {
    const pendingCount = await db.select({ count: count() }).from(socialPostQueue).where(eq(socialPostQueue.status, "pending"));
    const processingCount = await db.select({ count: count() }).from(socialPostQueue).where(eq(socialPostQueue.status, "processing"));
    diagnostics.queuePending = pendingCount[0]?.count || 0;
    diagnostics.queueProcessing = processingCount[0]?.count || 0;

    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const stuckItems = await db
      .select({ id: socialPostQueue.id, contentType: socialPostQueue.contentType, updatedAt: socialPostQueue.updatedAt })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "processing"))
      .limit(10);
    diagnostics.stuckProcessingItems = stuckItems.filter(item => {
      const updated = item.updatedAt ? new Date(item.updatedAt) : null;
      return updated && updated < tenMinutesAgo;
    }).length;
  } catch (err) {
    diagnostics.queueError = err instanceof Error ? err.message : "Failed to read queue";
  }

  // 4. Check upcoming events
  try {
    const upcomingEvents = await db
      .select({ id: events.id, title: events.title, eventDate: events.eventDate, imageUrl: events.imageUrl, isCancelled: events.isCancelled })
      .from(events)
      .where(eq(events.isCancelled, false))
      .orderBy(events.eventDate)
      .limit(5);
    diagnostics.upcomingEvents = upcomingEvents.map(e => ({
      id: e.id, title: e.title, eventDate: e.eventDate, hasImage: !!e.imageUrl, isPast: new Date(e.eventDate) < now,
    }));
  } catch (err) {
    diagnostics.eventsError = err instanceof Error ? err.message : "Failed to read events";
  }

  // 5. Check recent post log
  try {
    const recentLogs = await db
      .select({ id: socialPostsLog.id, platform: socialPostsLog.platform, contentType: socialPostsLog.contentType, status: socialPostsLog.status, errorMessage: socialPostsLog.errorMessage, postedAt: socialPostsLog.postedAt, queueId: socialPostsLog.queueId })
      .from(socialPostsLog)
      .orderBy(desc(socialPostsLog.postedAt))
      .limit(10);
    diagnostics.recentLogs = recentLogs.map(l => ({
      platform: l.platform, contentType: l.contentType, status: l.status, errorMessage: l.errorMessage,
      postedAt: l.postedAt ? new Date(l.postedAt).toISOString() : null, queueId: l.queueId,
    }));

    const startOfDayCST = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 6 * 60 * 60 * 1000);
    const todayPosts = recentLogs.filter(l => l.status === "success" && l.postedAt && new Date(l.postedAt) >= startOfDayCST);
    diagnostics.todayPostsCount = todayPosts.length;
    diagnostics.todayPosts = todayPosts.map(l => ({ platform: l.platform, contentType: l.contentType, queueId: l.queueId, postedAt: l.postedAt ? new Date(l.postedAt).toISOString() : null }));
  } catch (err) {
    diagnostics.logsError = err instanceof Error ? err.message : "Failed to read logs";
  }

  // 6. Check DB credentials
  try {
    const creds = await db
      .select({ key: socialCredentials.key, value: socialCredentials.value })
      .from(socialCredentials)
      .where(eq(socialCredentials.platform, "meta"));
    const credKeys = creds.map(c => c.key);
    diagnostics.dbCredentialKeys = credKeys;
    diagnostics.hasAutopostScheduleHours = credKeys.includes("AUTOPOST_SCHEDULE_HOURS");
    diagnostics.hasAutopostPostsPerRun = credKeys.includes("AUTOPOST_POSTS_PER_RUN");
    diagnostics.hasAutopostMaxPostsPerDay = credKeys.includes("AUTOPOST_MAX_POSTS_PER_DAY");
    const scheduleHoursCred = creds.find(c => c.key === "AUTOPOST_SCHEDULE_HOURS");
    diagnostics.autopostScheduleHoursValue = scheduleHoursCred?.value || null;
  } catch (err) {
    diagnostics.credentialsError = err instanceof Error ? err.message : "Failed to read credentials";
  }

  // 7. Identify likely issues
  const issues: string[] = [];
  if (!metaConfigured) issues.push("Meta API is not configured — META_SYSTEM_USER_TOKEN and/or FACEBOOK_PAGE_ID are missing");
  if (diagnostics.tokenValid === false) issues.push(`Meta API token is invalid: ${diagnostics.tokenError}`);
  if ((diagnostics.queuePending as number) === 0) issues.push("Queue has no pending items — populate the queue first");
  if ((diagnostics.stuckProcessingItems as number) > 0) issues.push(`${diagnostics.stuckProcessingItems} items stuck in 'processing' status — they may need to be reset`);
  if (!diagnostics.hasAutopostScheduleHours) issues.push("AUTOPOST_SCHEDULE_HOURS not found in DB — schedule config may not have been saved (cron will use defaults: 4am, 10am, 3pm CST)");
  if ((diagnostics.upcomingEvents as unknown[])?.length === 0) issues.push("No upcoming events found in the database");
  if ((diagnostics.todayPostsCount as number) === 0) issues.push("No successful posts today — the cron may not be running or may be skipping this hour");

  diagnostics.likelyIssues = issues.length > 0 ? issues : ["No obvious issues found — check Netlify function logs for the social-auto-post cron"];

  return NextResponse.json({ success: true, diagnostics });
}
```

---

## Admin UI Diagnostics Panel

### File: `src/app/admin/social/page.tsx` (key sections)

**State and handler** (around line 252 and 456):
```tsx
const [debugResult, setDebugResult] = useState<Record<string, unknown> | null>(null);
// ... debugLoading state already exists

const runDiagnostics = async () => {
  setDebugLoading(true);
  setDebugResult(null);
  try {
    const res = await fetch("/api/admin/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "debug-autopost" }),
    });
    const data = await res.json();
    if (data.success) {
      setDebugResult(data.diagnostics);
    } else {
      setDebugResult({ error: data.error || "Unknown error" });
    }
  } catch (err) {
    setDebugResult({ error: err instanceof Error ? err.message : "Request failed" });
  } finally {
    setDebugLoading(false);
  }
};
```

**UI panel** (around line 1100, inside the Schedule tab):
```tsx
{/* Diagnostics Panel */}
<div className="bg-slc-card border border-slc-border rounded-xl p-6">
  <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
    <Activity className="w-5 h-5 text-primary" />
    Diagnóstico de Autopost
  </h2>
  <p className="text-sm text-slc-muted mb-4">
    Verifica por qué no se están publicando los posts automáticos.
  </p>
  <Button onClick={runDiagnostics} disabled={debugLoading} variant="outline" className="mb-4">
    {debugLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
    Ejecutar Diagnóstico
  </Button>

  {debugResult && (
    <div className="space-y-4">
      {((debugResult.likelyIssues as string[]) || []).length > 0 && (
        <div className={`p-4 rounded-lg border ${
          (debugResult.likelyIssues as string[]).some(i => i.includes("No obvious"))
            ? "bg-green-500/10 border-green-500/20"
            : "bg-red-500/10 border-red-500/20"
        }`}>
          <h3 className="text-sm font-medium mb-2">Problemas encontrados:</h3>
          <ul className="space-y-1">
            {(debugResult.likelyIssues as string[]).map((issue, i) => (
              <li key={i} className="text-sm text-slc-muted flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusBadge label="Meta API" ok={debugResult.metaConfigured as boolean} okText="Configurada" failText="No configurada" />
        <StatusBadge label="Token" ok={debugResult.tokenValid as boolean} okText="Válido" failText={debugResult.tokenError as string || "Inválido"} />
        <StatusBadge label="Cola pendiente" ok={(debugResult.queuePending as number) > 0} okText={`${debugResult.queuePending} items`} failText="Vacía" />
        <StatusBadge label="Horario en DB" ok={debugResult.hasAutopostScheduleHours as boolean} okText={debugResult.autopostScheduleHoursValue as string || "Guardado"} failText="No guardado" />
      </div>

      <div className="p-3 bg-slc-dark rounded-lg text-sm space-y-1">
        <p><span className="text-slc-muted">Hora actual (CST):</span> <span className="text-white font-mono">{debugResult.currentTimeCST}:00</span></p>
        <p><span className="text-slc-muted">Hora actual (UTC):</span> <span className="text-white font-mono">{debugResult.currentTimeUTC}:00</span></p>
        <p><span className="text-slc-muted">Horarios CST:</span> <span className="text-white font-mono">{(debugResult.scheduleConfig as any)?.scheduleHours?.join(", ") || "N/A"}</span></p>
        <p><span className="text-slc-muted">Horarios UTC:</span> <span className="text-white font-mono">{(debugResult.utcScheduleHours as number[])?.join(", ") || "N/A"}</span></p>
        <p><span className="text-slc-muted">¿Debería publicar ahora?</span> <span className={debugResult.shouldPostNow ? "text-green-400" : "text-red-400"}>{debugResult.shouldPostNow ? "Sí" : "No"}</span></p>
        <p><span className="text-slc-muted">Próximo horario (CST):</span> <span className="text-white font-mono">{debugResult.nextScheduledCST}:00</span></p>
        <p><span className="text-slc-muted">Posts hoy:</span> <span className="text-white font-mono">{debugResult.todayPostsCount as number}</span></p>
      </div>

      {(debugResult.stuckProcessingItems as number) > 0 && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-300">
          <span className="font-medium">Atención:</span> {debugResult.stuckProcessingItems} items están atascados en estado "processing". Prueba "Reiniciar Ciclo" para resetearlos.
        </div>
      )}
    </div>
  )}
</div>
```

---

## Instagram Story Posting Function

### File: `src/lib/clients/meta.ts` (function `postToInstagramStory`, line 625)

```typescript
export async function postToInstagramStory(
  imageUrl: string,
  caption: string,
  linkUrl?: string
): Promise<InstagramPostResult> {
  if (!(await isMetaConfiguredAsync())) {
    return { success: false, mediaId: null, permalink: null, error: "Meta API not configured" };
  }

  const igAccountId = await getInstagramBusinessAccountId();
  if (!igAccountId) {
    return { success: false, mediaId: null, permalink: null, error: "Instagram Business Account not found" };
  }

  if (!imageUrl) {
    return { success: false, mediaId: null, permalink: null, error: "No image URL provided" };
  }

  const token = await getSystemUserToken();

  try {
    // Step 1: Create Story container
    const containerBody: Record<string, string | boolean> = {
      media_type: "STORIES",
      image_url: imageUrl,
      access_token: token,
    };

    if (caption) containerBody.caption = caption;
    if (linkUrl) containerBody.link = linkUrl;

    const containerResponse = await fetch(`${META_GRAPH_API}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    });

    const containerData = await containerResponse.json();

    if (containerData.error) {
      const igErrorMsg = containerData.error.message || `Error code ${containerData.error.code || "unknown"}`;
      let guidance = "";
      if (igErrorMsg.includes("could not download") || igErrorMsg.includes("could not retrieve")) {
        guidance = " — The image URL is not publicly accessible.";
      } else if (igErrorMsg.includes("OAuth") || igErrorMsg.includes("permission")) {
        guidance = " — Check that your System User Token has instagram_basic and instagram_content_publish permissions.";
      } else if (igErrorMsg.includes("link")) {
        guidance = " — IG Story link stickers require instagram_content_publish permission and a verified account.";
      }
      return { success: false, mediaId: null, permalink: null, error: `${igErrorMsg}${guidance}` };
    }

    const containerId = containerData.id;

    // Step 2: Poll container status until FINISHED or ERROR
    let statusCode = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 10;

    while (statusCode === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;

      const statusResponse = await fetch(
        `${META_GRAPH_API}/${containerId}?fields=status_code&access_token=${token}`
      );
      const statusData = await statusResponse.json();
      statusCode = statusData.status_code || "IN_PROGRESS";

      if (statusCode === "FINISHED") break;
      if (statusCode === "ERROR") {
        return { success: false, mediaId: null, permalink: null, error: `Story container processing failed after ${attempts} polls` };
      }
    }

    if (statusCode !== "FINISHED") {
      return { success: false, mediaId: null, permalink: null, error: `Story container still processing after ${maxAttempts * 2}s timeout` };
    }

    // Step 3: Publish the Story
    const publishResponse = await fetch(`${META_GRAPH_API}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId, access_token: token }),
    });

    const publishData = await publishResponse.json();

    if (publishData.error) {
      return { success: false, mediaId: null, permalink: null, error: publishData.error.message || "Failed to publish Story" };
    }

    return {
      success: true,
      mediaId: publishData.id,
      permalink: null, // Stories don't have public permalinks via API
    };
  } catch (err) {
    return { success: false, mediaId: null, permalink: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
```

---

## Pending Issue: 39 TypeScript Errors in `route.ts`

The `route.ts` file (2296 lines) has **39 TypeScript errors** — all Drizzle ORM 0.38.4 type inference mismatches on `.values()` and `.set()` calls. Example:

```typescript
await db.insert(socialPostQueue).values({
  eventId: event.id,  // ❌ TS error: not a known property
  platform: 'instagram',
  ...
});
```

**Workaround already in place**: Most calls use `as any` cast:
```typescript
await db.insert(socialPostsLog).values({
  id: crypto.randomUUID(),
  queueId: `autopost-event-${selectedEvent.id}`,
  // ...
} as any);  // <-- this silences the TS error
```

**Proper fix** (if user wants to remove `as any`):
```typescript
// Use the inferred insert type
.values({
  // ...
} satisfies typeof socialPostsLog.$inferInsert)

// Or explicit type annotation
const newRow: typeof socialPostsLog.$inferInsert = { /* ... */ };
await db.insert(socialPostsLog).values(newRow);
```

**Note**: The user previously mentioned "24 issues" but couldn't find what I was referring to. This was a misunderstanding — they may have meant something visible in their Netlify deploy log or browser console. **DO NOT assume the 39 TS errors are what they meant.** Ask the user to clarify what they're seeing if they mention "issues" again.

---

## Tasks to Continue

### Task 1: Deploy and Run Diagnostics
1. The user needs to deploy the current code to Netlify
2. Visit `/admin/social` and click the "Ejecutar Diagnóstico" button in the Schedule tab
3. Share the JSON output from diagnostics

### Task 2: Fix the Autopost Issue
Based on diagnostics output, the fix will likely be one of:

**A. Schedule config not saved to DB**
- Symptom: `hasAutopostScheduleHours: false` in diagnostics
- Fix: Verify the `handleSaveScheduleConfig` function works. Test by saving schedule in UI and checking the `social_credentials` table.

**B. Meta token expired**
- Symptom: `tokenValid: false`
- Fix: User needs to generate a new System User Token in Meta Business Settings. Document the steps.

**C. Items stuck in "processing"**
- Symptom: `stuckProcessingItems > 0`
- Fix: User clicks "Reiniciar Ciclo" button in admin UI, or add a "Reset Stuck Items" button.

**D. CST/UTC conversion issue**
- Symptom: `shouldPostNow: false` even during a scheduled hour
- Fix: Check the cron's hour-matching logic. Mexico City is UTC-6. If user schedules 7am CST, that's 13:00 UTC.

**E. No upcoming events**
- Symptom: `upcomingEvents: []` in diagnostics
- Fix: User needs to add events in the admin UI at `/admin/proximos` (or whatever the events admin path is).

**F. Netlify cron not running**
- Symptom: Diagnostics all look fine but no posts are happening
- Fix: Check `netlify.toml` has the cron schedule. Check Netlify dashboard → Functions → `social-auto-post` → Logs.

### Task 3: Fix TypeScript Errors (Optional)
Only if user explicitly asks. The `as any` workaround is fine for runtime.

---

## Important Context

- **User timezone**: America/Mexico_City (CST, UTC-6, no DST)
- **Site URL**: `https://sonidoliquido.com`
- **User communicates in Spanish sometimes** — UI labels are Spanish, but technical discussions can be English
- **Project lives at**: `/home/z/my-project/` (this environment) — but in the new session the project may be at a different path. The user has the project on their own machine.
- **DO NOT ask the user to upload files** — all the code you need is in this prompt. If you need to see more, ask the user to paste a specific section.
- The user's main frustration is **autopost not posting** — that's the priority. Don't get distracted by TypeScript errors.

## How to Start

1. Ask the user: "Have you deployed the latest changes? If so, go to `/admin/social`, click the 'Schedule' tab, and click 'Ejecutar Diagnóstico'. Paste the JSON output here."
2. Analyze the diagnostics output to identify the root cause.
3. Propose a fix and ask the user to confirm before implementing.
4. After fix is deployed, verify by manually triggering the autopost via `curl` or the admin UI.

---

## End of Handoff Prompt
