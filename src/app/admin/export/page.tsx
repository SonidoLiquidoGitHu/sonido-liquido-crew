"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Copy,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Folder,
  HardDrive,
  Image,
  Loader2,
  Mail,
  Megaphone,
  MessageCircle,
  Music,
  Newspaper,
  Palette,
  RefreshCw,
  Settings as SettingsIcon,
  Share2,
  Shield,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Square,
  Store,
  Users,
  UsersRound,
  Video,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// Group metadata — must match the API registry
type SectionGroup =
  | "content"
  | "community"
  | "commerce"
  | "communications"
  | "system";

interface SectionMeta {
  id: string;
  label: string;
  group: SectionGroup;
  sensitive?: boolean;
  tables: string[];
}

interface CountPreview {
  label: string;
  tables: Array<{ label: string; count: number }>;
}

const GROUPS: Array<{
  id: SectionGroup;
  label: string;
  icon: typeof Users;
  color: string;
}> = [
  { id: "content", label: "Contenido", icon: Music, color: "text-orange-500" },
  {
    id: "community",
    label: "Comunidad",
    icon: UsersRound,
    color: "text-purple-500",
  },
  { id: "commerce", label: "Comercio", icon: Store, color: "text-green-500" },
  {
    id: "communications",
    label: "Comunicaciones",
    icon: Megaphone,
    color: "text-blue-500",
  },
  {
    id: "system",
    label: "Sistema",
    icon: SettingsIcon,
    color: "text-slc-muted",
  },
];

// Static fallback registry (used to render the grid before the API responds)
const FALLBACK_SECTIONS: SectionMeta[] = [
  {
    id: "artists",
    label: "Artistas",
    group: "content",
    tables: ["artists", "external_profiles", "gallery_assets", "relations"],
  },
  {
    id: "releases",
    label: "Lanzamientos",
    group: "content",
    tables: ["releases", "release_artists"],
  },
  {
    id: "videos",
    label: "Videos",
    group: "content",
    tables: ["videos", "youtube_channels"],
  },
  { id: "events", label: "Eventos", group: "content", tables: ["events"] },
  {
    id: "gallery",
    label: "Galería",
    group: "content",
    tables: ["albums", "photos", "tags"],
  },
  {
    id: "beats",
    label: "Beats",
    group: "content",
    tables: ["beats", "downloads"],
  },
  {
    id: "media",
    label: "Comunicados / EPK",
    group: "content",
    tables: [
      "media_releases",
      "press_kits",
      "epk",
      "epk_photos",
      "epk_tracks",
      "epk_videos",
    ],
  },
  {
    id: "vertical_videos",
    label: "Reels / Shorts",
    group: "content",
    tables: ["videos", "events", "tags"],
  },
  {
    id: "community",
    label: "Comunidad",
    group: "community",
    tables: [
      "fan_wall",
      "user_playlists",
      "concert_memories",
      "collab_stories",
      "track_lyrics",
      "trusted_contributors",
    ],
  },
  {
    id: "playlists",
    label: "Playlists curadas",
    group: "community",
    tables: [
      "channels",
      "curated_tracks",
      "playlist_tracks",
      "curated_playlists",
    ],
  },
  {
    id: "products",
    label: "Tienda",
    group: "commerce",
    tables: ["products", "orders", "order_items"],
  },
  {
    id: "downloads",
    label: "Download Gates",
    group: "commerce",
    tables: ["gates", "actions", "file_assets"],
  },
  {
    id: "campaigns",
    label: "Campañas / Pre-saves",
    group: "commerce",
    tables: [
      "campaigns",
      "actions",
      "upcoming",
      "presave_subs",
      "presave_clicks",
    ],
  },
  {
    id: "subscribers",
    label: "Suscriptores",
    group: "communications",
    sensitive: true,
    tables: ["subscribers", "segments", "email_campaigns"],
  },
  {
    id: "notifications",
    label: "Notificaciones push",
    group: "communications",
    sensitive: true,
    tables: [
      "push_subs",
      "preferences",
      "scheduled",
      "history",
      "release_notifs",
    ],
  },
  {
    id: "ab_tests",
    label: "A/B Tests",
    group: "communications",
    tables: ["tests", "variants", "events", "email_marketing"],
  },
  {
    id: "social_posts",
    label: "Posts sociales",
    group: "communications",
    tables: ["queue", "log"],
  },
  {
    id: "settings",
    label: "Configuración",
    group: "system",
    tables: ["site_settings"],
  },
  {
    id: "styles",
    label: "Estilos / Temas",
    group: "system",
    tables: ["custom_styles", "artist_styles"],
  },
  {
    id: "tags",
    label: "Tags",
    group: "system",
    tables: ["tags", "assignments"],
  },
  { id: "sync", label: "Sync jobs", group: "system", tables: ["jobs", "logs"] },
  {
    id: "analytics",
    label: "Analytics",
    group: "system",
    tables: ["events", "video", "aggregates", "epk_views"],
  },
];

// Icon per section id (for the selector grid)
const SECTION_ICON: Record<string, typeof Users> = {
  artists: Users,
  releases: Music,
  videos: Video,
  events: Calendar,
  gallery: Image,
  beats: Palette,
  media: Newspaper,
  vertical_videos: Smartphone,
  community: MessageCircle,
  playlists: Database,
  products: ShoppingBag,
  downloads: HardDrive,
  campaigns: Zap,
  subscribers: Mail,
  notifications: Share2,
  ab_tests: FlaskConical,
  social_posts: Share2,
  settings: SettingsIcon,
  styles: Palette,
  tags: Database,
  sync: RefreshCw,
  analytics: BarChart3,
};

// Project structure (kept from the original page)
const PROJECT_STRUCTURE = [
  {
    name: "src/app",
    description: "Next.js App Router pages and API routes",
    children: [
      {
        name: "(public)",
        description: "Public-facing pages (artists, releases, videos, etc.)",
      },
      { name: "admin", description: "Admin dashboard and management pages" },
      { name: "api", description: "API endpoints for all features" },
    ],
  },
  {
    name: "src/components",
    description: "React components",
    children: [
      { name: "ui", description: "shadcn/ui base components (customized)" },
      {
        name: "public",
        description: "Public site components (Header, Footer, sections)",
      },
      { name: "admin", description: "Admin-specific components" },
    ],
  },
  {
    name: "src/db",
    description: "Database layer (Drizzle ORM + Turso/SQLite)",
    children: [
      { name: "schema", description: "Table definitions for all entities" },
      { name: "migrations", description: "SQL migration files" },
      { name: "client.ts", description: "Database connection setup" },
    ],
  },
  {
    name: "src/lib",
    description: "Utilities and services",
    children: [
      {
        name: "clients",
        description: "External API clients (Spotify, YouTube)",
      },
      { name: "services", description: "Business logic services" },
      { name: "utils.ts", description: "Helper functions" },
    ],
  },
];

const KEY_FEATURES = [
  {
    icon: Users,
    name: "Artists",
    description:
      "Artist profiles with bios, images, social links, and discographies",
  },
  {
    icon: Music,
    name: "Releases",
    description:
      "Discography management with Spotify integration and auto-sync",
  },
  {
    icon: Video,
    name: "Videos",
    description: "YouTube video integration with channel management",
  },
  {
    icon: Calendar,
    name: "Events",
    description: "Event calendar with past/upcoming events",
  },
  {
    icon: ShoppingBag,
    name: "Store",
    description: "E-commerce with Stripe integration",
  },
  {
    icon: Mail,
    name: "Newsletter",
    description: "Email subscription with download gates",
  },
  {
    icon: Image,
    name: "Gallery",
    description: "Photo gallery with categories and lightbox",
  },
  {
    icon: Zap,
    name: "Campaigns",
    description: "Pre-save campaigns with smart links",
  },
  {
    icon: Palette,
    name: "Beats",
    description: "Beat store with audio preview and download gates",
  },
  {
    icon: Database,
    name: "Playlists",
    description: "Curated playlists with Save to Spotify feature",
  },
];

const TECH_STACK = [
  "Next.js 15 (App Router)",
  "TypeScript",
  "Tailwind CSS",
  "shadcn/ui",
  "Drizzle ORM",
  "Turso (SQLite)",
  "Spotify API",
  "YouTube API",
  "Stripe",
  "Dropbox API",
  "Netlify",
];

// localStorage key for last export
const LAST_EXPORT_KEY = "slc_last_export";

interface LastExport {
  timestamp: string;
  format: string;
  sections: string[];
  size: string;
}

export default function ExportPage() {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCommands, setCopiedCommands] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(["data"]);

  // Export state
  const [sections, setSections] = useState<SectionMeta[]>(FALLBACK_SECTIONS);
  const [selectedSections, setSelectedSections] = useState<string[]>(["all"]);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [sanitize, setSanitize] = useState(true);
  const [counts, setCounts] = useState<Record<string, CountPreview> | null>(
    null,
  );
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [lastExport, setLastExport] = useState<LastExport | null>(null);

  // Load last export from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_EXPORT_KEY);
      if (stored) setLastExport(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Fetch live section counts whenever selection changes
  const fetchCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const sectionsParam = selectedSections.includes("all")
        ? "all"
        : selectedSections.join(",");
      const res = await fetch(
        `/api/admin/export?action=counts&sections=${sectionsParam}`,
      );
      const data = await res.json();
      if (data.success) setCounts(data.counts);
    } catch {
      // silent — counts are an enhancement
    } finally {
      setLoadingCounts(false);
    }
  }, [selectedSections]);

  // Initial counts fetch
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  const toggleExportSection = (sectionId: string) => {
    setExportResult(null);
    if (sectionId === "all") {
      setSelectedSections(["all"]);
      return;
    }
    setSelectedSections((prev) => {
      const newSections = prev.filter((s) => s !== "all");
      if (newSections.includes(sectionId)) {
        return newSections.filter((s) => s !== sectionId);
      }
      return [...newSections, sectionId];
    });
  };

  // Build a friendly result summary from the API response
  const summarize = (summary: Record<string, number> | undefined): string => {
    if (!summary) return "Exportación completada.";
    const entries = Object.entries(summary).filter(([, n]) => n > 0);
    if (entries.length === 0)
      return "Sin datos en las secciones seleccionadas.";
    // Show top 6 entries by count, then "+N más"
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 6).map(([k, n]) => `${n} ${k}`);
    const rest = sorted.length - top.length;
    return rest > 0 ? `${top.join(", ")} (+${rest} más)` : top.join(", ");
  };

  const handleExportJSON = async () => {
    setExporting(true);
    setExportResult(null);

    try {
      const sectionsParam = selectedSections.includes("all")
        ? "all"
        : selectedSections.join(",");
      const url = `/api/admin/export?sections=${sectionsParam}&format=json&sanitize=${sanitize}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const jsonString = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url2 = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url2;
        const date = new Date().toISOString().split("T")[0];
        a.download = `sonido-liquido-export-${date}.json`;
        a.click();
        URL.revokeObjectURL(url2);

        const sizeKB = Math.round(blob.size / 1024);
        const sizeStr =
          sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

        const last: LastExport = {
          timestamp: new Date().toISOString(),
          format: "json",
          sections: selectedSections,
          size: sizeStr,
        };
        try {
          localStorage.setItem(LAST_EXPORT_KEY, JSON.stringify(last));
          setLastExport(last);
        } catch {
          // ignore
        }

        setExportResult({
          success: true,
          message: `Exportado: ${summarize(data.data.summary)} (${sizeStr})`,
        });
      } else {
        setExportResult({
          success: false,
          message: data.error || "Error al exportar",
        });
      }
    } catch {
      setExportResult({ success: false, message: "Error de conexión" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (selectedSections.includes("all") || selectedSections.length !== 1) {
      setExportResult({
        success: false,
        message:
          "CSV solo soporta una sección a la vez. Deselecciona 'Todo' y elige una sección.",
      });
      return;
    }
    setExporting(true);
    setExportResult(null);
    try {
      const url = `/api/admin/export?sections=${selectedSections[0]}&format=csv&sanitize=${sanitize}`;
      const response = await fetch(url);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url2 = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url2;
      const date = new Date().toISOString().split("T")[0];
      a.download = `${selectedSections[0]}-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url2);

      const sizeKB = Math.round(blob.size / 1024);
      const sizeStr =
        sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

      const last: LastExport = {
        timestamp: new Date().toISOString(),
        format: "csv",
        sections: selectedSections,
        size: sizeStr,
      };
      try {
        localStorage.setItem(LAST_EXPORT_KEY, JSON.stringify(last));
        setLastExport(last);
      } catch {
        // ignore
      }

      setExportResult({
        success: true,
        message: `CSV descargado (${sizeStr}).`,
      });
    } catch (err) {
      setExportResult({
        success: false,
        message: err instanceof Error ? err.message : "Error al exportar CSV",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExport = () => {
    if (format === "csv") handleExportCSV();
    else handleExportJSON();
  };

  // One-click safe export: all sections, JSON, sanitized (no PII / no keys)
  const handleQuickExport = async () => {
    setSelectedSections(["all"]);
    setFormat("json");
    setSanitize(true);
    // Defer to next tick so state propagates before the request fires
    setExporting(true);
    setExportResult(null);
    try {
      const url = `/api/admin/export?sections=all&format=json&sanitize=true`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        const jsonString = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url2 = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url2;
        const date = new Date().toISOString().split("T")[0];
        a.download = `sonido-liquido-export-${date}.json`;
        a.click();
        URL.revokeObjectURL(url2);

        const sizeKB = Math.round(blob.size / 1024);
        const sizeStr =
          sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

        const last: LastExport = {
          timestamp: new Date().toISOString(),
          format: "json",
          sections: ["all"],
          size: sizeStr,
        };
        try {
          localStorage.setItem(LAST_EXPORT_KEY, JSON.stringify(last));
          setLastExport(last);
        } catch {
          // ignore
        }

        setExportResult({
          success: true,
          message: `Exportación rápida completa (${sizeStr}). JSON · todas las secciones · saneado.`,
        });
      } else {
        setExportResult({
          success: false,
          message: data.error || "Error al exportar",
        });
      }
    } catch {
      setExportResult({ success: false, message: "Error de conexión" });
    } finally {
      setExporting(false);
    }
  };

  // Estimate total rows from live counts
  const estimatedTotalRows = (() => {
    if (!counts) return null;
    const selected = selectedSections.includes("all")
      ? Object.keys(counts)
      : selectedSections.filter((s) => counts[s]);
    let total = 0;
    for (const id of selected) {
      for (const t of counts[id].tables) total += t.count;
    }
    return total;
  })();

  const hasSensitiveSelected =
    selectedSections.includes("all") ||
    sections.some((s) => s.sensitive && selectedSections.includes(s.id));

  // ---------------- AI prompt (kept verbatim from original) ----------------
  const generatePrompt =
    () => `# Build a Music Collective Website Like Sonido Líquido

## Overview
Create a comprehensive website for a hip-hop music collective/record label. The site should showcase artists, releases, videos, events, and merchandise while providing tools for fan engagement and content management.

## Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui (heavily customized)
- **Database**: SQLite via Turso with Drizzle ORM
- **Deployment**: Netlify (serverless functions)
- **External APIs**: Spotify, YouTube, Stripe, Dropbox

## Design System
- **Theme**: Dark mode with orange (#f97316) as primary accent
- **Typography**: Oswald for headings (uppercase, tracking-wide), system fonts for body
- **Colors**:
  - Background: #0a0a0a (slc-black)
  - Cards: #1a1a1a (slc-card)
  - Borders: #2a2a2a (slc-border)
  - Muted text: #888888 (slc-muted)
  - Primary: #f97316 (orange)
- **Style**: Modern, editorial, with subtle animations and gradients

## Core Features
1. Artist Profiles (bios, photos, social links, press kits, verification)
2. Discography (Albums, EPs, Singles, Mixtapes; Spotify auto-sync)
3. Video Integration (YouTube API, per-artist channel management)
4. Events (calendar with past/upcoming)
5. Store/E-commerce (Stripe integration, digital + physical)
6. Newsletter & Downloads (email subscription, download gates)
7. Gallery (masonry layout, categories, lightbox)
8. Curated Playlists (Spotify curation, Save to Spotify OAuth)
9. Community (fan wall, user playlists, concert memories, collab stories)
10. Admin Dashboard (full CRUD, sync management, analytics, theme customization)

## Database Schema (Key Tables)
- artists, artist_external_profiles, artist_gallery_assets, artist_relations
- releases, release_artists
- videos, youtube_channels
- events
- products, orders, order_items
- subscribers, segments, email_campaigns
- campaigns, campaign_actions, beats, beat_downloads
- curated_spotify_channels, curated_tracks, playlist_tracks, curated_playlists
- gallery_albums, gallery_photos, photo_tags
- site_settings, custom_styles, artist_styles
- media_releases, press_kits, artist_epk, epk_press_photos, epk_tracks, epk_videos
- vertical_videos, vertical_video_events, vertical_video_tags
- fan_wall_messages, user_playlists, concert_memories, collaboration_stories
- track_lyrics, synced_lyric_lines, playlist_collaborators, trusted_contributors
- push_subscriptions, notification_preferences, scheduled_notifications, notification_history
- ab_tests, ab_test_variants, ab_test_events, email_marketing_campaigns
- social_post_queue, social_posts_log
- sync_jobs, sync_logs
- analytics, video_analytics, video_analytics_aggregates, epk_views
- tags, tag_assignments
- download_gates, download_gate_actions, file_assets
- upcoming_releases, presave_subscribers, presave_clicks

## API Structure
- /api/artists, /api/releases, /api/videos, /api/events, /api/playlists
- /api/admin/* — Admin endpoints (full CRUD + sync + analytics)
- /api/auth/spotify — OAuth for user features
- /api/sync/* — External service sync
- /api/admin/export — Full site data export (JSON/CSV)

## Key Implementation Details
- Spotify: client credentials for data, authorization code for user features
- YouTube: per-artist channel management, video sync with metadata
- Performance: ISR for public pages, lazy loading, image optimization, skeleton states
- Mobile-first responsive design with collapsible navigation

## Environment Variables
DATABASE_URL, DATABASE_AUTH_TOKEN, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, YOUTUBE_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, DROPBOX_ACCESS_TOKEN, SPOTIFY_REDIRECT_URI

## Deployment
Deploy to Netlify as dynamic site, configure env vars, set up Spotify redirect URIs, run database migrations.

Start by setting up the project with \`bunx create-next-app\` and \`bunx shadcn@latest init\`, then implement features incrementally starting with the database schema and artist profiles.
`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatePrompt());
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const downloadCommands = `# Clone or download the project
# Then run these commands:

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
bunx drizzle-kit push

# Start development server
bun run dev

# Build for production
bun run build

# Deploy to Netlify
netlify deploy --prod
`;

  const handleCopyCommands = () => {
    navigator.clipboard.writeText(downloadCommands);
    setCopiedCommands(true);
    setTimeout(() => setCopiedCommands(false), 2000);
  };

  const handleDownloadPrompt = () => {
    const blob = new Blob([generatePrompt()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sonido-liquido-site-prompt.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------------- Render ----------------
  return (
    <div className="min-h-screen bg-slc-black p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-oswald text-3xl uppercase mb-2">
              Exportar Proyecto
            </h1>
            <p className="text-slc-muted">
              Exporta datos del sitio (JSON/CSV) o genera un prompt para
              recrearlo con IA
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/export/template">
              <Button className="gap-2">
                <Sparkles className="w-4 h-4" />
                Plantilla
              </Button>
            </Link>
            <Link href="/admin/themes">
              <Button variant="outline" className="gap-2">
                <Palette className="w-4 h-4" />
                Temas
              </Button>
            </Link>
          </div>
        </div>

        {/* ===================== DATA EXPORT (upgraded) ===================== */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <button
            onClick={() => toggleSection("data")}
            className="flex items-center gap-4 w-full text-left mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <FileJson className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-oswald text-xl uppercase mb-1">
                Exportar Datos
              </h2>
              <p className="text-slc-muted text-sm">
                Descarga los datos del sitio en formato JSON (todo) o CSV (una
                sección) — 22 secciones, ~60 tablas
              </p>
            </div>
            {expandedSections.includes("data") ? (
              <ChevronDown className="w-5 h-5 text-slc-muted" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slc-muted" />
            )}
          </button>

          {expandedSections.includes("data") && (
            <div className="space-y-5">
              {/* ====== QUICK EXPORT — one click, safe defaults ====== */}
              <div className="bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-11 h-11 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="font-oswald text-lg uppercase mb-1">
                      Exportación Rápida
                    </h3>
                    <p className="text-sm text-slc-muted mb-3">
                      Un clic. Todo el sitio en JSON, con datos sensibles
                      saneados (sin PII, sin llaves criptográficas). Seguro
                      para compartir o respaldar.
                    </p>
                    <Button
                      onClick={handleQuickExport}
                      disabled={exporting}
                      className="bg-green-500 hover:bg-green-400 text-black font-semibold gap-2"
                    >
                      {exporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Exportando...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Exportar todo (JSON saneado)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Last export info + refresh */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-slc-muted">
                  <Clock className="w-3.5 h-3.5" />
                  {lastExport ? (
                    <span>
                      Última exportación:{" "}
                      <strong className="text-white">
                        {new Date(lastExport.timestamp).toLocaleString("es-MX")}
                      </strong>{" "}
                      · {lastExport.format.toUpperCase()} · {lastExport.size} ·{" "}
                      {lastExport.sections.includes("all")
                        ? "todo"
                        : `${lastExport.sections.length} secciones`}
                    </span>
                  ) : (
                    <span>Sin exportaciones previas en este navegador</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchCounts}
                  disabled={loadingCounts}
                  className="gap-2"
                >
                  {loadingCounts ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Refrescar conteos
                </Button>
              </div>

              {/* Section selector — grouped */}
              <div className="bg-slc-dark rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-medium">
                    Selecciona qué exportar:
                  </p>
                  {estimatedTotalRows !== null && (
                    <span className="text-xs text-slc-muted">
                      Total estimado:{" "}
                      <strong className="text-white">
                        {estimatedTotalRows.toLocaleString("es-MX")}
                      </strong>{" "}
                      filas
                    </span>
                  )}
                </div>

                {/* All toggle */}
                <button
                  onClick={() => toggleExportSection("all")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all w-full",
                    selectedSections.includes("all")
                      ? "bg-primary/10 border-primary/50 text-primary"
                      : "bg-slc-card border-slc-border hover:border-primary/30",
                  )}
                >
                  {selectedSections.includes("all") ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    Todo (todas las secciones)
                  </span>
                  {counts && selectedSections.includes("all") && (
                    <span className="ml-auto text-xs text-slc-muted">
                      {Object.values(counts)
                        .reduce(
                          (acc, c) =>
                            acc + c.tables.reduce((a, t) => a + t.count, 0),
                          0,
                        )
                        .toLocaleString("es-MX")}{" "}
                      filas totales
                    </span>
                  )}
                </button>

                {/* Grouped sections */}
                {GROUPS.map((group) => {
                  const groupSections = sections.filter(
                    (s) => s.group === group.id,
                  );
                  if (groupSections.length === 0) return null;
                  const Icon = group.icon;
                  return (
                    <div key={group.id} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slc-muted">
                        <Icon className={cn("w-3.5 h-3.5", group.color)} />
                        <span>{group.label}</span>
                        <div className="flex-1 h-px bg-slc-border" />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {groupSections.map((section) => {
                          const SectionIcon =
                            SECTION_ICON[section.id] || Database;
                          const isSelected =
                            selectedSections.includes(section.id) ||
                            selectedSections.includes("all");
                          const sectionCounts = counts?.[section.id];
                          const totalRows = sectionCounts?.tables.reduce(
                            (a, t) => a + t.count,
                            0,
                          );
                          return (
                            <button
                              key={section.id}
                              onClick={() => toggleExportSection(section.id)}
                              disabled={selectedSections.includes("all")}
                              className={cn(
                                "flex items-start gap-2 px-3 py-2 rounded-lg border text-left transition-all",
                                isSelected
                                  ? "bg-primary/10 border-primary/50 text-primary"
                                  : "bg-slc-card border-slc-border hover:border-primary/30",
                                selectedSections.includes("all") &&
                                  "opacity-50 cursor-not-allowed",
                              )}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <SectionIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="text-sm font-medium truncate">
                                    {section.label}
                                  </span>
                                  {section.sensitive && (
                                    <Shield className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-[10px] text-slc-muted truncate">
                                    {section.tables.length} tablas
                                  </span>
                                  {totalRows !== undefined && (
                                    <span className="text-[10px] text-slc-muted">
                                      {totalRows.toLocaleString("es-MX")} filas
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Format + sanitize */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slc-dark rounded-xl p-4">
                  <p className="text-xs font-medium mb-2 uppercase tracking-wide text-slc-muted">
                    Formato
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormat("json")}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all flex-1",
                        format === "json"
                          ? "bg-primary/10 border-primary/50 text-primary"
                          : "bg-slc-card border-slc-border hover:border-primary/30",
                      )}
                    >
                      <FileJson className="w-4 h-4" />
                      <span>JSON (multi-sección)</span>
                    </button>
                    <button
                      onClick={() => setFormat("csv")}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all flex-1",
                        format === "csv"
                          ? "bg-primary/10 border-primary/50 text-primary"
                          : "bg-slc-card border-slc-border hover:border-primary/30",
                      )}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>CSV (1 sección)</span>
                    </button>
                  </div>
                  {format === "csv" && (
                    <p className="text-[11px] text-slc-muted mt-2">
                      CSV exporta solo la primera tabla de la sección
                      seleccionada. Elige una sección específica (no "Todo").
                    </p>
                  )}
                </div>

                <div className="bg-slc-dark rounded-xl p-4">
                  <p className="text-xs font-medium mb-2 uppercase tracking-wide text-slc-muted">
                    Privacidad
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sanitize}
                      onChange={(e) => setSanitize(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded"
                    />
                    <div className="text-xs">
                      <div className="font-medium">
                        Sanitizar datos sensibles
                      </div>
                      <div className="text-slc-muted mt-0.5">
                        Recorta campos PII de suscriptores y siempre redacta
                        claves criptográficas de push notifications.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Export button + result */}
              <div className="flex items-center gap-4 flex-wrap">
                <Button
                  onClick={handleExport}
                  disabled={exporting || selectedSections.length === 0}
                  className="gap-2"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Descargar {format.toUpperCase()}
                    </>
                  )}
                </Button>

                {exportResult && (
                  <p
                    className={cn(
                      "text-sm flex items-center gap-1",
                      exportResult.success ? "text-green-500" : "text-red-500",
                    )}
                  >
                    {exportResult.success ? (
                      <Check className="w-4 h-4" />
                    ) : null}
                    {exportResult.message}
                  </p>
                )}
              </div>

              {/* Sensitive warning */}
              {hasSensitiveSelected && (
                <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-200">
                    <strong>Sección sensible seleccionada.</strong> Los emails
                    de suscriptores y metadatos de push subscriptions se
                    incluyen. Las claves criptográficas (auth/p256dh) siempre se
                    redactan. Maneja este archivo con cuidado y cumple con
                    GDPR/LFPDPPP.
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="bg-slc-dark/50 rounded-lg p-3 text-xs text-slc-muted">
                <strong className="text-white">Nota:</strong> El archivo JSON
                incluye todas las tablas de las secciones seleccionadas con sus
                relaciones. Tablas internas sensibles (
                <code>social_credentials</code>, <code>sessions</code>,{" "}
                <code>users</code>) nunca se exportan, ni siquiera con "Todo".
              </div>
            </div>
          )}
        </div>

        {/* ===================== DOWNLOAD CODE (unchanged) ===================== */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-oswald text-xl uppercase mb-1">
                Descargar Código
              </h2>
              <p className="text-slc-muted text-sm">
                Para descargar el código completo del proyecto, usa el botón de
                descarga en Same.new
              </p>
            </div>
          </div>

          <div className="bg-slc-dark rounded-xl p-4 mb-4">
            <p className="text-sm text-slc-muted mb-3">
              <strong className="text-white">Instrucciones:</strong>
            </p>
            <ol className="list-decimal list-inside text-sm text-slc-muted space-y-2">
              <li>
                En Same.new, haz clic en el menú del proyecto (tres puntos)
              </li>
              <li>Selecciona "Download Project" o "Export"</li>
              <li>El proyecto se descargará como un archivo ZIP</li>
              <li>
                Alternativamente, visita{" "}
                <a
                  href="https://docs.same.new/essentials/project-management#download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  la documentación
                </a>{" "}
                para más opciones
              </li>
            </ol>
          </div>

          <div className="bg-slc-dark rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Comandos de instalación:</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCommands}
                className="gap-2"
              >
                {copiedCommands ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <pre className="text-xs text-slc-muted font-mono bg-black/50 rounded-lg p-3 overflow-x-auto">
              {downloadCommands}
            </pre>
          </div>
        </div>

        {/* ===================== AI PROMPT (unchanged) ===================== */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="font-oswald text-xl uppercase mb-1">
                Prompt para IA
              </h2>
              <p className="text-slc-muted text-sm">
                Usa este prompt con Claude, ChatGPT, o Same.new para recrear un
                sitio similar
              </p>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <Button onClick={handleCopyPrompt} className="gap-2">
              {copiedPrompt ? (
                <>
                  <Check className="w-4 h-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Prompt
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPrompt}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar .md
            </Button>
          </div>

          <div className="bg-slc-dark rounded-xl p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-slc-muted font-mono whitespace-pre-wrap">
              {generatePrompt().slice(0, 2000)}...
              <span className="text-primary"> (ver completo descargando)</span>
            </pre>
          </div>
        </div>

        {/* ===================== PROJECT STRUCTURE (unchanged) ===================== */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <button
            onClick={() => toggleSection("structure")}
            className="flex items-center gap-4 w-full text-left mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Folder className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-oswald text-xl uppercase mb-1">
                Estructura del Proyecto
              </h2>
              <p className="text-slc-muted text-sm">
                Organización de carpetas y archivos principales
              </p>
            </div>
            {expandedSections.includes("structure") ? (
              <ChevronDown className="w-5 h-5 text-slc-muted" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slc-muted" />
            )}
          </button>

          {expandedSections.includes("structure") && (
            <div className="space-y-3">
              {PROJECT_STRUCTURE.map((folder) => (
                <div key={folder.name} className="bg-slc-dark rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Folder className="w-4 h-4 text-primary" />
                    <code className="text-sm font-mono text-white">
                      {folder.name}
                    </code>
                  </div>
                  <p className="text-xs text-slc-muted mb-3">
                    {folder.description}
                  </p>
                  {folder.children && (
                    <div className="pl-4 border-l border-slc-border space-y-2">
                      {folder.children.map((child) => (
                        <div
                          key={child.name}
                          className="flex items-start gap-2"
                        >
                          <FileText className="w-3 h-3 text-slc-muted mt-1" />
                          <div>
                            <code className="text-xs font-mono text-slc-muted">
                              {child.name}
                            </code>
                            <span className="text-xs text-slc-muted/70">
                              {" "}
                              - {child.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===================== FEATURES (unchanged) ===================== */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <button
            onClick={() => toggleSection("features")}
            className="flex items-center gap-4 w-full text-left mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-oswald text-xl uppercase mb-1">
                Funcionalidades
              </h2>
              <p className="text-slc-muted text-sm">
                Las principales características del sitio
              </p>
            </div>
            {expandedSections.includes("features") ? (
              <ChevronDown className="w-5 h-5 text-slc-muted" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slc-muted" />
            )}
          </button>

          {expandedSections.includes("features") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {KEY_FEATURES.map((feature) => (
                <div
                  key={feature.name}
                  className="flex items-start gap-3 bg-slc-dark rounded-xl p-4"
                >
                  <feature.icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{feature.name}</p>
                    <p className="text-xs text-slc-muted">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===================== TECH STACK (unchanged) ===================== */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6">
          <button
            onClick={() => toggleSection("tech")}
            className="flex items-center gap-4 w-full text-left mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Code className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-oswald text-xl uppercase mb-1">Tech Stack</h2>
              <p className="text-slc-muted text-sm">
                Tecnologías utilizadas en el proyecto
              </p>
            </div>
            {expandedSections.includes("tech") ? (
              <ChevronDown className="w-5 h-5 text-slc-muted" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slc-muted" />
            )}
          </button>

          {expandedSections.includes("tech") && (
            <div className="flex flex-wrap gap-2">
              {TECH_STACK.map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1.5 bg-slc-dark rounded-full text-sm border border-slc-border"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
