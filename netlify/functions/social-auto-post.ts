import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ===========================================
// NETLIFY SCHEDULED FUNCTION - SOCIAL AUTO-POSTER
// ===========================================
// Runs every hour. Two independent paths:
//
//   FEED PATH  (at hours in scheduleHours, Mexico City time):
//     Calls process-next, which posts the next pending queue item to
//     FB (wall) + IG (feed). Capped at maxPostsPerDay per Mexico-City day.
//
//   STORY PATH (at hours in storyScheduleHours, Mexico City time):
//     Calls process-next-story-only, which picks a recently-posted queue
//     item as throwback content and posts ONLY an IG Story. Capped at
//     maxStoriesPerDay per Mexico-City day. Independent of the feed cap.
//
// Mexico City is permanently UTC-6 (DST abolished in 2022).

// Default config (used when DB is not accessible)
const DEFAULT_POSTS_PER_RUN = 1;
const DEFAULT_MAX_POSTS_PER_DAY = 4;
const DEFAULT_MAX_STORIES_PER_DAY = 3;
const DEFAULT_SCHEDULE_HOURS = [4, 10, 15]; // 4am, 10am, 3pm CST
const DEFAULT_STORY_SCHEDULE_HOURS = [4, 10, 15]; // Default: same as feed
const CST_OFFSET = 6; // Mexico City = UTC-6

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Unknown error";
}

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  const startTime = Date.now();

  console.log("[Social Auto-Post] Starting scheduled post run...");

  const siteUrl = process.env.URL || process.env.DEPLOY_URL || "https://sonidoliquido.com";
  const cronSecret = process.env.CRON_SECRET || "";

  // Allow manual trigger via POST with auth
  const isManualTrigger = event.httpMethod === "POST";
  const authHeader = event.headers["authorization"] || "";
  if (isManualTrigger && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
  };

  try {
    // ===========================================
    // STEP 0: Load schedule config from DB (via admin API)
    // ===========================================
    const configUrl = `${siteUrl}/api/admin/social?action=schedule-config`;
    let postsPerRun = DEFAULT_POSTS_PER_RUN;
    let scheduleHours: number[] = DEFAULT_SCHEDULE_HOURS;
    let storyScheduleHours: number[] = DEFAULT_STORY_SCHEDULE_HOURS;
    let maxPostsPerDay = DEFAULT_MAX_POSTS_PER_DAY;
    let maxStoriesPerDay = DEFAULT_MAX_STORIES_PER_DAY;

    try {
      const configRes = await fetch(configUrl, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.success && configData.data) {
          postsPerRun = configData.data.postsPerRun || DEFAULT_POSTS_PER_RUN;
          if (configData.data.scheduleHours && configData.data.scheduleHours.length > 0) {
            scheduleHours = configData.data.scheduleHours;
          }
          if (configData.data.storyScheduleHours && configData.data.storyScheduleHours.length > 0) {
            storyScheduleHours = configData.data.storyScheduleHours;
          } else {
            storyScheduleHours = scheduleHours;
          }
          maxPostsPerDay = configData.data.maxPostsPerDay || DEFAULT_MAX_POSTS_PER_DAY;
          maxStoriesPerDay = configData.data.maxStoriesPerDay ?? DEFAULT_MAX_STORIES_PER_DAY;
        }
      }
    } catch (err) {
      console.warn("[Social Auto-Post] Could not fetch schedule config, using defaults:", errMsg(err));
    }

    // ===========================================
    // STEP 1: Decide which paths to run this hour
    // ===========================================
    const currentHourUTC = new Date().getUTCHours();
    const utcScheduleHours = scheduleHours.map(h => (h + CST_OFFSET) % 24);
    const utcStoryScheduleHours = storyScheduleHours.map(h => (h + CST_OFFSET) % 24);

    const shouldPostFeed = utcScheduleHours.includes(currentHourUTC);
    const shouldPostStory = utcStoryScheduleHours.includes(currentHourUTC);
    const shouldRunAnything = shouldPostFeed || shouldPostStory;

    const effectiveShouldPostFeed = isManualTrigger || shouldPostFeed;
    const effectiveShouldPostStory = isManualTrigger || shouldPostStory;

    if (!shouldRunAnything && !isManualTrigger) {
      const nextFeedHour = scheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)
        .find(entry => entry.utc > currentHourUTC) || scheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)[0];

      const nextStoryHour = storyScheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)
        .find(entry => entry.utc > currentHourUTC) || storyScheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)[0];

      const cstHour = ((currentHourUTC - CST_OFFSET) + 24) % 24;
      console.log(
        `[Social Auto-Post] Not scheduled for this hour (UTC ${currentHourUTC} = CST ${cstHour}). ` +
        `Feed hours (Mexico City): ${scheduleHours.join(", ")}. Next feed: ${nextFeedHour?.cst}:00 CST. ` +
        `Story hours (Mexico City): ${storyScheduleHours.join(", ")}. Next story: ${nextStoryHour?.cst}:00 CST.`
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `Not scheduled for this hour. Next feed: ${nextFeedHour?.cst}:00 CST. Next story: ${nextStoryHour?.cst}:00 CST`,
          skipped: true,
          currentHourUTC,
          scheduleHours,
          storyScheduleHours,
          utcScheduleHours,
          utcStoryScheduleHours,
        }),
      };
    }

    const cstHour = ((currentHourUTC - CST_OFFSET) + 24) % 24;
    console.log(
      `[Social Auto-Post] Hour matches schedule! UTC ${currentHourUTC} = CST ${cstHour}. ` +
      `Feed: ${effectiveShouldPostFeed ? "YES" : "no"} (cap ${maxPostsPerDay}/day). ` +
      `Story: ${effectiveShouldPostStory ? "YES" : "no"} (cap ${maxStoriesPerDay}/day).`
    );

    // ===========================================
    // STEP 2: FETCH TODAY'S COUNTS (single source of truth for caps)
    // ===========================================
    // Uses the dedicated /api/admin/social?action=today-counts endpoint so the
    // timezone math (start-of-day CST) and the count SQL live in ONE place.
    let postsMadeToday = 0;
    let storiesMadeToday = 0;
    try {
      const countsUrl = `${siteUrl}/api/admin/social?action=today-counts`;
      const countsRes = await fetch(countsUrl, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (countsRes.ok) {
        const countsData = await countsRes.json();
        if (countsData.success && countsData.data) {
          postsMadeToday = Number(countsData.data.feedPostsToday) || 0;
          storiesMadeToday = Number(countsData.data.storiesToday) || 0;
          console.log(
            `[Social Auto-Post] Today's counts (since ${countsData.data.startOfTodayCST}): ` +
            `feed=${postsMadeToday}/${maxPostsPerDay}, stories=${storiesMadeToday}/${maxStoriesPerDay}`
          );
        }
      } else {
        console.warn(`[Social Auto-Post] today-counts returned ${countsRes.status}, caps will be unenforceable`);
      }
    } catch (err) {
      console.warn("[Social Auto-Post] Could not fetch today's counts:", errMsg(err));
    }

    // ===========================================
    // STEP 3: FEED PATH (capped by maxPostsPerDay)
    // ===========================================
    let feedResult: { success: boolean; message: string; processedCount: number; skipped: boolean; reason?: string } = {
      success: false,
      message: "Feed path not run",
      processedCount: 0,
      skipped: true,
      reason: "not_triggered",
    };

    if (effectiveShouldPostFeed) {
      if (postsMadeToday >= maxPostsPerDay) {
        console.log(
          `[Social Auto-Post] Feed daily limit reached: ${postsMadeToday}/${maxPostsPerDay}. Skipping feed path.`
        );
        feedResult = {
          success: false,
          message: `Daily feed limit reached (${postsMadeToday}/${maxPostsPerDay})`,
          processedCount: 0,
          skipped: true,
          reason: "daily_limit_reached",
        };
      } else {
        const remainingQuota = maxPostsPerDay - postsMadeToday;
        const itemsToProcess = Math.min(postsPerRun, remainingQuota);

        console.log(
          `[Social Auto-Post] Feed posts today: ${postsMadeToday}/${maxPostsPerDay}. ` +
          `Can process ${itemsToProcess} item(s) this run (requested: ${postsPerRun}).`
        );

        const feedResults: Array<{ success: boolean; message: string }> = [];
        let processedCount = 0;

        for (let i = 0; i < itemsToProcess; i++) {
          const processUrl = `${siteUrl}/api/admin/social`;

          try {
            const bodyPayload: Record<string, unknown> = { action: "process-next" };

            const response = await fetch(processUrl, {
              method: "POST",
              headers,
              body: JSON.stringify(bodyPayload),
              signal: AbortSignal.timeout(50_000),
            });

            const data = await response.json();

            if (response.ok && data.success) {
              console.log(`[Social Auto-Post] Feed item ${i + 1}/${itemsToProcess} posted:`, data.message);
              feedResults.push({ success: true, message: data.message });
              processedCount++;
              postsMadeToday++;
            } else if (response.ok && !data.success) {
              console.log(`[Social Auto-Post] No more feed items after ${processedCount} items:`, data.message);
              feedResults.push({ success: false, message: data.message });
              break;
            } else {
              console.error(`[Social Auto-Post] API error on feed item ${i + 1}:`, data);
              feedResults.push({ success: false, message: data.error || data.message || "API error" });
            }
          } catch (err) {
            console.error(`[Social Auto-Post] Exception on feed item ${i + 1}:`, errMsg(err));
            feedResults.push({ success: false, message: errMsg(err) });
          }
        }

        const successCount = feedResults.filter(r => r.success).length;
        feedResult = {
          success: successCount > 0,
          message: `Feed: ${successCount}/${feedResults.length} items posted`,
          processedCount,
          skipped: false,
        };
      }
    }

    // ===========================================
    // STEP 4: STORY PATH (capped by maxStoriesPerDay — INDEPENDENT of feed cap)
    // ===========================================
    let storyResult: { success: boolean; message: string; throwback?: boolean; skipped?: boolean; reason?: string } = {
      success: false,
      message: "Story path not run",
    };

    if (effectiveShouldPostStory) {
      if (storiesMadeToday >= maxStoriesPerDay) {
        console.log(
          `[Social Auto-Post] Story daily limit reached: ${storiesMadeToday}/${maxStoriesPerDay}. Skipping story path.`
        );
        storyResult = {
          success: false,
          message: `Daily story limit reached (${storiesMadeToday}/${maxStoriesPerDay})`,
          skipped: true,
          reason: "daily_limit_reached",
        };
      } else {
        const storyUrl = `${siteUrl}/api/admin/social`;
        try {
          const response = await fetch(storyUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ action: "process-next-story-only" }),
            signal: AbortSignal.timeout(50_000),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            console.log("[Social Auto-Post] Throwback IG Story posted:", data.message);
            storyResult = {
              success: true,
              message: data.message,
              throwback: !!data.throwback,
            };
            storiesMadeToday++;
          } else {
            console.warn("[Social Auto-Post] Throwback IG Story did not post:", data.message || data.error);
            storyResult = {
              success: false,
              message: data.message || data.error || "Story post failed",
              skipped: !!data.skipped,
              reason: data.reason,
            };
          }
        } catch (err) {
          console.error("[Social Auto-Post] Exception on throwback story:", errMsg(err));
          storyResult = { success: false, message: errMsg(err) };
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(
      `[Social Auto-Post] Run complete in ${elapsed}s: ` +
      `Feed=${feedResult.message}, Story=${storyResult.success ? "yes" : (storyResult.skipped ? "skipped: " + (storyResult.reason || "") : "no")}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: feedResult.success || storyResult.success,
        message: `Feed: ${feedResult.message} | Story: ${storyResult.message} | in ${elapsed}s`,
        elapsed: `${elapsed}s`,
        feedResult,
        storyResult,
        counts: {
          postsMadeToday,
          storiesMadeToday,
        },
        config: {
          postsPerRun,
          scheduleHours,
          storyScheduleHours,
          maxPostsPerDay,
          maxStoriesPerDay,
          shouldPostFeed: effectiveShouldPostFeed,
          shouldPostStory: effectiveShouldPostStory,
        },
      }),
    };
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[Social Auto-Post] Exception after ${elapsed}s:`, errMsg(error));

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Internal error",
        error: errMsg(error),
        elapsed: `${elapsed}s`,
      }),
    };
  }
};

export { handler };
