# Sonido Líquido Crew — Project Deployment Report

**Generated:** April 21, 2026
**Purpose:** Complete handoff document for ChatGPT / AI-assisted Netlify deployment and continued development

---

## 1. Project Overview

| Field | Value |
|-------|-------|
| Name | Sonido Líquido Crew — Music Collective Website |
| Framework | Next.js 16.1.3 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (40+ components) |
| Data Sources | Spotify Web API, YouTube Data API v3, Mailchimp API |
| Deployment | Netlify (serverless, @netlify/plugin-nextjs) |
| Status | Production-ready — requires env vars to be set |

### What This Site Does

This is the official website for **Sonido Líquido Crew**, a Mexican Hip Hop collective founded in 1999 in Mexico City by Zaque. The site dynamically fetches real artist data from Spotify (followers, popularity, releases, top tracks, album art), embeds YouTube music videos, and integrates Mailchimp for newsletter subscriptions. All 15 artists in the collective are configured with Spotify IDs, Instagram profiles, and YouTube channel mappings.

---

## 2. Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.3 | React framework with App Router |
| React | 19 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| shadcn/ui | Latest | Pre-built UI components (Radix-based) |
| Lucide React | 0.525 | Icon library |
| sharp | 0.34 | Server-side image optimization |

---

## 3. Current Routes

| Route | Type | Rendering | Data Source | Status |
|-------|------|-----------|-------------|--------|
| `/` | Page | Client Component | `fetch("/api/artists")` | Working |
| `/artistas` | Page | Client Component | `fetch("/api/artists")` | Working |
| `/artistas/[slug]` | Page | Client Component | `fetch("/api/artists/[id]")` | Working |
| `/api/artists` | API Route (GET) | Server | Spotify Client Credentials | Working (needs Spotify creds) |
| `/api/artists/[id]` | API Route (GET) | Server | Spotify + YouTube APIs | Working (needs Spotify + YouTube creds) |
| `/api/subscribe` | API Route (POST) | Server | Mailchimp API v3 | Working (needs Mailchimp creds) |

**Note:** The `[slug]` in `/artistas/[slug]` is actually the **Spotify artist ID** (e.g., `/artistas/2jJmTEMkGQfH3BxoG3MQvF`), not a human-readable slug.

---

## 4. File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (dark theme, Geist fonts, Header, Footer, ErrorBoundary)
│   ├── page.tsx                # Homepage (hero, stats, artists grid, playlist embed, newsletter)
│   ├── error.tsx               # Next.js route-level error page with expandable log
│   ├── globals.css             # Tailwind CSS 4 + dark theme variables + custom animations
│   ├── api/
│   │   ├── artists/
│   │   │   ├── route.ts        # GET /api/artists — all 15 artists from Spotify
│   │   │   └── [id]/
│   │   │       └── route.ts    # GET /api/artists/[id] — artist detail + tracks + releases + YouTube videos
│   │   └── subscribe/
│   │       └── route.ts        # POST /api/subscribe — Mailchimp newsletter subscription
│   └── artistas/
│       ├── page.tsx            # Artists listing page (4-col grid, stats bar)
│       └── [slug]/
│           └── page.tsx        # Artist detail page (Spotify embed, tracks, releases, YouTube, socials)
├── components/
│   ├── error-boundary.tsx      # React class ErrorBoundary with reporter integration
│   ├── newsletter-form.tsx     # Reusable Mailchimp newsletter form (hero + footer variants)
│   ├── layout/
│   │   ├── header.tsx          # Sticky header with mobile hamburger menu
│   │   ├── footer.tsx          # 4-column footer with newsletter form
│   │   └── artist-card.tsx     # Reusable artist card with Instagram + Spotify links
│   └── ui/                     # 40+ shadcn/ui components (button, card, dialog, etc.)
├── hooks/
│   ├── use-toast.ts            # Toast state management (shadcn)
│   └── use-mobile.ts           # Mobile breakpoint detection hook
└── lib/
    ├── artist-config.ts        # Static config: 15 artists with Spotify IDs, Instagram, YouTube channels
    ├── error-reporter.ts       # Central structured error logging with severity levels
    ├── types.ts                # Shared types: Artist, Track, Release, YouTubeVideo + utilities
    └── utils.ts                # cn() utility (clsx + tailwind-merge)
```

**Root-level config files:**

```
.env.example              # All required/optional env vars documented
next.config.ts            # standalone output, remote image patterns
netlify.toml              # Build command + @netlify/plugin-nextjs
tailwind.config.ts        # Tailwind CSS 4 config
tsconfig.json             # TypeScript config (skills/agent-ctx excluded)
components.json           # shadcn/ui configuration
package.json              # Dependencies and scripts
```

---

## 5. Data Architecture

### 5.1 Spotify Integration

- **Auth flow:** Client Credentials (no user login required)
- **Token management:** In-memory cache with auto-refresh 60 seconds before expiry
- **Data fetched:** Artist name, image, followers, popularity, top tracks, albums/releases
- **API route:** `/api/artists` fetches all 15 artists in parallel; `/api/artists/[id]` fetches single artist detail with tracks, releases, and YouTube videos

### 5.2 YouTube Integration

- **Auth:** API key only (no OAuth)
- **Search strategy (3-tier):**
  1. Search within the artist's configured YouTube channel
  2. Search within the main SLC crew channel (UCy6tHVzGmZ_ehIBWcdrTuRA)
  3. Generic YouTube search for "Artist Name Sonido Líquido"
- **Results:** Deduplicated by videoId, max 6 videos per artist
- **Fallback:** If YOUTUBE_API_KEY is not set, shows "Search on YouTube" link instead of embedded players

### 5.3 Mailchimp Integration

- **Auth:** API key with Basic auth
- **Endpoint:** POST to `/lists/{audience_id}/members`
- **Behavior:** Subscribes with "subscribed" status, tags with "website-signup"
- **Graceful degradation:** If env vars not set, returns 503 with friendly message — site never crashes
- **Duplicate handling:** "Member Exists" error returns friendly "already subscribed" message

### 5.4 Static Artist Config

The file `src/lib/artist-config.ts` contains configuration that Spotify does NOT provide:
- Instagram profile URLs (all 15 artists)
- YouTube channel IDs (5 artists have individual channels, rest use SLC crew channel)
- YouTube handles (for display on buttons)

This data is merged with Spotify API data at the API route level.

---

## 6. Shared Types

```typescript
// src/lib/types.ts — Single source of truth

interface Artist {
  id: string;             // Spotify artist ID
  name: string;
  image: string;          // Spotify artist image URL
  followers: number;
  spotifyUrl: string;
  popularity: number;     // 0-100 from Spotify
  releases: number;       // album/single/EP count from Spotify
  instagram: string | null;       // From artist-config.ts
  youtubeChannelId: string | null; // From artist-config.ts
  youtubeHandle: string | null;    // From artist-config.ts
}

interface Track {
  id: string;
  name: string;
  album: string;
  albumImage: string;
  durationMs: number;
  spotifyUrl: string;
  previewUrl: string | null;  // 30-second Spotify preview
}

interface Release {
  id: string;
  name: string;
  artistName: string;
  image: string;
  releaseDate: string;
  type: "album" | "single" | "compilation";
  spotifyUrl: string;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}
```

---

## 7. Environment Variables

### Required (site will not work without these)

| Variable | Used By | How to Get |
|----------|---------|------------|
| `SPOTIFY_CLIENT_ID` | `/api/artists`, `/api/artists/[id]` | https://developer.spotify.com/dashboard → Create App → Settings |
| `SPOTIFY_CLIENT_SECRET` | `/api/artists`, `/api/artists/[id]` | Same as above |

### Optional but Recommended

| Variable | Used By | How to Get | Fallback if Missing |
|----------|---------|------------|---------------------|
| `YOUTUBE_API_KEY` | `/api/artists/[id]` | Google Cloud Console → Enable YouTube Data API v3 → Create API Key | Artist pages show "Search on YouTube" button instead of embedded videos |
| `MAILCHIMP_API_KEY` | `/api/subscribe` | mailchimp.com → Account → Extras → API keys | Newsletter forms show "service not configured" message |
| `MAILCHIMP_SERVER_PREFIX` | `/api/subscribe` | Everything after the dash in your API key (e.g. "us1") | Same as above |
| `MAILCHIMP_AUDIENCE_ID` | `/api/subscribe` | Audience → Settings → Audience name and defaults | Same as above |

### .env File Template

```env
# REQUIRED
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# OPTIONAL - YouTube videos on artist pages
YOUTUBE_API_KEY=your_youtube_api_key_here

# OPTIONAL - Newsletter subscription
MAILCHIMP_API_KEY=your_mailchimp_api_key_here
MAILCHIMP_SERVER_PREFIX=us1
MAILCHIMP_AUDIENCE_ID=your_audience_id_here
```

---

## 8. 15 Artists Roster

| Spotify ID | Artist Name | Instagram | YouTube Channel |
|-----------|-------------|-----------|-----------------|
| `2jJmTEMkGQfH3BxoG3MQvF` | Brez | @brez_idc | UCxVg9-xrVGfjtRd_N32EuTA (own channel) |
| `4fNQqyvcM71IyF2EitEtCj` | Bruno Grasso | @brunograssosl | SLC crew channel |
| `3RAg8fPmZ8RnacJO8MhLP1` | Chas7Pecados | @chas7pecados | SLC crew channel |
| `2zrv1oduhIYh29vvQZwI5r` | Codak (I Like Big Buds) | @ilikebigbuds_i_canot_lie | SLC crew channel |
| `3eCEorgAoZkvnAQLdy4x38` | Dilema La Dee | @dilema_ladee | SLC crew channel |
| `5urer15JPbCELf17LVia7w` | Doctor Destino | @estoesdoctordestino | UCGXC-OtIZ7PHOHBKZTE4mIw (own channel) |
| `5TMoczTLclVyzzDY5qf3Yb` | Fancy Freak | @fancyfreakcorp | SLC crew channel |
| `6AN9ek9RwrLbSp9rT2lcDG` | Hassyel | @hassyel_s.l.c | SLC crew channel |
| `0QdRhOmiqAcV1dPCoiSIQJ` | Kev Cabrone | @kev.cabrone | SLC crew channel |
| `16YScXC67nAnFDcA2LGdY0` | Latin Geisha | @latingeishamx | UCZvZ8tbIZKt9IzO42Y8_gtw (own channel) |
| `5HrBwfVDf0HXzGDrJ6Znqc` | Pepe Levine | @pepelevineonline | Zaque's channel |
| `4T4Z7jvUcMV16VsslRRuC5` | Q.Master W | @q.masterw | SLC crew channel |
| `4UqFXhJVb9zy2SbNx4ycJQ` | Reick Uno | @reickuno | SLC crew channel |
| `2Apt0MjZGqXAd1pl4LNQrR` | Santa Ana | @x_santa_ana | SLC crew channel |
| `4WQmw3fIx9F7iPKL5v8SCN` | Zaque | @zaqueslc | UCXLJPF4RRLT4aoVJkXG80bg (own channel) |

**SLC Crew YouTube Channel:** UCy6tHVzGmZ_ehIBWcdrTuRA (@sonidoliquidocrew)

---

## 9. Netlify Deployment Setup

### 9.1 Build Configuration (already in repo)

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**next.config.ts:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",  // Required for Netlify serverless functions
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co", pathname: "/image/**" },
      { protocol: "https", hostname: "mosaic.scdn.co", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "dl.dropboxusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/**" },
    ],
  },
  reactStrictMode: true,
};

export default nextConfig;
```

### 9.2 Netlify Dashboard Settings

1. **Build command:** `npm run build`
2. **Publish directory:** `.next`
3. **Plugin:** `@netlify/plugin-nextjs` (auto-suggested by Netlify when it detects Next.js)
4. **Node version:** Set `NODE_VERSION` env var to `20` or `22`

### 9.3 Environment Variables on Netlify

Go to **Site settings → Environment variables** and add:

| Variable | Required | Example |
|----------|----------|---------|
| `SPOTIFY_CLIENT_ID` | YES | `abc123def456...` |
| `SPOTIFY_CLIENT_SECRET` | YES | `xyz789ghi012...` |
| `YOUTUBE_API_KEY` | No | `AIzaSy...` |
| `MAILCHIMP_API_KEY` | No | `abc123-us8` |
| `MAILCHIMP_SERVER_PREFIX` | No | `us8` |
| `MAILCHIMP_AUDIENCE_ID` | No | `a1b2c3d4e5` |
| `NODE_VERSION` | Recommended | `20` |

---

## 10. Spotify API Setup Guide

1. Go to https://developer.spotify.com/dashboard
2. Click **"Create App"**
3. Fill in:
   - App name: `Sonido Liquido`
   - App description: `Music collective website`
   - Redirect URI: `http://localhost:3000` (required field but unused for Client Credentials)
   - Web API: checked
4. After creating, go to app **Settings**
5. Copy **Client ID** and **Client Secret**
6. Add them to Netlify environment variables

**Important:** Client Credentials flow gives access to public data only (artist info, tracks, albums). No user authentication or login is needed. Rate limits are approximately 180 requests per 30 seconds — with 15 artists this is well within limits.

---

## 11. YouTube API Setup Guide

1. Go to https://console.cloud.google.com
2. Create or select a project
3. Enable **"YouTube Data API v3"** in APIs & Services → Library
4. Go to APIs & Services → Credentials → Create Credentials → API Key
5. (Recommended) Restrict the key to "YouTube Data API v3" only
6. Add to Netlify environment variables

**If not configured:** Artist detail pages still work but show a "Search on YouTube" link instead of embedded video players.

---

## 12. Mailchimp Setup Guide

1. Log in to https://mailchimp.com
2. Go to **Account → Extras → API keys → Create A Key**
3. The API key format is `{key}-{server_prefix}` (e.g. `abc123-us8`)
4. The **server prefix** is everything after the dash (e.g. `us8`)
5. Go to **Audience → Settings → Audience name and defaults** to find your **Audience ID**
6. Add all three values to Netlify environment variables

**If not configured:** Newsletter forms still appear but show "service not configured" message instead of subscribing.

---

## 13. Design System

### Dark Theme Colors (globals.css)

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#0a0a0a` | Page background |
| `--foreground` | `#ffffff` | Primary text |
| `--card` | `#1a1a1a` | Card backgrounds |
| `--primary` | `#22c55e` | Green accent (Spotify-style) |
| `--primary-foreground` | `#0a0a0a` | Text on green buttons |
| `--muted-foreground` | `#888888` | Secondary text |
| `--border` | `#2a2a2a` | Borders and dividers |
| `--input` | `#2a2a2a` | Input field borders |

### Custom CSS Animations

- **`.animate-marquee`** — 30s infinite horizontal scroll for artist name ticker
- **`.animate-pulse-green`** — 2s ease-in-out pulse for "Now Playing" indicator

### Fonts

- **Geist Sans** (variable `--font-geist-sans`) — Body text
- **Geist Mono** (variable `--font-geist-mono`) — Code/monospace

---

## 14. Key Features

### Homepage (`/`)
- Hero section with "SONIDO LÍQUIDO" title and CTA buttons
- Animated artist name marquee ticker
- Stats bar (artists count, releases, followers, years)
- Featured artists grid (first 6)
- "Now Playing" spotlight section
- Latest releases grid (8 artists with play overlay)
- Spotify playlist embed (playlist ID: 5qHTKCZIwi3GM3mhPq45Ab)
- Newsletter CTA with Mailchimp integration

### Artists Page (`/artistas`)
- Full 15-artist grid (4 columns on desktop)
- Collective stats bar (total followers, total releases)
- Each card shows: image, name, followers, releases, Instagram link, popularity bar
- Loading/error/empty states

### Artist Detail Page (`/artistas/[slug]`)
- Large artist header with image + stats (followers, popularity, releases)
- Spotify artist embed (full player)
- Top tracks with 30-second audio preview playback
- Latest releases grid with cover art
- YouTube video section (embedded iframes, up to 6 videos)
- Social CTAs: Spotify, Instagram, YouTube channel

### Newsletter (Homepage + Footer)
- Mailchimp-powered subscription form
- Two visual variants: hero (with mail icon) and footer (compact)
- Full UX flow: idle → loading (spinner) → success (checkmark) / error (retry)
- Graceful fallback when Mailchimp not configured

---

## 15. API Details

### GET /api/artists

Returns all 15 artists as a flat JSON array.

**Response example:**
```json
[
  {
    "id": "2jJmTEMkGQfH3BxoG3MQvF",
    "name": "Brez",
    "image": "https://i.scdn.co/image/...",
    "followers": 15234,
    "spotifyUrl": "https://open.spotify.com/artist/2jJmTEMkGQfH3BxoG3MQvF",
    "popularity": 42,
    "releases": 8,
    "instagram": "https://www.instagram.com/brez_idc",
    "youtubeChannelId": "UCxVg9-xrVGfjtRd_N32EuTA",
    "youtubeHandle": "@brezhiphopmexicoslc25"
  }
]
```

### GET /api/artists/[id]

Returns a single artist with tracks, releases, and YouTube videos.

**Response example:**
```json
{
  "artist": { /* same shape as above */ },
  "tracks": [
    {
      "id": "trackId123",
      "name": "Track Name",
      "album": "Album Name",
      "albumImage": "https://i.scdn.co/image/...",
      "durationMs": 210000,
      "spotifyUrl": "https://open.spotify.com/track/...",
      "previewUrl": "https://p.scdn.co/mp3-preview/..."
    }
  ],
  "releases": [
    {
      "id": "albumId456",
      "name": "Album Name",
      "artistName": "Artist Name",
      "image": "https://i.scdn.co/image/...",
      "releaseDate": "2024-01-15",
      "type": "album",
      "spotifyUrl": "https://open.spotify.com/album/..."
    }
  ],
  "videos": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "Official Video",
      "thumbnail": "https://i.ytimg.com/vi/...",
      "channelTitle": "SonidoLiquidoCrew"
    }
  ]
}
```

### POST /api/subscribe

Subscribes an email to the Mailchimp audience.

**Request:**
```json
{ "email": "user@example.com" }
```

**Success response (200):**
```json
{ "message": "Te has suscrito exitosamente! Bienvenido al crew.", "status": "subscribed" }
```

**Already subscribed (200):**
```json
{ "message": "Ya estas suscrito. Gracias por ser parte del crew!", "status": "already_subscribed" }
```

**Not configured (503):**
```json
{ "error": "El servicio de newsletter no esta configurado todavia...", "notConfigured": true }
```

---

## 16. Known Limitations and Future Improvements

### Current Limitations

1. **No caching layer** — Every page visit hits the Spotify API. Could add Redis, Upstash, or simple in-memory cache with TTL for production traffic.
2. **No `/discografia` page** — The nav links to `/discografia` but no page exists yet. Currently redirects to `/artistas`.
3. **No `/beats`, `/videos`, `/eventos` pages** — Nav items point to anchors on `/artistas` but dedicated pages don't exist.
4. **No custom 404 page** — Next.js default 404 doesn't match the dark theme.
5. **Many unused npm dependencies** — The project has 30+ unused packages (see package.json) that bloat the install size. These are from the initial scaffold and can be safely removed.
6. **No image optimization fallback** — If Spotify images fail to load, there's a text initial fallback but no placeholder image.
7. **Spotify preview URLs can expire** — The 30-second audio preview URLs from Spotify are temporary and may stop working after some time.

### Recommended Improvements

1. **Add API response caching** — Use Next.js `revalidate` or a cache layer to avoid hitting Spotify on every request
2. **Create missing pages** — `/discografia`, `/videos`, `/eventos`, `/contacto`, `/nosotros`
3. **Add custom 404** — Create `src/app/not-found.tsx` with dark theme
4. **Clean up dependencies** — Remove unused packages to speed up Netlify builds
5. **Add loading skeletons** — Better perceived performance on artist pages
6. **Add SEO metadata** — Per-page metadata, Open Graph images, structured data
7. **Add analytics** — Vercel Analytics, Plausible, or similar privacy-friendly option
8. **Rate limiting on /api/subscribe** — Prevent abuse of the newsletter endpoint
9. **Move Spotify embed playlist ID to env var** — Currently hardcoded in homepage
10. **Add sitemap.xml and robots.txt** — For search engine indexing

---

## 17. Build Verification

The project builds cleanly with zero TypeScript errors:

```
▲ Next.js 16.1.3 (Turbopack)
- Environments: .env
✓ Compiled successfully
✓ Generating static pages (6/6)

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/artists
├ ƒ /api/artists/[id]
├ ƒ /api/subscribe
├ ○ /artistas
└ ƒ /artistas/[slug]

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

---

## 18. Quick Deploy Checklist

- [ ] Download and unzip the project
- [ ] Run `npm install`
- [ ] Create `.env` file with Spotify credentials (required)
- [ ] Optionally add YouTube and Mailchimp env vars
- [ ] Run `npm run build` to verify it compiles
- [ ] Push to GitHub repository
- [ ] Connect repo to Netlify
- [ ] Add all environment variables in Netlify dashboard
- [ ] Deploy
- [ ] Test `/api/artists` returns JSON with artist data
- [ ] Test `/artistas` page loads all 15 artists
- [ ] Test `/artistas/{any-spotify-id}` shows artist detail
- [ ] Test newsletter form on homepage
- [ ] Test newsletter form in footer
