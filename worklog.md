---
Task ID: 1
Agent: Main Agent
Task: Add complete artist profiles with Spotify audio, YouTube videos, Instagram links

Work Log:
- Created src/lib/artist-config.ts with Instagram URLs for 12 of 15 artists
- Updated Artist type to include instagram, youtubeChannelId, youtubeHandle
- Added YouTubeVideo type and searchYouTubeVideos() function to /api/artists/[id]
- Updated /api/artists route to merge Spotify data with static config (Instagram etc)
- Updated /api/artists/[id] route with YouTube Data API v3 video search
- Redesigned /artistas/[slug] detail page with:
  - Full Spotify artist embed (audio player)
  - Top tracks with play preview buttons (30s audio previews)
  - Latest releases grid with cover art
  - YouTube video embeds (if YOUTUBE_API_KEY set) or search fallback
  - Instagram link button (pink)
  - YouTube channel link button (red)
  - Spotify CTA button (green)
- Updated /artistas grid with Instagram icons on each card
- Updated homepage artist cards with Instagram icons
- Updated .env.example with YOUTUBE_API_KEY documentation
- Updated shared artist-card component with Instagram support

Stage Summary:
- All 15 artists have Spotify audio integration via embeds + preview playback
- 12 artists have Instagram links (Codak, Hassyel, Reick One don't have public Instagram)
- YouTube integration: full video search if YOUTUBE_API_KEY is set, otherwise search link fallback
- Build passes cleanly with zero errors

---
Task ID: 2
Agent: Main Agent
Task: Add missing Instagram profiles for Codak, Hassyel, and Reick

Work Log:
- Used web search to identify Spotify ID → artist name mappings for the 3 artists with null Instagram
- Confirmed: Codak = 2zrv1oduhIYh29vvQZwI5r, Hassyel = 6AN9ek9RwrLbSp9rT2lcDG, Reick Uno = 4UqFXhJVb9zy2SbNx4ycJQ
- Added Instagram URLs provided by user:
  - Reick Uno → https://www.instagram.com/reickuno/
  - Codak → https://www.instagram.com/ilikebigbuds_i_canot_lie/
  - Hassyel → https://www.instagram.com/hassyel_s.l.c/
- Updated src/lib/artist-config.ts with all 3 Instagram URLs
- Build verified passing with zero errors

Stage Summary:
- All 15 artists now have Instagram links (previously 12/15, now 15/15)
- Build passes cleanly
