import type { Handler } from "@netlify/functions";

// ===========================================
// NETLIFY SCHEDULED FUNCTION — SOCIAL AUTO-POSTER
// ===========================================
// HARD-DISABLED 2026-06-20.
//
// The autopost was posting uncontrollably (same IG Story 10+ times).
// Root cause (diagnosed and fixed in src/app/api/admin/social/route.ts
// on this same date):
//
//   1. today-counts story query filtered on platform='instagram_story'
//      but returned 0 in production (column-value drift). Switched the
//      query to use queueId LIKE 'throwback-%' instead — deterministic.
//      Without this, the daily cap NEVER triggered.
//
//   2. Story 7-day dedup key was sourceId::imageUrl. The imageUrl in
//      social_posts_log is the rewritten publicImageUrl, while
//      socialPostQueue stores the original URL — they never matched.
//      Plus the `|| eligibleItems[0]` fallback re-posted the same item
//      once all 50 had been "used". Fixed: key on sourceId only, removed
//      fallback, returns dedup_exhausted when no fresh item is available.
//
// The cron schedule was also REMOVED from netlify.toml so Netlify's
// scheduler will not even invoke this function.
//
// To re-enable (ONLY after verifying both fixes against production via
// the ?action=today-counts and ?action=story-history endpoints):
//   1. Restore the cron schedule in netlify.toml:
//        [functions."social-auto-post"]
//          schedule = "0 * * * *"
//          max_duration = 60
//   2. Replace this file with the full handler from git history
//      (commit 4c142e4 or earlier). The TS errors that blocked the
//      build on the dead-code tail must be fixed first — wrap
//      `err`/`error` in `err instanceof Error ? err.message : "Unknown error"`.
//   3. Verify by calling ?action=today-counts and confirming
//      storiesToday matches the actual count of throwback-* rows
//      in social_posts_log for today's CST window.

const handler: Handler = async () => {
  console.log("[Social Auto-Post] EMERGENCY KILL SWITCH ACTIVE — autopost disabled until root cause is verified fixed");
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: false,
      skipped: true,
      killed: true,
      message: "EMERGENCY KILL SWITCH: autopost disabled. See netlify/functions/social-auto-post.ts for re-enable instructions.",
    }),
  };
};

export { handler };
