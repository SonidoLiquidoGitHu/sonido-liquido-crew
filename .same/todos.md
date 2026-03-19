# Sonido Líquido Crew - Development Tasks

## Current Status
- **Dev Server**: Running on port 3001
- **Build**: Passes without errors
- **Linter**: Clean, no errors

## Completed Tasks
- [x] Rebuilt project with updated database schema
- [x] Added video thumbnails from YouTube to Videos section
- [x] Created admin dashboard with sync logs display
- [x] Added support for real album cover images from Spotify
- [x] Improved artist cards with profile photo support
- [x] Created all API routes (artists, releases, videos, events, sync)
- [x] Seeded sample YouTube videos
- [x] **DEPLOYMENT FIXES (Session 2)**:
  - [x] Fixed ESLint error: Changed `<a href="/">` to `<Link href="/">` in admin/login/page.tsx
  - [x] Fixed React Hook dependency warning in ReleaseEditModal.tsx
  - [x] Created missing `/releases/[id]/page.tsx` public release detail page
  - [x] Fixed netlify.toml configuration (removed conflicting NETLIFY_NEXT_PLUGIN_SKIP)
  - [x] Updated database connection to use in-memory SQLite for production/serverless when no Turso configured
  - [x] Added more image domains to netlify.toml remote_images
- [x] **BEATS CATALOG (Session 3)**:
  - [x] Created `beats` table in database schema
  - [x] Created `download_gate_actions` table for beat download requirements
  - [x] Created API routes: GET/POST `/api/beats`, GET/PUT/DELETE `/api/beats/[id]`
  - [x] Created `BeatEditModal.tsx` component with tabs (Básico, Archivo, Preview, Download Gate)
  - [x] Created `/admin/beats/page.tsx` - Admin page for managing beats
  - [x] Created `/beats/[id]/page.tsx` - Public beat detail page with download gate
  - [x] Added Beats link to admin dashboard Quick Actions
- [x] **SESSION 4 - DATABASE FIX**:
  - [x] Fixed next.config.js - removed deprecated eslint option
  - [x] Created `/api/seed` route for database initialization
  - [x] Seeded sample artists, releases, videos, and events
- [x] **SESSION 5 - THOROUGH DEPLOYMENT FIX**:
  - [x] Added `export const dynamic = "force-dynamic"` to ALL API routes
  - [x] Updated Spotify artist IDs with REAL 15 Sonido Líquido Crew members
  - [x] Added ARTIST_SOCIAL_LINKS with Instagram and YouTube for all artists
  - [x] Removed fake/placeholder stats fallbacks from homepage
  - [x] Updated Spotify sync to include social links (Instagram, YouTube)
  - [x] Fixed netlify.toml configuration (removed custom cache plugin)
  - [x] Build passes successfully with all routes properly configured
- [x] **SESSION 6 - VERIFICATION**:
  - [x] Dev server running and verified
  - [x] All 15 artist Spotify IDs confirmed
  - [x] All social links configured (Instagram + YouTube)
- [x] **SESSION 7 - PRÓXIMOS LANZAMIENTOS**:
  - [x] Created `upcoming_releases` table in database schema
  - [x] Created API routes: GET/POST `/api/upcoming-releases`, GET/PUT/DELETE `/api/upcoming-releases/[id]`
  - [x] Created admin page `/admin/upcoming-releases` with create/edit modal
  - [x] Added "Próximos Lanzamientos" section to homepage
  - [x] Features: countdown days, release type badges (Single/Album/EP), status badges (Listo/Promoción)
  - [x] Pre-save button linking to OneRPM
  - [x] Featured badge for highlighted releases
  - [x] Added "Próximos" link to admin Quick Actions

## Next Steps for Deployment

### 1. Clear Netlify Build Cache (REQUIRED)
The previous build error `'id' !== 'slug'` is caused by Netlify's cached routing data.
**You must clear the cache manually:**

1. Go to **Netlify Dashboard** → Your Site
2. Navigate to **Site settings** → **Build & deploy** → **Build settings**
3. Click **"Clear cache and deploy site"**

### 2. Add Spotify API Credentials
To enable real data sync from Spotify, add these environment variables in Netlify:

1. Go to **Netlify Dashboard** → Your Site → **Site settings**
2. Go to **Environment variables**
3. Add these variables:
   - `SPOTIFY_CLIENT_ID` - Your Spotify API client ID
   - `SPOTIFY_CLIENT_SECRET` - Your Spotify API client secret

To get Spotify credentials:
1. Go to https://developer.spotify.com/dashboard
2. Create a new application
3. Copy the Client ID and Client Secret

### 3. After Deployment
1. Visit `/admin` and login (credentials: sonidoliquido / lacremaynata)
2. Click **"Sync Now"** to pull real artist data from Spotify
3. This will populate all 15 artists with their photos, followers, releases, and social links

## Real Artist Spotify IDs (15 artists)

| Artist | Spotify ID | Instagram | YouTube |
|--------|------------|-----------|---------|
| Brez | 2jJmTEMkGQfH3BxoG3MQvF | @brez_idc | @brezhiphopmexicoslc25 |
| Bruno Grasso | 4fNQqyvcM71IyF2EitEtCj | @brunograssosl | @brunograssosl |
| Chas 7P | 3RAg8fPmZ8RnacJO8MhLP1 | @chas7pecados | @chas7p347 |
| Codak | 2zrv1oduhIYh29vvQZwI5r | @ilikebigbuds_i_canot_lie | @codak |
| Dilema | 3eCEorgAoZkvnAQLdy4x38 | @dilema_ladee | @dilema999 |
| Doctor Destino | 5urer15JPbCELf17LVia7w | @estoesdoctordestino | @doctordestinohiphop |
| Fancy Freak | 5TMoczTLclVyzzDY5qf3Yb | @fancyfreakcorp | @fancyfreakdj |
| Hassyel | 6AN9ek9RwrLbSp9rT2lcDG | @ilikebigbuds_i_canot_lie | channel/UCZp... |
| Kev Cabrone | 0QdRhOmiqAcV1dPCoiSIQJ | @kev.cabrone | @kevcabrone |
| Latin Geisha | 16YScXC67nAnFDcA2LGdY0 | @latingeishamx | @latingeishamx |
| Pepe Levine | 5HrBwfVDf0HXzGDrJ6Znqc | @pepelevineonline | @pepelevineonline |
| Q Master Weed | 4T4Z7jvUcMV16VsslRRuC5 | @q.masterw | @qmasterw |
| Reick One | 4UqFXhJVb9zy2SbNx4ycJQ | @reickuno | channel/UCMvZ... |
| X Santa-Ana | 2Apt0MjZGqXAd1pl4LNQrR | @x_santa_ana | @xsanta-ana |
| Zaque | 4WQmw3fIx9F7iPKL5v8SCN | @zaqueslc | @zakeuno |

## Configuration Notes
- **Database**: Using in-memory SQLite for demo, Turso for production
- **Production Database**: Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Netlify
- **Spotify sync**: Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET

## Features
### Homepage
- Hero video section with YouTube thumbnail
- Video thumbnail carousel
- Complete artist roster with profile images
- Stats bar showing artists, followers, releases (from database)
- Discography grid with album covers
- Videos section with thumbnails
- Upcoming events
- About section with statistics
- Contact information
- Social media links

### Admin Dashboard
- Stats cards (artists, releases, videos, events)
- Spotify sync button with status
- Last sync info and status indicator
- Sync history table with duration tracking
- Quick action links (Media Releases, Beats, Ver Sitio, Spotify, YouTube)
- Newsletter settings management

## Deployment
- Build command: `rm -rf .next node_modules && npm cache clean --force && npm install --legacy-peer-deps && npm run build`
- Publish directory: `.next`
- Platform: Netlify (dynamic site with @netlify/plugin-nextjs)
- **Important**: Clear cache before deploying to fix routing conflict
