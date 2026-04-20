---
Task ID: 1
Agent: main
Task: Build music collective website - Next.js 15, dark theme, App Router

Work Log:
- Initialized fullstack dev environment
- Created artist data model and mock data (6 artists) at src/lib/data/artists.ts
- Created API route at src/app/api/artists/route.ts (GET only, returns JSON)
- Built Homepage at src/app/page.tsx (hero, stats, featured artists)
- Built Artists list page at src/app/artistas/page.tsx
- Built Artist detail page at src/app/artistas/[slug]/page.tsx with generateStaticParams
- Created shared components: Header, Footer, ArtistCard
- Configured dark theme in globals.css with purple-accented dark palette
- Updated root layout with Header/Footer and forced dark class on html
- Configured next.config.ts with Unsplash remote image patterns
- Verified all routes return 200, API returns valid JSON, 404 for non-existent slugs
- ESLint passes clean

Stage Summary:
- All 5 features implemented: Homepage, /artistas, /artistas/[slug], /api/artists, static mock data
- No Prisma, no Turbo, no ORM — simple JSON data
- Dark theme, minimal, modern, mobile-first design
- All routes verified working
