"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  Package,
  FileText,
  Code,
  Palette,
  Database,
  Settings,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Music,
  Users,
  Video,
  Calendar,
  ShoppingBag,
  Loader2,
  FileJson,
  Folder,
  Terminal,
  Rocket,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import THEMES from "@/lib/themes";

// Template customization options
interface TemplateConfig {
  collectiveName: string;
  tagline: string;
  genre: string;
  primaryColor: string;
  themeId: string;
  includeDemo: boolean;
  includeDocs: boolean;
}

const DEFAULT_CONFIG: TemplateConfig = {
  collectiveName: "Mi Colectivo",
  tagline: "Tu tagline aquí",
  genre: "Hip Hop",
  primaryColor: "#f97316",
  themeId: "hip-hop-classic",
  includeDemo: false,
  includeDocs: true,
};

// Features included in template
const TEMPLATE_FEATURES = [
  { icon: Users, name: "Perfiles de Artistas", description: "Sistema completo de gestión de artistas con bios, fotos y redes sociales" },
  { icon: Music, name: "Discografía", description: "Gestión de lanzamientos con integración de Spotify" },
  { icon: Video, name: "Videos", description: "Integración con YouTube y gestión de canales" },
  { icon: Calendar, name: "Eventos", description: "Calendario de eventos con pasados y próximos" },
  { icon: ShoppingBag, name: "Tienda", description: "E-commerce con integración de Stripe" },
  { icon: Palette, name: "Beats", description: "Venta de beats con previews y download gates" },
  { icon: Database, name: "Playlists", description: "Playlists curadas con Save to Spotify" },
  { icon: Settings, name: "Admin Dashboard", description: "Panel de administración completo" },
];

export default function TemplateExportPage() {
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedSetup, setCopiedSetup] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(["customize", "prompt"]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const selectedTheme = THEMES.find((t) => t.id === config.themeId) || THEMES[0];

  // Generate customized AI prompt
  const generateTemplatePrompt = () => {
    return `# Build a Music Collective Website for "${config.collectiveName}"

## Overview
Create a comprehensive website for "${config.collectiveName}" - a ${config.genre} music collective.
Tagline: "${config.tagline}"

## Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui (customized for music collectives)
- **Database**: SQLite via Turso with Drizzle ORM
- **Deployment**: Netlify (serverless)
- **APIs**: Spotify, YouTube, Stripe

## Design System
- **Theme**: ${selectedTheme.name} (${selectedTheme.description})
- **Primary Color**: ${config.primaryColor}
- **Typography**: ${selectedTheme.fonts.heading} (headings), ${selectedTheme.fonts.body} (body)
- **Style**: ${selectedTheme.style.cardStyle} cards, ${selectedTheme.style.borderRadius} borders, ${selectedTheme.style.animations ? "with animations" : "minimal animations"}
- **Colors**:
  - Primary: ${selectedTheme.colors.primary}
  - Secondary: ${selectedTheme.colors.secondary}
  - Background: ${selectedTheme.colors.background}
  - Card: ${selectedTheme.colors.card}
  - Text: ${selectedTheme.colors.text}

## Core Features

### 1. Artist Profiles
- Individual artist pages with bios, photos, social links
- Role types: MC, DJ, Producer, Singer, etc.
- External profiles (Spotify, YouTube, Instagram, TikTok)
- Press kit generation
- Artist verification badges

### 2. Discography
- Releases: Album, EP, Single, Mixtape
- Spotify integration for auto-sync
- Cover art, streaming links, release dates
- Artist attribution (primary/featured)
- Upcoming releases with countdown

### 3. Video Integration
- YouTube API integration
- Per-artist channel management
- Featured videos section
- Random video carousel

### 4. Events
- Event calendar (past/upcoming)
- Venue, city, date, time
- Ticket links
- Event images

### 5. Store/E-commerce
- Products with Stripe
- Digital & physical items
- Order management

### 6. Newsletter & Downloads
- Email subscription
- Download gates (email-gated content)
- Beat downloads with previews

### 7. Curated Playlists
- Admin creates playlists from artist tracks
- "Save to Spotify" OAuth for users
- Auto-follow artists option

### 8. Community
- Fan wall / comments
- Concert memories
- Collaboration stories

### 9. Admin Dashboard
- Full CRUD for all entities
- Sync management (Spotify, YouTube)
- Analytics overview
- Theme customization
- Dark/Light mode toggle

## Database Schema
Tables needed:
- artists, artist_external_profiles
- releases, release_artists
- videos, youtube_channels
- events
- products, orders
- subscribers
- campaigns, beats
- curated_spotify_channels, curated_tracks, playlist_tracks
- gallery_photos
- site_settings

## File Structure
\`\`\`
src/
├── app/
│   ├── (public)/          # Public pages
│   ├── admin/             # Admin dashboard
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn components
│   ├── public/            # Public components
│   └── admin/             # Admin components
├── db/
│   ├── schema/            # Drizzle tables
│   └── client.ts          # DB connection
└── lib/
    ├── clients/           # API clients
    └── utils.ts           # Helpers
\`\`\`

## Environment Variables
\`\`\`env
DATABASE_URL=
DATABASE_AUTH_TOKEN=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
YOUTUBE_API_KEY=
STRIPE_SECRET_KEY=
\`\`\`

## Getting Started
1. Create Next.js project: \`bunx create-next-app@latest\`
2. Add shadcn/ui: \`bunx shadcn@latest init\`
3. Set up Drizzle ORM with Turso
4. Create database schema
5. Build artist management first
6. Add discography with Spotify sync
7. Implement remaining features

Remember to customize the design for "${config.collectiveName}" with the ${config.genre} aesthetic!
`;
  };

  const setupInstructions = `# Setup Instructions for ${config.collectiveName} Website

## Quick Start

\`\`\`bash
# 1. Create new project
bunx create-next-app@latest ${config.collectiveName.toLowerCase().replace(/\s+/g, "-")} --typescript --tailwind --app

# 2. Navigate to project
cd ${config.collectiveName.toLowerCase().replace(/\s+/g, "-")}

# 3. Install dependencies
bun add drizzle-orm @libsql/client lucide-react

# 4. Add shadcn/ui
bunx shadcn@latest init

# 5. Add shadcn components
bunx shadcn@latest add button input card dialog dropdown-menu tabs

# 6. Set up environment variables
cat > .env << 'EOF'
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-token
SPOTIFY_CLIENT_ID=your-spotify-id
SPOTIFY_CLIENT_SECRET=your-spotify-secret
YOUTUBE_API_KEY=your-youtube-key
EOF

# 7. Start development
bun run dev
\`\`\`

## Theme Configuration

Add these CSS variables to your globals.css:

\`\`\`css
:root {
  --slc-primary: ${selectedTheme.colors.primary};
  --slc-secondary: ${selectedTheme.colors.secondary};
  --slc-background: ${selectedTheme.colors.background};
  --slc-card: ${selectedTheme.colors.card};
  --slc-border: ${selectedTheme.colors.border};
  --slc-text: ${selectedTheme.colors.text};
  --slc-muted: ${selectedTheme.colors.muted};
}
\`\`\`

## Tailwind Configuration

Extend your tailwind.config.ts:

\`\`\`typescript
theme: {
  extend: {
    colors: {
      primary: '${selectedTheme.colors.primary}',
      'slc-black': '${selectedTheme.colors.background}',
      'slc-card': '${selectedTheme.colors.card}',
      'slc-border': '${selectedTheme.colors.border}',
      'slc-muted': '${selectedTheme.colors.muted}',
    },
    fontFamily: {
      oswald: ['${selectedTheme.fonts.heading}', 'sans-serif'],
    },
  },
}
\`\`\`

## Deployment to Netlify

1. Push code to GitHub
2. Connect repo to Netlify
3. Set build command: \`bun run build\`
4. Set publish directory: \`.next\`
5. Add environment variables
6. Deploy!

---
Template generated for: ${config.collectiveName}
Theme: ${selectedTheme.name}
Genre: ${config.genre}
`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generateTemplatePrompt());
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopySetup = () => {
    navigator.clipboard.writeText(setupInstructions);
    setCopiedSetup(true);
    setTimeout(() => setCopiedSetup(false), 2000);
  };

  const handleDownloadTemplate = () => {
    const templateData = {
      name: config.collectiveName,
      tagline: config.tagline,
      genre: config.genre,
      theme: selectedTheme,
      prompt: generateTemplatePrompt(),
      setup: setupInstructions,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.collectiveName.toLowerCase().replace(/\s+/g, "-")}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slc-black p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/export">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-oswald text-3xl uppercase mb-1">
              Exportar como Plantilla
            </h1>
            <p className="text-slc-muted">
              Genera una plantilla reutilizable para otros colectivos musicales
            </p>
          </div>
        </div>

        {/* Customize Section */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <button
            onClick={() => toggleSection("customize")}
            className="flex items-center gap-4 w-full text-left mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-oswald text-xl uppercase mb-1">Personalizar Plantilla</h2>
              <p className="text-slc-muted text-sm">
                Configura los detalles de la nueva plantilla
              </p>
            </div>
            {expandedSections.includes("customize") ? (
              <ChevronDown className="w-5 h-5 text-slc-muted" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slc-muted" />
            )}
          </button>

          {expandedSections.includes("customize") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre del Colectivo
                </label>
                <Input
                  value={config.collectiveName}
                  onChange={(e) => setConfig({ ...config, collectiveName: e.target.value })}
                  placeholder="Mi Colectivo Musical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tagline
                </label>
                <Input
                  value={config.tagline}
                  onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                  placeholder="El mejor hip hop de la ciudad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Género Musical
                </label>
                <select
                  value={config.genre}
                  onChange={(e) => setConfig({ ...config, genre: e.target.value })}
                  className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg"
                >
                  <option value="Hip Hop">Hip Hop</option>
                  <option value="Trap">Trap</option>
                  <option value="Reggaetón">Reggaetón</option>
                  <option value="R&B">R&B</option>
                  <option value="Rock">Rock</option>
                  <option value="Electrónica">Electrónica</option>
                  <option value="Jazz">Jazz</option>
                  <option value="Reggae">Reggae</option>
                  <option value="Pop">Pop</option>
                  <option value="Latin">Latin</option>
                  <option value="Indie">Indie</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tema Visual
                </label>
                <select
                  value={config.themeId}
                  onChange={(e) => {
                    const theme = THEMES.find((t) => t.id === e.target.value);
                    setConfig({
                      ...config,
                      themeId: e.target.value,
                      primaryColor: theme?.colors.primary || config.primaryColor,
                    });
                  }}
                  className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg"
                >
                  {THEMES.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name} - {theme.genre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Color Primario
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="flex-1 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeDocs}
                    onChange={(e) => setConfig({ ...config, includeDocs: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">Incluir documentación detallada</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Preview Card */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <h2 className="font-oswald text-xl uppercase mb-4">Vista Previa</h2>
          <div
            className="rounded-xl overflow-hidden border"
            style={{
              backgroundColor: selectedTheme.colors.background,
              borderColor: selectedTheme.colors.border,
            }}
          >
            <div
              className="p-4 border-b"
              style={{ borderColor: selectedTheme.colors.border }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${config.primaryColor}20` }}
                >
                  <Music className="w-5 h-5" style={{ color: config.primaryColor }} />
                </div>
                <div>
                  <h3
                    className="font-bold uppercase"
                    style={{ color: selectedTheme.colors.text }}
                  >
                    {config.collectiveName}
                  </h3>
                  <p className="text-xs" style={{ color: config.primaryColor }}>
                    {config.tagline}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4" style={{ backgroundColor: selectedTheme.colors.card }}>
              <div className="flex gap-2">
                <span
                  className="px-3 py-1 rounded-full text-xs"
                  style={{
                    backgroundColor: `${config.primaryColor}20`,
                    color: config.primaryColor,
                  }}
                >
                  {config.genre}
                </span>
                <span
                  className="px-3 py-1 rounded-full text-xs"
                  style={{
                    backgroundColor: `${selectedTheme.colors.muted}20`,
                    color: selectedTheme.colors.muted,
                  }}
                >
                  {selectedTheme.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Included */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <h2 className="font-oswald text-xl uppercase mb-4">
            <Gift className="w-5 h-5 inline mr-2 text-primary" />
            Incluido en la Plantilla
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TEMPLATE_FEATURES.map((feature) => (
              <div
                key={feature.name}
                className="flex items-start gap-3 p-3 bg-slc-dark rounded-xl"
              >
                <feature.icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{feature.name}</p>
                  <p className="text-xs text-slc-muted">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Prompt Section */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <button
            onClick={() => toggleSection("prompt")}
            className="flex items-center gap-4 w-full text-left mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-oswald text-xl uppercase mb-1">
                Prompt Personalizado para IA
              </h2>
              <p className="text-slc-muted text-sm">
                Usa este prompt con Claude, ChatGPT, o Same.new
              </p>
            </div>
            {expandedSections.includes("prompt") ? (
              <ChevronDown className="w-5 h-5 text-slc-muted" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slc-muted" />
            )}
          </button>

          {expandedSections.includes("prompt") && (
            <>
              <div className="flex gap-3 mb-4">
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
                <Button variant="outline" onClick={handleCopySetup} className="gap-2">
                  {copiedSetup ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Terminal className="w-4 h-4" />
                      Copiar Setup
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                  <Download className="w-4 h-4" />
                  Descargar Todo
                </Button>
              </div>

              <div className="bg-slc-dark rounded-xl p-4 max-h-80 overflow-y-auto">
                <pre className="text-xs text-slc-muted font-mono whitespace-pre-wrap">
                  {generateTemplatePrompt().slice(0, 1500)}...
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="https://same.new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-slc-card border border-slc-border rounded-xl hover:border-primary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="font-medium">Crear en Same.new</p>
              <p className="text-xs text-slc-muted">Pega el prompt y empieza</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slc-muted ml-auto" />
          </a>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-slc-card border border-slc-border rounded-xl hover:border-primary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">GitHub Template</p>
              <p className="text-xs text-slc-muted">Usa como repositorio base</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slc-muted ml-auto" />
          </a>

          <Link
            href="/admin/themes"
            className="flex items-center gap-4 p-4 bg-slc-card border border-slc-border rounded-xl hover:border-primary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Explorar Temas</p>
              <p className="text-xs text-slc-muted">Ver todos los estilos</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slc-muted ml-auto" />
          </Link>
        </div>
      </div>
    </div>
  );
}
