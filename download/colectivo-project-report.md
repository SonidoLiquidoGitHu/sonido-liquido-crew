# Colectivo — Music Collective Project Report

**Generated:** April 21, 2026  
**Purpose:** Handoff document for deployment to Netlify and continued development

---

## 1. Project Overview

| Field | Value |
|-------|-------|
| Name | Colectivo — Music Collective Website |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Data Source | Spotify Web API (Client Credentials flow) |
| Target Platform | Netlify (serverless) |
| Status | ⚠️ Not production-ready — see Critical Issues below |

### Current Routes

| Route | Type | Data Source | Status |
|-------|------|-------------|--------|
| `/` | Server Component | Mock data (`@/lib/data/artists`) | ⚠️ Uses stale mock data |
| `/artistas` | Client Component | `fetch("/api/artists")` → Spotify API | ✅ Working (needs Spotify creds) |
| `/artistas/[slug]` | Client Component | `fetch("/api/artists")` → Spotify API | ✅ Working (slug = Spotify ID) |
| `/api/artists` | API Route (GET) | Spotify Client Credentials | ✅ Working (needs Spotify creds) |
| `/api` | API Route (GET) | Static health check | ✅ Working |

---

## 2. File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (dark theme, Header, Footer, ErrorBoundary)
│   ├── page.tsx                # Homepage (⚠️ still uses mock data)
│   ├── error.tsx               # Next.js route-level error page
│   ├── globals.css             # Dark theme CSS variables
│   ├── api/
│   │   ├── route.ts            # Health check: { message: "Hello, world!" }
│   │   └── artists/
│   │       └── route.ts        # Spotify API → artist array
│   └── artistas/
│       ├── page.tsx            # Artists grid (fetch from /api/artists)
│       └── [slug]/
│           └── page.tsx        # Artist detail (fetch from /api/artists, match by id)
├── components/
│   ├── error-boundary.tsx      # React ErrorBoundary with reporter
│   └── layout/
│       ├── header.tsx          # Sticky header with mobile menu
│       ├── footer.tsx          # Footer
│       └── artist-card.tsx     # ⚠️ UNUSED — still imports mock Artist type
├── hooks/
│   ├── use-toast.ts            # Toast state (shadcn)
│   └── use-mobile.ts           # Mobile breakpoint hook
└── lib/
    ├── data/
    │   └── artists.ts          # ⚠️ Mock data (6 artists) — only used by homepage now
    ├── error-reporter.ts       # Structured error reporter with in-memory buffer
    ├── db.ts                   # Prisma client (⚠️ UNUSED)
    └── utils.ts                # cn() utility (clsx + tailwind-merge)
```

---

## 3. 🔴 CRITICAL ISSUES — Must Fix Before Deploy

### 3.1 Homepage Uses Mock Data, /artistas Uses Spotify API

**Problem:** The homepage (`src/app/page.tsx`) imports `artists` from `@/lib/data/artists` — a file with 6 fake artists that have `slug`, `bio`, and `socials` fields. Meanwhile, `/artistas` fetches from `/api/artists` which returns 15 real Spotify artists with completely different fields (`followers`, `spotifyUrl`).

**Impact:** The homepage and the listing page show completely different sets of artists. The homepage links to `/artistas/luna-nocturna` (mock slug) while the detail page expects `/artistas/2jJmTEMkGQfH3BxoG3MQvF` (Spotify ID). Clicking a featured artist from the homepage will always show "Artist not found."

**Fix:** Convert the homepage to a client component that fetches from `/api/artists`, or make it a server component that calls the Spotify API directly. Remove the `@/lib/data/artists.ts` mock file entirely.

### 3.2 `/artistas` Listing Links to Spotify.com Instead of Detail Page

**Problem:** In `src/app/artistas/page.tsx`, each artist card is an `<a>` tag with `href={artist.spotifyUrl || "#"}`. This opens Spotify in a new tab instead of navigating to `/artistas/[id]`.

**Impact:** The detail page (`/artistas/[slug]`) is completely unreachable from the listing page. Users cannot view individual artist profiles on the site.

**Fix:** Change each card to link to `/artistas/${artist.id}`. Optionally add a separate "Open in Spotify" link on the detail page.

### 3.3 No Spotify Credentials in Environment

**Problem:** The API route requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` environment variables, but they're not in `.env`.

**Impact:** `/api/artists` returns 500 error: `"Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET"`. The entire /artistas page shows "Failed to load artists."

**Fix:**
1. Create a Spotify app at https://developer.spotify.com/dashboard
2. Get Client ID and Client Secret
3. Add to `.env`:
   ```
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```
4. On Netlify, add these under Site settings → Environment variables

### 3.4 `output: "standalone"` Is Incompatible with Netlify

**Problem:** `next.config.ts` sets `output: "standalone"`, which is designed for Docker/self-hosted deployment. Netlify uses its own Next.js runtime.

**Impact:** Deployment to Netlify will fail or behave incorrectly.

**Fix:** Remove `output: "standalone"` from `next.config.ts`. Use the Essential Next.js plugin on Netlify (auto-detected), or add a `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

## 4. 🟡 HIGH PRIORITY ISSUES

### 4.1 Three Different `Artist` Type Definitions

| Location | Shape |
|----------|-------|
| `src/lib/data/artists.ts` | `{ id, name, slug, bio, image, socials }` |
| `src/app/api/artists/route.ts` | `{ id, name, image, followers, spotifyUrl }` |
| `src/app/artistas/[slug]/page.tsx` | `{ id, name, image, genres, followers, spotifyUrl }` |

**Fix:** Create a single shared type in `src/lib/types.ts` and import it everywhere. The canonical shape should match what `/api/artists` returns.

### 4.2 `genres` Field Referenced but Never Returned

The `/artistas/[slug]` detail page interface includes `genres: string[]`, but the API route does NOT extract `data.genres` from the Spotify response. The genres section will never render.

**Fix:** Either add `genres` to the API response (extract from Spotify's `data.genres`), or remove the `genres` field from the detail page.

### 4.3 SQLite/Prisma Won't Work on Netlify

The project includes Prisma with SQLite (`file:/home/z/my-project/db/custom.db`). Netlify functions have ephemeral filesystems — any database file would be lost between invocations. The absolute path also won't exist on Netlify.

**Current Impact:** Low — Prisma is imported in `src/lib/db.ts` but never actually used by any route.

**Fix:** Remove the Prisma setup entirely (`src/lib/db.ts`, `prisma/schema.prisma`, `prisma/` directory) and the `DATABASE_URL` from `.env`. If you need a database later, use a hosted service (PlanetScale, Supabase, Turso) with HTTP-based connections.

### 4.4 Unused `ArtistCard` Component

`src/components/layout/artist-card.tsx` imports the mock `Artist` type and is never used.

**Fix:** Delete the file, or update it to use the API `Artist` type if you want to use it in the future.

### 4.5 Error Reporter Not Used Consistently

| File | Uses Reporter? |
|------|----------------|
| `src/app/error.tsx` | ✅ Yes |
| `src/components/error-boundary.tsx` | ✅ Yes |
| `src/app/artistas/[slug]/page.tsx` | ✅ Yes |
| `src/app/api/artists/route.ts` | ❌ No — was removed during refactor |
| `src/app/artistas/page.tsx` | ❌ No — was removed during refactor |

**Fix:** Re-add reporter calls in the API route and listing page for consistent error tracking.

---

## 5. 🟠 MODERATE ISSUES

### 5.1 Many Unused Dependencies

The following packages are installed but never imported in any source file:

| Package | Purpose | Recommendation |
|---------|---------|----------------|
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Drag-and-drop | Remove |
| `@hookform/resolvers`, `react-hook-form` | Forms | Remove |
| `@mdxeditor/editor` | MDX editing (very large) | Remove |
| `@tanstack/react-query` | Data fetching | Remove (using fetch directly) |
| `@tanstack/react-table` | Tables | Remove |
| `framer-motion` | Animation | Keep if you plan animations |
| `next-auth` | Authentication | Remove unless adding auth |
| `next-intl` | Internationalization | Remove unless adding i18n |
| `react-day-picker`, `date-fns` | Date handling | Remove |
| `react-markdown`, `react-syntax-highlighter` | Markdown | Remove |
| `recharts` | Charts | Remove |
| `uuid` | UUID generation | Remove |
| `zustand` | State management | Remove |
| `z-ai-web-dev-sdk` | AI SDK | Remove |
| `next-themes` | Theme switching | Remove (hardcoded dark) |

**Impact:** These add significant bundle size and slow down `npm install`. Removing them could cut `node_modules` by 50%+.

### 5.2 `typescript.ignoreBuildErrors: true`

This hides type errors at build time, including the `Artist` type mismatches described above.

**Fix:** Remove this setting and fix the type errors properly.

### 5.3 No `not-found.tsx` Custom Page

When a user visits an invalid artist slug, they get Next.js's default 404 page (plain white text). A custom `not-found.tsx` in `src/app/artistas/` would match the dark theme.

### 5.4 Homepage Unsplash Image May 404

The homepage hero uses an Unsplash image URL (`photo-1470225620780-dba8ba36b745`) that has been returning 404s in testing. If the homepage is converted to use Spotify data, this becomes moot. Otherwise, replace with a working image.

### 5.5 No `netlify.toml` or Deployment Configuration

There's no deployment config for any platform. See section 7 below for the recommended Netlify setup.

---

## 6. Environment Variables

| Variable | Required | Used By | Description |
|----------|----------|---------|-------------|
| `SPOTIFY_CLIENT_ID` | **YES** | `src/app/api/artists/route.ts` | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | **YES** | `src/app/api/artists/route.ts` | Spotify app client secret |
| `DATABASE_URL` | No (unused) | `prisma/schema.prisma` | SQLite path — can be removed |

---

## 7. Netlify Deployment Checklist

### Before Deploying

- [ ] Remove `output: "standalone"` from `next.config.ts`
- [ ] Add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` to Netlify environment variables
- [ ] Fix homepage to use Spotify data instead of mock data
- [ ] Fix `/artistas` links to point to `/artistas/[id]` instead of Spotify URLs
- [ ] Remove or fix `genres` field (add to API or remove from detail page)
- [ ] Delete unused mock data (`src/lib/data/artists.ts`)
- [ ] Delete unused `ArtistCard` component
- [ ] Delete unused Prisma setup (`src/lib/db.ts`, `prisma/`)
- [ ] Remove `DATABASE_URL` from `.env`
- [ ] Consider removing unused npm dependencies to speed up build

### `next.config.ts` for Netlify

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  reactStrictMode: true,
};

export default nextConfig;
```

### `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Netlify Settings

1. **Build command:** `npm run build`
2. **Publish directory:** `.next`
3. **Plugin:** `@netlify/plugin-nextjs` (auto-suggested by Netlify)
4. **Environment variables:**
   - `SPOTIFY_CLIENT_ID` = `your_spotify_client_id`
   - `SPOTIFY_CLIENT_SECRET` = `your_spotify_client_secret`

---

## 8. Spotify API Setup Guide

1. Go to https://developer.spotify.com/dashboard
2. Click "Create App"
3. Fill in:
   - App name: `Colectivo`
   - App description: `Music collective website`
   - Redirect URI: `http://localhost:3000` (required but unused for Client Credentials)
   - Web API: checked
4. After creating, go to app Settings
5. Copy **Client ID** and **Client Secret**
6. Add them to your `.env` and Netlify environment variables

**Note:** Client Credentials flow gives access to public data only (artist info, tracks). No user authentication is needed.

**Rate limits:** Spotify allows ~180 requests per 30 seconds. With 15 artists per request, you're well within limits. Consider adding caching if traffic grows.

---

## 9. Recommended Next Steps (Priority Order)

1. **Unify data source** — Make homepage fetch from `/api/artists` instead of mock data
2. **Fix routing** — `/artistas` cards should link to `/artistas/${artist.id}`, detail page should work
3. **Add Spotify credentials** — Without these, the whole site breaks
4. **Remove `output: "standalone"`** — Required for Netlify
5. **Add `netlify.toml`** — Required for Netlify deployment
6. **Clean up unused code** — Remove mock data, ArtistCard, Prisma setup
7. **Clean up unused dependencies** — Massive bundle savings
8. **Add `genres` to API response** — Or remove from detail page
9. **Remove `ignoreBuildErrors`** — Fix type errors properly
10. **Add custom `not-found.tsx`** — Dark-themed 404 page
11. **Add caching to Spotify API** — Avoid hitting rate limits on high traffic
12. **Add loading skeletons** — Better perceived performance on `/artistas`

---

## 10. Spotify Artist IDs Currently Configured

These are the 15 Spotify artist IDs in `/api/artists`:

| ID | Artist (verify on Spotify) |
|----|---------------------------|
| `2jJmTEMkGQfH3BxoG3MQvF` | Verify at spotify.com/artist/2jJmTEMkGQfH3BxoG3MQvF |
| `4fNQqyvcM71IyF2EitEtCj` | Verify at spotify.com/artist/4fNQqyvcM71IyF2EitEtCj |
| `3RAg8fPmZ8RnacJO8MhLP1` | Verify at spotify.com/artist/3RAg8fPmZ8RnacJO8MhLP1 |
| `2zrv1oduhIYh29vvQZwI5r` | Verify at spotify.com/artist/2zrv1oduhIYh29vvQZwI5r |
| `3eCEorgAoZkvnAQLdy4x38` | Verify at spotify.com/artist/3eCEorgAoZkvnAQLdy4x38 |
| `5urer15JPbCELf17LVia7w` | Verify at spotify.com/artist/5urer15JPbCELf17LVia7w |
| `5TMoczTLclVyzzDY5qf3Yb` | Verify at spotify.com/artist/5TMoczTLclVyzzDY5qf3Yb |
| `6AN9ek9RwrLbSp9rT2lcDG` | Verify at spotify.com/artist/6AN9ek9RwrLbSp9rT2lcDG |
| `0QdRhOmiqAcV1dPCoiSIQJ` | Verify at spotify.com/artist/0QdRhOmiqAcV1dPCoiSIQJ |
| `16YScXC67nAnFDcA2LGdY0` | Verify at spotify.com/artist/16YScXC67nAnFDcA2LGdY0 |
| `5HrBwfVDf0HXzGDrJ6Znqc` | Verify at spotify.com/artist/5HrBwfVDf0HXzGDrJ6Znqc |
| `4T4Z7jvUcMV16VsslRRuC5` | Verify at spotify.com/artist/4T4Z7jvUcMV16VsslRRuC5 |
| `4UqFXhJVb9zy2SbNx4ycJQ` | Verify at spotify.com/artist/4UqFXhJVb9zy2SbNx4ycJQ |
| `2Apt0MjZGqXAd1pl4LNQrR` | Verify at spotify.com/artist/2Apt0MjZGqXAd1pl4LNQrR |
| `4WQmw3fIx9F7iPKL5v8SCN` | Verify at spotify.com/artist/4WQmw3fIx9F7iPKL5v8SCN |
