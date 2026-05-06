"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Download,
  Copy,
  Check,
  Code,
  FileText,
  Folder,
  Terminal,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Database,
  Palette,
  Music,
  Users,
  Video,
  Calendar,
  ShoppingBag,
  Mail,
  Image,
  Zap,
  Loader2,
  FileJson,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Export sections
const EXPORT_SECTIONS = [
  { id: "artists", name: "Artistas", icon: Users, description: "Perfiles, bios, redes sociales" },
  { id: "releases", name: "Lanzamientos", icon: Music, description: "Discografía completa" },
  { id: "videos", name: "Videos", icon: Video, description: "Videos de YouTube" },
  { id: "youtube", name: "Canales YouTube", icon: Video, description: "Configuración de canales" },
  { id: "events", name: "Eventos", icon: Calendar, description: "Calendario de eventos" },
  { id: "subscribers", name: "Suscriptores", icon: Mail, description: "Lista de emails" },
  { id: "gallery", name: "Galería", icon: Image, description: "Fotos y assets" },
  { id: "beats", name: "Beats", icon: Palette, description: "Catálogo de beats" },
  { id: "campaigns", name: "Campañas", icon: Zap, description: "Campañas de pre-save" },
  { id: "upcoming", name: "Próximos", icon: Calendar, description: "Próximos lanzamientos" },
  { id: "playlists", name: "Playlists", icon: Database, description: "Canales y playlists curadas" },
  { id: "settings", name: "Configuración", icon: Code, description: "Ajustes del sitio" },
];

// Project structure for documentation
const PROJECT_STRUCTURE = [
  {
    name: "src/app",
    description: "Next.js App Router pages and API routes",
    children: [
      { name: "(public)", description: "Public-facing pages (artists, releases, videos, etc.)" },
      { name: "admin", description: "Admin dashboard and management pages" },
      { name: "api", description: "API endpoints for all features" },
    ],
  },
  {
    name: "src/components",
    description: "React components",
    children: [
      { name: "ui", description: "shadcn/ui base components (customized)" },
      { name: "public", description: "Public site components (Header, Footer, sections)" },
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
      { name: "clients", description: "External API clients (Spotify, YouTube)" },
      { name: "services", description: "Business logic services" },
      { name: "utils.ts", description: "Helper functions" },
    ],
  },
];

// Key features for the prompt
const KEY_FEATURES = [
  { icon: Users, name: "Artists", description: "Artist profiles with bios, images, social links, and discographies" },
  { icon: Music, name: "Releases", description: "Discography management with Spotify integration and auto-sync" },
  { icon: Video, name: "Videos", description: "YouTube video integration with channel management" },
  { icon: Calendar, name: "Events", description: "Event calendar with past/upcoming events" },
  { icon: ShoppingBag, name: "Store", description: "E-commerce with Stripe integration" },
  { icon: Mail, name: "Newsletter", description: "Email subscription with download gates" },
  { icon: Image, name: "Gallery", description: "Photo gallery with categories and lightbox" },
  { icon: Zap, name: "Campaigns", description: "Pre-save campaigns with smart links" },
  { icon: Palette, name: "Beats", description: "Beat store with audio preview and download gates" },
  { icon: Database, name: "Playlists", description: "Curated playlists with Save to Spotify feature" },
];

// Tech stack
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

export default function ExportPage() {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCommands, setCopiedCommands] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(["data"]);

  // JSON export state
  const [selectedSections, setSelectedSections] = useState<string[]>(["all"]);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const toggleExportSection = (sectionId: string) => {
    if (sectionId === "all") {
      setSelectedSections(["all"]);
    } else {
      setSelectedSections((prev) => {
        const newSections = prev.filter((s) => s !== "all");
        if (newSections.includes(sectionId)) {
          return newSections.filter((s) => s !== sectionId);
        }
        return [...newSections, sectionId];
      });
    }
  };

  const handleExportJSON = async () => {
    setExporting(true);
    setExportResult(null);

    try {
      const sectionsParam = selectedSections.includes("all")
        ? "all"
        : selectedSections.join(",");

      const response = await fetch(`/api/admin/export?sections=${sectionsParam}`);
      const data = await response.json();

      if (data.success) {
        // Create and download JSON file
        const jsonString = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const date = new Date().toISOString().split("T")[0];
        a.download = `sonido-liquido-export-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);

        setExportResult({
          success: true,
          message: `Exportado: ${data.data.summary?.artistCount || 0} artistas, ${data.data.summary?.releaseCount || 0} releases, ${data.data.summary?.videoCount || 0} videos`,
        });
      } else {
        setExportResult({
          success: false,
          message: data.error || "Error al exportar",
        });
      }
    } catch (error) {
      setExportResult({
        success: false,
        message: "Error de conexión",
      });
    } finally {
      setExporting(false);
    }
  };

  // Generate the AI prompt
  const generatePrompt = () => {
    return `# Build a Music Collective Website Like Sonido Líquido

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

### 1. Artist Profiles
- Individual artist pages with bio, photos, social links
- Role types: MC, DJ, Producer, Singer
- External profile links (Spotify, YouTube, Instagram, etc.)
- Gallery assets per artist
- Artist relations (collaborators, aliases)
- Press kit generation
- Verification status system

### 2. Discography
- Releases with types: Album, EP, Single, Mixtape
- Spotify integration for auto-sync
- Cover art, streaming links, release dates
- Artist attribution (primary/featured)
- Upcoming releases with countdown

### 3. Video Integration
- YouTube API integration
- Per-artist YouTube channel management
- Featured videos section
- Random video carousel
- Video analytics

### 4. Events
- Event calendar with past/upcoming
- Venue, city, date, time
- Ticket links
- Event images

### 5. Store/E-commerce
- Products with Stripe integration
- Digital and physical products
- Order management
- Product categories

### 6. Newsletter & Downloads
- Email subscription
- Download gates (email required)
- Beat downloads with previews
- Campaign landing pages

### 7. Gallery
- Photo gallery with masonry layout
- Category filtering
- Lightbox viewer
- Featured photos

### 8. Curated Playlists
- Admin can curate Spotify channels
- Sync tracks from artist albums
- Create curated playlists
- "Save to Spotify" OAuth flow for users
- Auto-follow artists option

### 9. Community Features
- Fan wall / comments
- User playlists
- Concert memories
- Collab stories

### 10. Admin Dashboard
- Full CRUD for all entities
- Sync management (Spotify, YouTube)
- Analytics overview
- Settings management
- Style customization

## Database Schema (Key Tables)
- artists, artist_external_profiles, artist_gallery_assets
- releases, release_artists
- videos, youtube_channels
- events
- products, orders, order_items
- subscribers, download_gates
- campaigns, beats
- curated_spotify_channels, curated_tracks, playlist_tracks
- gallery_photos
- site_settings

## API Structure
- /api/artists - Artist CRUD
- /api/releases - Release management
- /api/videos - Video management
- /api/events - Events
- /api/playlists - Public playlists
- /api/admin/* - Admin endpoints
- /api/auth/spotify - OAuth for user features
- /api/sync/* - External service sync

## Key Implementation Details

### Spotify Integration
- Client credentials flow for data fetching
- Authorization code flow for user features (Save to Spotify)
- Rate limiting handling
- Track/album/artist caching

### YouTube Integration
- Channel management per artist
- Video sync with metadata
- Thumbnail optimization

### Performance
- ISR (Incremental Static Regeneration) for public pages
- Lazy loading for below-fold content
- Image optimization via Next.js
- Skeleton loading states

### Mobile Responsiveness
- Mobile-first design
- Collapsible navigation
- Touch-friendly interactions
- In-app browser compatibility (Instagram, Facebook)

## File Structure
\`\`\`
src/
├── app/
│   ├── (public)/          # Public pages
│   ├── admin/             # Admin dashboard
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── public/            # Public components
│   └── admin/             # Admin components
├── db/
│   ├── schema/            # Drizzle table definitions
│   ├── migrations/        # SQL migrations
│   └── client.ts          # DB connection
├── lib/
│   ├── clients/           # API clients
│   ├── services/          # Business logic
│   └── utils.ts           # Helpers
└── types/                 # TypeScript types
\`\`\`

## Environment Variables Needed
- DATABASE_URL, DATABASE_AUTH_TOKEN (Turso)
- SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
- YOUTUBE_API_KEY
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- DROPBOX_ACCESS_TOKEN
- SPOTIFY_REDIRECT_URI (for OAuth)

## Deployment
- Deploy to Netlify as dynamic site
- Configure environment variables
- Set up Spotify redirect URIs
- Run database migrations

Start by setting up the project with \`bunx create-next-app\` and \`bunx shadcn@latest init\`, then implement features incrementally starting with the database schema and artist profiles.
`;
  };

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

  return (
    <div className="min-h-screen bg-slc-black p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-oswald text-3xl uppercase mb-2">
              Exportar Proyecto
            </h1>
            <p className="text-slc-muted">
              Exporta datos del sitio o genera un prompt para recrearlo con IA
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

        {/* JSON Data Export Section */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <button
            onClick={() => toggleSection("data")}
            className="flex items-center gap-4 w-full text-left mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <FileJson className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-oswald text-xl uppercase mb-1">Exportar Datos JSON</h2>
              <p className="text-slc-muted text-sm">
                Descarga todos los datos del sitio en formato JSON para migración
              </p>
            </div>
            {expandedSections.includes("data") ? (
              <ChevronDown className="w-5 h-5 text-slc-muted" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slc-muted" />
            )}
          </button>

          {expandedSections.includes("data") && (
            <div className="space-y-4">
              {/* Section Selector */}
              <div className="bg-slc-dark rounded-xl p-4">
                <p className="text-sm font-medium mb-3">Selecciona qué exportar:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {/* All option */}
                  <button
                    onClick={() => toggleExportSection("all")}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all",
                      selectedSections.includes("all")
                        ? "bg-primary/10 border-primary/50 text-primary"
                        : "bg-slc-card border-slc-border hover:border-primary/30"
                    )}
                  >
                    {selectedSections.includes("all") ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">Todo</span>
                  </button>

                  {EXPORT_SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => toggleExportSection(section.id)}
                      disabled={selectedSections.includes("all")}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all",
                        selectedSections.includes(section.id) || selectedSections.includes("all")
                          ? "bg-primary/10 border-primary/50 text-primary"
                          : "bg-slc-card border-slc-border hover:border-primary/30",
                        selectedSections.includes("all") && "opacity-50"
                      )}
                    >
                      {selectedSections.includes(section.id) || selectedSections.includes("all") ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      <div>
                        <span className="text-sm font-medium">{section.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Button */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleExportJSON}
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
                      Descargar JSON
                    </>
                  )}
                </Button>

                {exportResult && (
                  <p className={cn(
                    "text-sm",
                    exportResult.success ? "text-green-500" : "text-red-500"
                  )}>
                    {exportResult.success ? (
                      <Check className="w-4 h-4 inline mr-1" />
                    ) : null}
                    {exportResult.message}
                  </p>
                )}
              </div>

              {/* Info */}
              <div className="bg-slc-dark/50 rounded-lg p-3 text-xs text-slc-muted">
                <strong className="text-white">Nota:</strong> El archivo JSON incluye todos los datos seleccionados.
                Puedes usarlo para migrar a otro sitio o como backup. Los datos sensibles como contraseñas no se incluyen.
              </div>
            </div>
          )}
        </div>

        {/* Download Code Section */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-oswald text-xl uppercase mb-1">Descargar Código</h2>
              <p className="text-slc-muted text-sm">
                Para descargar el código completo del proyecto, usa el botón de descarga en Same.new
              </p>
            </div>
          </div>

          <div className="bg-slc-dark rounded-xl p-4 mb-4">
            <p className="text-sm text-slc-muted mb-3">
              <strong className="text-white">Instrucciones:</strong>
            </p>
            <ol className="list-decimal list-inside text-sm text-slc-muted space-y-2">
              <li>En Same.new, haz clic en el menú del proyecto (tres puntos)</li>
              <li>Selecciona "Download Project" o "Export"</li>
              <li>El proyecto se descargará como un archivo ZIP</li>
              <li>Alternativamente, visita <a href="https://docs.same.new/essentials/project-management#download" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">la documentación</a> para más opciones</li>
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

        {/* AI Prompt Section */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="font-oswald text-xl uppercase mb-1">Prompt para IA</h2>
              <p className="text-slc-muted text-sm">
                Usa este prompt con Claude, ChatGPT, o Same.new para recrear un sitio similar
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
            <Button variant="outline" onClick={handleDownloadPrompt} className="gap-2">
              <Download className="w-4 h-4" />
              Descargar .md
            </Button>
          </div>

          {/* Preview */}
          <div className="bg-slc-dark rounded-xl p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-slc-muted font-mono whitespace-pre-wrap">
              {generatePrompt().slice(0, 2000)}...
              <span className="text-primary"> (ver completo descargando)</span>
            </pre>
          </div>
        </div>

        {/* Project Structure */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <button
            onClick={() => toggleSection("structure")}
            className="flex items-center gap-4 w-full text-left mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Folder className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-oswald text-xl uppercase mb-1">Estructura del Proyecto</h2>
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
                    <code className="text-sm font-mono text-white">{folder.name}</code>
                  </div>
                  <p className="text-xs text-slc-muted mb-3">{folder.description}</p>
                  {folder.children && (
                    <div className="pl-4 border-l border-slc-border space-y-2">
                      {folder.children.map((child) => (
                        <div key={child.name} className="flex items-start gap-2">
                          <FileText className="w-3 h-3 text-slc-muted mt-1" />
                          <div>
                            <code className="text-xs font-mono text-slc-muted">{child.name}</code>
                            <span className="text-xs text-slc-muted/70"> - {child.description}</span>
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

        {/* Features Overview */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <button
            onClick={() => toggleSection("features")}
            className="flex items-center gap-4 w-full text-left mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-oswald text-xl uppercase mb-1">Funcionalidades</h2>
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
                    <p className="text-xs text-slc-muted">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tech Stack */}
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
