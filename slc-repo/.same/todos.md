# Sonido Líquido Crew - TODOs

## Completed
- [x] Artist biographies script updated with all 14 artists
- [x] Fixed DropboxUploadButton props (uploadPath alias for folder, added size prop)
- [x] Successfully deployed to production at https://sonidoliquido.com
- [x] Ran update-artists-bios.ts script - all 14 artists updated with bios and press quotes

## Completed Recently
- [x] **Main Artist Field for Media Releases - Version 375** (March 2026)
  - Added "Artista Principal" section to media release forms
  - Dropdown to select artist from roster
  - Option to add custom artist name (for external/new artists)
  - Added mainArtistId and mainArtistName fields to database schema
  - Created migration script (0014_main_artist.sql)
  - Updated both new and edit media release forms

- [x] **Curated Playlists Setup - Version 368** (March 2026)
  - Added 15 roster artists as curated Spotify channels
  - Created 5 curated playlists: Gran Reserva, Lo Nuevo, Clásicos SLC, Colaboraciones, Picks de la Semana
  - Created simplified setup script (`setup-curated-playlists-simple.ts`) that works without Spotify API
  - Admin can sync tracks via /admin/curated-channels
  - Public playlists page at /playlists

- [x] **All Videos Associated with Artists - Version 367** (March 2026)
  - All 246 videos now properly associated with artists
  - 12 out of 15 artists have videos
  - Auto-associated 26 previously unassociated videos
  - Video distribution:
    - Zaque: 39 videos
    - Doctor Destino: 28 videos
    - Latin Geisha: 27 videos
    - Dilema: 26 videos
    - X Santa-Ana: 25 videos
    - Brez: 24 videos
    - Hassyel: 21 videos
    - Chas 7P: 16 videos
    - Bruno Grasso: 12 videos
    - Kev Cabrone: 12 videos
    - Q Master Weed: 9 videos
    - Fancy Freak: 7 videos
  - Missing videos: Codak, Reick One, Pepe Levine (need manual sync)

- [x] **Fixed Artist Channels Videos - Version 366** (March 2026)
  - ArtistChannels now fetches actual videos from API for each artist
  - Removed hardcoded video IDs that were showing wrong videos
  - Shows placeholder with channel link if no videos found
  - Added video thumbnail row for switching between multiple videos
  - Videos are cached to prevent refetching

- [x] **Deployed to Production - Version 365** (March 2026)
  - Live at: https://sonidoliquido.com
  - All features working correctly

- [x] Implemented Curated Spotify Channels feature (FULL IMPLEMENTATION)
  - Database schema: curated_spotify_channels, curated_tracks, playlist_tracks
  - Admin page at /admin/curated-channels (list & add channels)
  - Channel detail page at /admin/curated-channels/[id] (view & manage tracks)
  - Tracks browsing page at /admin/curated-channels/tracks (browse all tracks, add to playlists)
  - Playlists page at /admin/curated-channels/playlists (manage playlist contents)
  - API endpoints for all CRUD operations
  - Categories: roster, affiliate, collaborator, label, featured
  - Predefined playlists: Gran Reserva, Picks de la Semana, Nuevos Lanzamientos, Clásicos, Colaboraciones

- [x] Implemented "Save to Spotify" feature for users
  - Public playlists page at /playlists
  - Users can save curated playlists to their own Spotify account
  - Custom playlist name before saving
  - Option to automatically follow roster artists on Spotify
  - Shows cover preview with album art collage
  - Success/error messages with Spotify link
  - OAuth flow: /api/auth/spotify, /api/auth/spotify/callback

- [x] Fixed Instagram/Facebook in-app browser compatibility
- [x] Added credit message for beat download gate

- [x] **JSON Export of Site Settings and Data**
  - API endpoint at /api/admin/export for full data export
  - Export page at /admin/export with section selector
  - Can export: artists, releases, videos, events, subscribers, gallery, beats, campaigns, playlists, settings
  - Downloads as dated JSON file for migration/backup
  - Summary shows counts of exported items

- [x] **Template Selector for Music Collective Themes (FULL IMPLEMENTATION)**
  - Created /admin/themes page with 18 predefined themes
  - Themes include: Hip Hop Clásico, Trap Neón, Reggaetón Dorado, Rock/Metal, Electrónica Cyber, Indie Minimal, Jazz & Soul, Reggae Roots, K-Pop Pastel, Latino Tropical, Afrobeat Sunset, Synthwave Retro, Country Western, Punk Grunge, Lo-Fi Chill, Flamenco Español, Gospel Espiritual
  - Each theme includes: colors, fonts, border radius, button styles, card styles, animations
  - **Apply Theme**: Save selected theme to database, persists across sessions
  - **Preview Mode**: Opens public site in new tab with theme preview
  - **Custom Color Picker**: Edit any color with native color picker or hex input
  - Copy CSS variables or Tailwind config to clipboard
  - Download theme as JSON file
  - Theme API at /api/admin/theme (GET/POST)
  - ThemeProvider component for dynamic CSS variable application
  - Theme configurations in /lib/themes.ts

## Deployment
- [x] Deployed to production at https://sonidoliquido.com (Version 369 - with Curated Playlists)

## Pending - Post Deployment
- [x] Add Spotify Redirect URI in Spotify Developer Dashboard:
      `https://sonidoliquido.com/api/auth/spotify/callback`
- [x] Add environment variable SPOTIFY_REDIRECT_URI in Netlify

## ✅ Spotify "Save to Spotify" Feature - FULLY CONFIGURED (March 2026)
- Redirect URI configured in Spotify Developer Dashboard
- SPOTIFY_REDIRECT_URI environment variable set in Netlify
- Feature ready for production use

## 🔄 Track Sync Status (March 2026)
- **12 tracks synced** (Brez - first album)
- **Sync scripts created** with rate limiting support:
  - `scripts/sync-all-sequential.ts` - syncs all artists with retry
  - `scripts/sync-single-artist.ts` - syncs one artist for testing
- **Rate limited by Spotify** - waiting for cooldown
- Can also sync manually via admin: `/admin/curated-channels` > Click "Sync Tracks"

## ✅ Follow Artists Feature - IMPROVED (March 2026)
- Now uses artistsRoster directly to get Spotify IDs
- All 15 roster artists will be followed automatically
- Works even if tracks aren't synced yet
- Users just need to toggle "Seguir a los artistas" when saving playlist

## Completed - Database Migration
- [x] Run migration to add main_artist_id and main_artist_name columns to media_releases table
  - Migration file: `src/db/migrations/0014_main_artist.sql`
  - **FIXED (March 31, 2026)**: Columns were missing, causing 500 error. Added manually via script.

## Notes
- Deployment URL: https://sonidoliquido.com
- Latest Version: 375

## Save to Spotify Feature

### User Flow:
1. Visit /playlists
2. Click on a playlist to expand tracks
3. Click "Guardar en mi Spotify"
4. Customize playlist name
5. Toggle "Seguir a los artistas" option
6. Click "Guardar y Conectar con Spotify"
7. Authorize on Spotify
8. Playlist created with all tracks + artists followed

### Required Spotify Developer Dashboard Config:
- App Settings > Redirect URIs > Add:
  - For dev: http://localhost:3000/api/auth/spotify/callback
  - For prod: https://sonidoliquido.com/api/auth/spotify/callback

### Required Scopes:
- playlist-modify-public
- playlist-modify-private
- user-read-private
- user-follow-modify
- ugc-image-upload
