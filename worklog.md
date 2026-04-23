---
Task ID: 1
Agent: main
Task: Update colorway to orange (#FF6600), redesign hero as artist carousel, add Próximos Lanzamientos, remove Zaque, reorder sections

Work Log:
- Updated globals.css: Changed --primary, --ring, --accent, --sidebar-primary, --sidebar-ring, --chart-1 from #22c55e to #FF6600
- Updated globals.css: Changed --background from #0a0a0a to #121212
- Updated globals.css: Changed --primary-foreground, --accent-foreground, --sidebar-primary-foreground from #0a0a0a to #121212
- Updated globals.css: Changed scrollbar track background from #0a0a0a to #121212
- Redesigned hero section as random artist carousel:
  - On page load, picks a random artist from roster
  - Shows artist's large blurred background image as hero background with dim overlay
  - "SONIDO" in white, "LÍQUIDO" in #FF6600 orange
  - Shows featured artist name and genre tags
  - "Escuchar en Spotify" (orange bg) and "Explorar Artistas" buttons
  - Auto-rotates every 6 seconds with smooth crossfade (400ms fade-out, swap, fade-in)
  - Uses useState for featured artist, useEffect with setInterval for rotation
- Removed "por Zaque" from hero description text
- Added Próximos Lanzamientos section:
  - Fetches from /api/upcoming-releases
  - Shows each release with cover image, title, artist name, release date, and "Notificarme" button
  - Fallback message: "Próximamente — nuevas drops del crew"
  - Links to /proximos for notifications
- Reordered sections: Hero → Marquee → Próximos Lanzamientos → Stats → Artists → Now Playing → Latest Releases → Spotify Playlist → Newsletter
- Replaced all hardcoded green (#22c55e / text-primary) references in page.tsx with #FF6600
- Updated ArtistCard hover border and button colors from primary to #FF6600
- Removed Instagram import since it was no longer used in the simplified ArtistCard
- TypeScript compilation: ✅ clean
- ESLint: ✅ clean
- Dev server: ✅ compiled successfully

Stage Summary:
- Full colorway migration from green to orange (#FF6600) across CSS and inline styles
- Hero is now a dynamic artist carousel with background imagery and auto-rotation
- Próximos Lanzamientos is the topmost content section after the marquee
- Zaque reference removed from description
- All section order matches spec exactly

---
Task ID: 2
Agent: main
Task: Update colorway to match reference site, hero carousel, section reorder, Zaque removal

Work Log:
- Analyzed reference site www.sonidoliquido.com colorway via VLM
- Updated globals.css dark theme: primary #22c55e → #FF6600 (orange), background #0a0a0a → #121212
- All accent colors now use #FF6600 (primary, ring, accent, sidebar-primary, chart-1)
- Redesigned hero section as random artist carousel with auto-rotation every 6 seconds
- Hero shows blurred artist background, "SONIDO" (white) + "LÍQUIDO" (#FF6600), featured artist name/genres
- Added Próximos Lanzamientos section (fetches /api/upcoming-releases) as topmost section after hero/marquee
- Removed "por Zaque" from description text
- Section order: Hero → Marquee → Próximos → Stats → Artists → Now Playing → Releases → Playlist → Newsletter
- TypeScript: ✅ clean, ESLint: ✅ clean

Stage Summary:
- Colorway now matches reference site (orange #FF6600, bg #121212)
- Hero is a dynamic artist carousel (random on load, rotates every 6s)
- Próximos Lanzamientos is the topmost content section
- Zaque removed from description
- All code compiles and lints clean
