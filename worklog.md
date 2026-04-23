---
Task ID: 1
Agent: main
Task: Redesign artistas section to match reference site, remove non-functional stats

Work Log:
- Analyzed uploaded image showing current artistas page with broken stats
- Tested Spotify API and confirmed followers, popularity, genres, and top-tracks have been removed from API (2025 change)
- Updated Artist type: made followers/popularity nullable (number | null), added genres: string[]
- Updated /api/artists route: return null for followers/popularity, use config genres instead of API genres
- Updated /api/artists/[id] route: same changes, also removed top-tracks fetch (403 Forbidden), return empty tracks array
- Updated artist-config.ts: added static genres array for each artist (curated based on their actual style)
- Redesigned /artistas/page.tsx: clean 5-column grid matching reference site (sonidoliquido.com), removed broken stats
- Redesigned /artistas/[slug]/page.tsx: removed followers/popularity/Spotify Score stats, kept releases count, genres, Spotify embed, releases grid, YouTube videos
- Updated homepage: replaced broken "Seguidores" stat with "Integrantes", removed formatFollowers calls
- Updated shared ArtistCard component: removed followers display, added genre tags
- Updated admin/artistas/page.tsx: made followers nullable in local interface
- TypeScript compilation: ✅ clean
- ESLint: ✅ clean

Stage Summary:
- Spotify API no longer provides followers, popularity, genres, or top-tracks
- All non-functional stats removed from UI
- Artistas listing page now matches reference site style (clean 5-col grid with genre tags)
- Artist detail page focuses on working features: Spotify embed, releases, YouTube, social links
- Curated genres added to artist-config as static data
