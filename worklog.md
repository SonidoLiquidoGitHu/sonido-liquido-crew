---
Task ID: 1
Agent: Main Agent
Task: Add TikTok support, curated tracks, and one-click queue population to Social Auto-Post system

Work Log:
- Read and analyzed all existing social auto-post code (schema, meta client, admin API, admin UI, populate script)
- Added `curated_track` content type to social_post_queue and social_posts_log schema
- Added `tiktok` platform to both schema tables
- Created new TikTok Content Posting API client (src/lib/clients/tiktok.ts) with Direct Post, Photo Post, OAuth helpers
- Updated Meta client (src/lib/clients/meta.ts) to include TikTok in processQueueItem, added curated_track caption template
- Updated admin API (src/app/api/admin/social/route.ts) with real populate action, TikTok validation, clear-queue, content counts
- Updated admin UI (src/app/admin/social/page.tsx) with Poblar Cola button, TikTok status, curated track type, platform selection
- Added v2 auto-migration in db/client.ts that removes CHECK constraints and supports new content types/platforms
- Updated populate script to include curated tracks and TikTok platform
- Updated .env.example with TikTok env vars (TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_ACCESS_TOKEN)
- Verified build passes cleanly
- Committed all 9 file changes

Stage Summary:
- User no longer needs to run terminal commands — "Poblar Cola" button in admin UI does it
- TikTok support added (requires Developer App setup — client_key, client_secret, access_token)
- Curated tracks from curated Spotify artists now included in queue population
- Social tables auto-migrate from v1 (restrictive CHECK constraints) to v2 (flexible, no CHECK constraints)
- All 3 platforms (FB + IG + TikTok) supported in queue items and post processing
