const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, HeadingLevel, PageNumber, BorderStyle,
        WidthType, ShadingType, PageBreak, TabStopPosition, TabStopType,
        TableOfContents, NumberFormat } = require("docx");
const fs = require("fs");

// Palette - Deep Sea (tech report)
const P = {
  primary: "0B1C2C", body: "1C2A3D", secondary: "5B6B7D",
  accent: "529286", surface: "F5F7FA",
  white: "FFFFFF", black: "000000", lightGray: "E8ECEB"
};

function c(hex) { return hex.replace("#", ""); }

// Heading builder
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, color: P.primary, font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 32 })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, color: P.primary, font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 28 })]
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, color: P.body, font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 24 })]
  });
}

// Body paragraph
function body(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text, size: 22, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

// Code block
function code(text) {
  return new Paragraph({
    spacing: { line: 260, before: 60, after: 60 },
    indent: { left: 360 },
    children: [new TextRun({ text, size: 18, color: "2D5F2D", font: { ascii: "Consolas", eastAsia: "Consolas" } })]
  });
}

// Bullet point
function bullet(text) {
  return new Paragraph({
    spacing: { line: 312, after: 40 },
    indent: { left: 720 },
    children: [new TextRun({ text: `\u2022  ${text}`, size: 22, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

// Checkbox item
function checkbox(text) {
  return new Paragraph({
    spacing: { line: 312, after: 40 },
    indent: { left: 720 },
    children: [new TextRun({ text: `\u2610  ${text}`, size: 22, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

// Table builder
function makeTable(headers, rows) {
  const t = P;
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: t.white, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })] })],
      shading: { type: ShadingType.CLEAR, fill: t.accent },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      cantSplit: true,
    }))
  });
  const dataRows = rows.map((row, i) => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 20, color: t.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })] })],
      shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? t.surface : t.white },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      cantSplit: true,
    }))
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: t.accent },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: t.accent },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [headerRow, ...dataRows],
  });
}

// Page break
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ── Build Document ──

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 22, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
    },
  },
  sections: [
    // ── Cover Section ──
    {
      properties: {
        page: { margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: [
        new Paragraph({ spacing: { before: 4800 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "SONIDO L\u00cdQUIDO CREW", bold: true, size: 52, color: P.accent, font: { ascii: "Times New Roman", eastAsia: "SimHei" } })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "Project Deployment Report", size: 36, color: P.primary, font: { ascii: "Times New Roman", eastAsia: "SimHei" } })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Next.js 16  \u00b7  TypeScript  \u00b7  Tailwind CSS 4  \u00b7  Netlify", size: 22, color: P.secondary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
        }),
        new Paragraph({ spacing: { before: 2000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Generated: April 21, 2026", size: 20, color: P.secondary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Hip Hop Mexicano desde 1999", size: 20, color: P.secondary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
        }),
      ],
    },
    // ── TOC Section ──
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary }),
            ],
          })],
        }),
      },
      children: [
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: P.primary, font: { ascii: "Times New Roman", eastAsia: "SimHei" } })]
        }),
        new TableOfContents("TOC", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({ text: "Hint: Right-click the table of contents and select \u201cUpdate Field\u201d to refresh page numbers after opening.", italics: true, size: 18, color: P.secondary })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    // ── Body Section ──
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary }),
            ],
          })],
        }),
      },
      children: [
        // ── 1. Project Overview ──
        h1("1. Project Overview"),
        body("This is the official website for Sonido L\u00edquido Crew, a Mexican Hip Hop collective founded in 1999 in Mexico City by Zaque. The site dynamically fetches real artist data from the Spotify Web API (followers, popularity, releases, top tracks, album art), embeds YouTube music videos via the YouTube Data API v3, and integrates Mailchimp for newsletter subscriptions. All 15 artists in the collective are configured with Spotify IDs, Instagram profiles, and YouTube channel mappings."),
        makeTable(
          ["Field", "Value"],
          [
            ["Name", "Sonido L\u00edquido Crew \u2014 Music Collective Website"],
            ["Framework", "Next.js 16.1.3 (App Router, Turbopack)"],
            ["Language", "TypeScript 5"],
            ["Styling", "Tailwind CSS 4 + shadcn/ui (40+ components)"],
            ["Data Sources", "Spotify Web API, YouTube Data API v3, Mailchimp API"],
            ["Deployment", "Netlify (serverless, @netlify/plugin-nextjs)"],
            ["Status", "Production-ready \u2014 requires env vars"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 2. Tech Stack ──
        h1("2. Tech Stack"),
        makeTable(
          ["Technology", "Version", "Purpose"],
          [
            ["Next.js", "16.1.3", "React framework with App Router"],
            ["React", "19", "UI library"],
            ["TypeScript", "5", "Type safety"],
            ["Tailwind CSS", "4", "Utility-first styling"],
            ["shadcn/ui", "Latest", "Pre-built UI components (Radix-based)"],
            ["Lucide React", "0.525", "Icon library"],
            ["sharp", "0.34", "Server-side image optimization"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 3. Current Routes ──
        h1("3. Current Routes"),
        makeTable(
          ["Route", "Type", "Data Source", "Status"],
          [
            ["/", "Page (Client)", "fetch /api/artists", "Working"],
            ["/artistas", "Page (Client)", "fetch /api/artists", "Working"],
            ["/artistas/[slug]", "Page (Client)", "fetch /api/artists/[id]", "Working"],
            ["/api/artists", "GET API Route", "Spotify Client Credentials", "Working (needs Spotify creds)"],
            ["/api/artists/[id]", "GET API Route", "Spotify + YouTube APIs", "Working (needs creds)"],
            ["/api/subscribe", "POST API Route", "Mailchimp API v3", "Working (needs Mailchimp creds)"],
          ]
        ),
        new Paragraph({ spacing: { after: 100 } }),
        body("Note: The [slug] in /artistas/[slug] is the Spotify artist ID (e.g. /artistas/2jJmTEMkGQfH3BxoG3MQvF), not a human-readable slug."),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 4. File Structure ──
        h1("4. File Structure"),
        code("src/"),
        code("\u251c\u2500\u2500 app/"),
        code("\u2502   \u251c\u2500\u2500 layout.tsx              # Root layout (dark theme, Geist fonts, Header, Footer, ErrorBoundary)"),
        code("\u2502   \u251c\u2500\u2500 page.tsx                # Homepage (hero, stats, artists grid, playlist embed, newsletter)"),
        code("\u2502   \u251c\u2500\u2500 error.tsx               # Route-level error page with expandable log"),
        code("\u2502   \u251c\u2500\u2500 globals.css             # Tailwind CSS 4 + dark theme + animations"),
        code("\u2502   \u251c\u2500\u2500 api/"),
        code("\u2502   \u2502   \u251c\u2500\u2500 artists/"),
        code("\u2502   \u2502   \u2502   \u251c\u2500\u2500 route.ts        # GET /api/artists - all 15 artists from Spotify"),
        code("\u2502   \u2502   \u2502   \u2514\u2500\u2500 [id]/route.ts  # GET /api/artists/[id] - detail + tracks + releases + YouTube"),
        code("\u2502   \u2502   \u2514\u2500\u2500 subscribe/route.ts  # POST /api/subscribe - Mailchimp newsletter"),
        code("\u2502   \u2514\u2500\u2500 artistas/"),
        code("\u2502       \u251c\u2500\u2500 page.tsx            # Artists listing page (4-col grid, stats bar)"),
        code("\u2502       \u2514\u2500\u2500 [slug]/page.tsx    # Artist detail (Spotify embed, tracks, releases, YouTube, socials)"),
        code("\u251c\u2500\u2500 components/"),
        code("\u2502   \u251c\u2500\u2500 error-boundary.tsx      # React ErrorBoundary with reporter"),
        code("\u2502   \u251c\u2500\u2500 newsletter-form.tsx     # Mailchimp newsletter form (hero + footer variants)"),
        code("\u2502   \u2514\u2500\u2500 layout/"),
        code("\u2502       \u251c\u2500\u2500 header.tsx          # Sticky header with mobile menu"),
        code("\u2502       \u251c\u2500\u2500 footer.tsx          # 4-column footer with newsletter"),
        code("\u2502       \u2514\u2500\u2500 artist-card.tsx     # Reusable artist card"),
        code("\u251c\u2500\u2500 hooks/"),
        code("\u2502   \u251c\u2500\u2500 use-toast.ts            # Toast state (shadcn)"),
        code("\u2502   \u2514\u2500\u2500 use-mobile.ts           # Mobile breakpoint hook"),
        code("\u2514\u2500\u2500 lib/"),
        code("    \u251c\u2500\u2500 artist-config.ts        # 15 artists: Spotify IDs, Instagram, YouTube channels"),
        code("    \u251c\u2500\u2500 error-reporter.ts       # Central structured error logging"),
        code("    \u251c\u2500\u2500 types.ts                # Shared types: Artist, Track, Release, YouTubeVideo"),
        code("    \u2514\u2500\u2500 utils.ts                # cn() utility (clsx + tailwind-merge)"),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 5. Data Architecture ──
        h1("5. Data Architecture"),
        h2("5.1 Spotify Integration"),
        bullet("Auth flow: Client Credentials (no user login required)"),
        bullet("Token management: In-memory cache with auto-refresh 60 seconds before expiry"),
        bullet("Data fetched: Artist name, image, followers, popularity, top tracks, albums/releases"),
        bullet("Rate limits: ~180 requests per 30 seconds \u2014 well within limits for 15 artists"),

        h2("5.2 YouTube Integration"),
        bullet("Auth: API key only (no OAuth)"),
        bullet("3-tier search strategy: (1) artist's configured channel, (2) SLC crew channel, (3) generic search"),
        bullet("Results: Deduplicated by videoId, max 6 videos per artist"),
        bullet("Fallback: If YOUTUBE_API_KEY not set, shows 'Search on YouTube' link instead of embedded players"),

        h2("5.3 Mailchimp Integration"),
        bullet("Auth: API key with Basic auth"),
        bullet("Endpoint: POST to /lists/{audience_id}/members with 'subscribed' status and 'website-signup' tag"),
        bullet("Graceful degradation: If env vars not set, returns 503 with friendly message \u2014 site never crashes"),
        bullet("Duplicate handling: 'Member Exists' returns friendly 'already subscribed' message"),

        h2("5.4 Static Artist Config"),
        body("The file src/lib/artist-config.ts contains configuration that Spotify does NOT provide: Instagram profile URLs (all 15 artists), YouTube channel IDs (5 artists have individual channels, rest use SLC crew channel), and YouTube handles (for display on buttons). This data is merged with Spotify API data at the API route level."),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 6. Shared Types ──
        h1("6. Shared Types"),
        body("All types are defined in src/lib/types.ts as a single source of truth:"),
        makeTable(
          ["Type", "Key Fields"],
          [
            ["Artist", "id, name, image, followers, spotifyUrl, popularity, releases, instagram, youtubeChannelId, youtubeHandle"],
            ["Track", "id, name, album, albumImage, durationMs, spotifyUrl, previewUrl"],
            ["Release", "id, name, artistName, image, releaseDate, type (album|single|compilation), spotifyUrl"],
            ["YouTubeVideo", "videoId, title, thumbnail, channelTitle"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 7. Environment Variables ──
        h1("7. Environment Variables"),
        h2("7.1 Required (site will not work without these)"),
        makeTable(
          ["Variable", "Used By", "How to Get"],
          [
            ["SPOTIFY_CLIENT_ID", "/api/artists, /api/artists/[id]", "https://developer.spotify.com/dashboard \u2192 Create App \u2192 Settings"],
            ["SPOTIFY_CLIENT_SECRET", "/api/artists, /api/artists/[id]", "Same as above"],
          ]
        ),
        new Paragraph({ spacing: { after: 100 } }),

        h2("7.2 Optional but Recommended"),
        makeTable(
          ["Variable", "Used By", "Fallback if Missing"],
          [
            ["YOUTUBE_API_KEY", "/api/artists/[id]", "'Search on YouTube' button instead of embedded videos"],
            ["MAILCHIMP_API_KEY", "/api/subscribe", "'Service not configured' message on newsletter forms"],
            ["MAILCHIMP_SERVER_PREFIX", "/api/subscribe", "Same as above"],
            ["MAILCHIMP_AUDIENCE_ID", "/api/subscribe", "Same as above"],
          ]
        ),
        new Paragraph({ spacing: { after: 100 } }),

        h2("7.3 .env File Template"),
        code("# REQUIRED"),
        code("SPOTIFY_CLIENT_ID=your_spotify_client_id_here"),
        code("SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here"),
        code(""),
        code("# OPTIONAL - YouTube videos on artist pages"),
        code("YOUTUBE_API_KEY=your_youtube_api_key_here"),
        code(""),
        code("# OPTIONAL - Newsletter subscription"),
        code("MAILCHIMP_API_KEY=your_mailchimp_api_key_here"),
        code("MAILCHIMP_SERVER_PREFIX=us1"),
        code("MAILCHIMP_AUDIENCE_ID=your_audience_id_here"),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 8. Artists Roster ──
        h1("8. 15 Artists Roster"),
        makeTable(
          ["Spotify ID", "Artist", "YouTube Channel"],
          [
            ["2jJmTEMkGQfH3BxoG3MQvF", "Brez", "Own channel (UCxVg9-xrVGfjtRd_N32EuTA)"],
            ["4fNQqyvcM71IyF2EitEtCj", "Bruno Grasso", "SLC crew channel"],
            ["3RAg8fPmZ8RnacJO8MhLP1", "Chas7Pecados", "SLC crew channel"],
            ["2zrv1oduhIYh29vvQZwI5r", "Codak (I Like Big Buds)", "SLC crew channel"],
            ["3eCEorgAoZkvnAQLdy4x38", "Dilema La Dee", "SLC crew channel"],
            ["5urer15JPbCELf17LVia7w", "Doctor Destino", "Own channel (UCGXC-OtIZ7PHOHBKZTE4mIw)"],
            ["5TMoczTLclVyzzDY5qf3Yb", "Fancy Freak", "SLC crew channel"],
            ["6AN9ek9RwrLbSp9rT2lcDG", "Hassyel", "SLC crew channel"],
            ["0QdRhOmiqAcV1dPCoiSIQJ", "Kev Cabrone", "SLC crew channel"],
            ["16YScXC67nAnFDcA2LGdY0", "Latin Geisha", "Own channel (UCZvZ8tbIZKt9IzO42Y8_gtw)"],
            ["5HrBwfVDf0HXzGDrJ6Znqc", "Pepe Levine", "Zaque's channel"],
            ["4T4Z7jvUcMV16VsslRRuC5", "Q.Master W", "SLC crew channel"],
            ["4UqFXhJVb9zy2SbNx4ycJQ", "Reick Uno", "SLC crew channel"],
            ["2Apt0MjZGqXAd1pl4LNQrR", "Santa Ana", "SLC crew channel"],
            ["4WQmw3fIx9F7iPKL5v8SCN", "Zaque", "Own channel (UCXLJPF4RRLT4aoVJkXG80bg)"],
          ]
        ),
        new Paragraph({ spacing: { after: 100 } }),
        body("SLC Crew YouTube Channel: UCy6tHVzGmZ_ehIBWcdrTuRA (@sonidoliquidocrew)"),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 9. Netlify Deployment ──
        h1("9. Netlify Deployment Setup"),
        h2("9.1 Build Configuration (already in repo)"),
        body("netlify.toml:"),
        code('[build]'),
        code('  command = "npm run build"'),
        code('  publish = ".next"'),
        code(""),
        code("[[plugins]]"),
        code('  package = "@netlify/plugin-nextjs"'),
        new Paragraph({ spacing: { after: 100 } }),
        body("next.config.ts:"),
        code('output: "standalone"  // Required for Netlify serverless functions'),
        code("images.remotePatterns: i.scdn.co, mosaic.scdn.co, i.ytimg.com, images.unsplash.com, dl.dropboxusercontent.com"),
        code("reactStrictMode: true"),

        h2("9.2 Netlify Dashboard Settings"),
        bullet("Build command: npm run build"),
        bullet("Publish directory: .next"),
        bullet("Plugin: @netlify/plugin-nextjs (auto-suggested by Netlify when it detects Next.js)"),
        bullet("Node version: Set NODE_VERSION env var to 20 or 22"),

        h2("9.3 Environment Variables on Netlify"),
        body("Go to Site settings > Environment variables and add:"),
        makeTable(
          ["Variable", "Required", "Example"],
          [
            ["SPOTIFY_CLIENT_ID", "YES", "abc123def456..."],
            ["SPOTIFY_CLIENT_SECRET", "YES", "xyz789ghi012..."],
            ["YOUTUBE_API_KEY", "No", "AIzaSy..."],
            ["MAILCHIMP_API_KEY", "No", "abc123-us8"],
            ["MAILCHIMP_SERVER_PREFIX", "No", "us8"],
            ["MAILCHIMP_AUDIENCE_ID", "No", "a1b2c3d4e5"],
            ["NODE_VERSION", "Recommended", "20"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 10. API Setup Guides ──
        h1("10. API Setup Guides"),
        h2("10.1 Spotify API"),
        bullet("Go to https://developer.spotify.com/dashboard"),
        bullet("Click 'Create App' \u2014 name: Sonido Liquido, redirect: http://localhost:3000, Web API: checked"),
        bullet("Go to app Settings, copy Client ID and Client Secret"),
        bullet("Add to Netlify environment variables"),
        body("Client Credentials flow gives access to public data only. No user authentication needed. Rate limits are ~180 requests per 30 seconds."),

        h2("10.2 YouTube Data API v3"),
        bullet("Go to https://console.cloud.google.com"),
        bullet("Create or select a project, enable 'YouTube Data API v3'"),
        bullet("Go to APIs & Services > Credentials > Create API Key"),
        bullet("Restrict the key to 'YouTube Data API v3' only (recommended)"),
        body("If not configured, artist detail pages show a 'Search on YouTube' link instead of embedded video players."),

        h2("10.3 Mailchimp API"),
        bullet("Log in to https://mailchimp.com"),
        bullet("Go to Account > Extras > API keys > Create A Key"),
        bullet("API key format: {key}-{server_prefix} (e.g. abc123-us8)"),
        bullet("Server prefix = everything after the dash (e.g. us8)"),
        bullet("Audience ID: Audience > Settings > Audience name and defaults"),
        body("If not configured, newsletter forms show 'service not configured' message instead of subscribing."),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 11. Design System ──
        h1("11. Design System"),
        h2("11.1 Dark Theme Colors"),
        makeTable(
          ["Token", "Hex", "Usage"],
          [
            ["--background", "#0a0a0a", "Page background"],
            ["--foreground", "#ffffff", "Primary text"],
            ["--card", "#1a1a1a", "Card backgrounds"],
            ["--primary", "#22c55e", "Green accent (Spotify-style)"],
            ["--primary-foreground", "#0a0a0a", "Text on green buttons"],
            ["--muted-foreground", "#888888", "Secondary text"],
            ["--border", "#2a2a2a", "Borders and dividers"],
          ]
        ),
        new Paragraph({ spacing: { after: 100 } }),

        h2("11.2 Custom CSS Animations"),
        bullet(".animate-marquee \u2014 30s infinite horizontal scroll for artist name ticker"),
        bullet(".animate-pulse-green \u2014 2s ease-in-out pulse for 'Now Playing' indicator"),

        h2("11.3 Fonts"),
        bullet("Geist Sans (variable --font-geist-sans) \u2014 Body text"),
        bullet("Geist Mono (variable --font-geist-mono) \u2014 Code/monospace"),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 12. Key Features ──
        h1("12. Key Features"),
        h2("12.1 Homepage (/)"),
        bullet("Hero section with 'SONIDO LIQUIDO' title and CTA buttons"),
        bullet("Animated artist name marquee ticker"),
        bullet("Stats bar (artists count, releases, followers, years)"),
        bullet("Featured artists grid (first 6)"),
        bullet("'Now Playing' spotlight section"),
        bullet("Latest releases grid (8 artists with play overlay)"),
        bullet("Spotify playlist embed (playlist ID: 5qHTKCZIwi3GM3mhPq45Ab)"),
        bullet("Newsletter CTA with Mailchimp integration"),

        h2("12.2 Artists Page (/artistas)"),
        bullet("Full 15-artist grid (4 columns on desktop)"),
        bullet("Collective stats bar (total followers, total releases)"),
        bullet("Each card: image, name, followers, releases, Instagram link, popularity bar"),
        bullet("Loading/error/empty states"),

        h2("12.3 Artist Detail Page (/artistas/[slug])"),
        bullet("Large artist header with image + stats (followers, popularity, releases)"),
        bullet("Spotify artist embed (full player)"),
        bullet("Top tracks with 30-second audio preview playback"),
        bullet("Latest releases grid with cover art"),
        bullet("YouTube video section (embedded iframes, up to 6 videos)"),
        bullet("Social CTAs: Spotify, Instagram, YouTube channel"),

        h2("12.4 Newsletter (Homepage + Footer)"),
        bullet("Mailchimp-powered subscription form"),
        bullet("Two visual variants: hero (with mail icon) and footer (compact)"),
        bullet("Full UX flow: idle > loading (spinner) > success (checkmark) / error (retry)"),
        bullet("Graceful fallback when Mailchimp not configured"),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 13. API Reference ──
        h1("13. API Reference"),
        h2("13.1 GET /api/artists"),
        body("Returns all 15 artists as a flat JSON array. Each artist object includes: id, name, image, followers, spotifyUrl, popularity, releases, instagram, youtubeChannelId, youtubeHandle."),

        h2("13.2 GET /api/artists/[id]"),
        body("Returns a single artist with tracks, releases, and YouTube videos. Response shape: { artist, tracks[], releases[], videos[] }."),

        h2("13.3 POST /api/subscribe"),
        body("Subscribes an email to the Mailchimp audience. Request: { email: string }. Success (200): { message, status: 'subscribed' }. Already subscribed (200): { message, status: 'already_subscribed' }. Not configured (503): { error, notConfigured: true }."),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 14. Known Limitations ──
        h1("14. Known Limitations and Future Improvements"),
        h2("14.1 Current Limitations"),
        bullet("No caching layer \u2014 Every page visit hits the Spotify API. Could add Redis or in-memory cache with TTL."),
        bullet("No /discografia page \u2014 The nav links to /discografia but no page exists. Currently points to /artistas."),
        bullet("No /beats, /videos, /eventos pages \u2014 Nav items point to anchors on /artistas but dedicated pages don't exist."),
        bullet("No custom 404 page \u2014 Next.js default 404 doesn't match the dark theme."),
        bullet("Many unused npm dependencies \u2014 30+ unused packages from the initial scaffold that bloat install size."),
        bullet("Spotify preview URLs can expire \u2014 The 30-second audio preview URLs are temporary."),

        h2("14.2 Recommended Improvements"),
        bullet("Add API response caching \u2014 Use Next.js revalidate or a cache layer to avoid hitting Spotify on every request"),
        bullet("Create missing pages \u2014 /discografia, /videos, /eventos, /contacto, /nosotros"),
        bullet("Add custom 404 \u2014 Create src/app/not-found.tsx with dark theme"),
        bullet("Clean up dependencies \u2014 Remove unused packages to speed up Netlify builds"),
        bullet("Add loading skeletons \u2014 Better perceived performance on artist pages"),
        bullet("Add SEO metadata \u2014 Per-page metadata, Open Graph images, structured data"),
        bullet("Rate limiting on /api/subscribe \u2014 Prevent abuse of the newsletter endpoint"),
        bullet("Add sitemap.xml and robots.txt \u2014 For search engine indexing"),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 15. Build Verification ──
        h1("15. Build Verification"),
        body("The project builds cleanly with zero TypeScript errors:"),
        code("Next.js 16.1.3 (Turbopack)"),
        code("Compiled successfully"),
        code("Generating static pages (6/6)"),
        code(""),
        code("Route (app)"),
        code("\u254c \u25cb /"),
        code("\u254c \u25cb /_not-found"),
        code("\u254c \u0192 /api/artists"),
        code("\u254c \u0192 /api/artists/[id]"),
        code("\u254c \u0192 /api/subscribe"),
        code("\u254c \u25cb /artistas"),
        code("\u2514 \u0192 /artistas/[slug]"),
        new Paragraph({ spacing: { after: 200 } }),

        // ── 16. Quick Deploy Checklist ──
        h1("16. Quick Deploy Checklist"),
        checkbox("Download and unzip the project"),
        checkbox("Run npm install"),
        checkbox("Create .env file with Spotify credentials (required)"),
        checkbox("Optionally add YouTube and Mailchimp env vars"),
        checkbox("Run npm run build to verify it compiles"),
        checkbox("Push to GitHub repository"),
        checkbox("Connect repo to Netlify"),
        checkbox("Add all environment variables in Netlify dashboard"),
        checkbox("Deploy"),
        checkbox("Test /api/artists returns JSON with artist data"),
        checkbox("Test /artistas page loads all 15 artists"),
        checkbox("Test /artistas/{any-spotify-id} shows artist detail"),
        checkbox("Test newsletter form on homepage"),
        checkbox("Test newsletter form in footer"),
      ],
    },
  ],
});

// Generate
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/home/z/my-project/download/Sonido_Liquido_Deployment_Report.docx", buf);
  console.log("DOCX generated successfully!");
});
