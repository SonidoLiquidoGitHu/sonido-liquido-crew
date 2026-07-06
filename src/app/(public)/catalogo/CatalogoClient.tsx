"use client";

import { ArtistCard } from "@/components/public/cards/ArtistCard";
import { BeatCard } from "@/components/public/cards/BeatCard";
import { EventCard } from "@/components/public/cards/EventCard";
import { ReleaseCard } from "@/components/public/cards/ReleaseCard";
import { VideoCard } from "@/components/public/cards/VideoCard";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  Disc3,
  Film,
  History,
  Image as ImageIcon,
  Music,
  Search,
  Tags,
  User,
  Youtube,
} from "lucide-react";
import Link from "next/link";

// ===========================================
// TYPES (mirrors what page.tsx serializes)
// ===========================================

type Profile = {
  id: string;
  platform: string;
  externalUrl: string;
  handle: string | null;
  displayName: string | null;
  isVerified: boolean;
  followerCount: number | null;
};

type Artist = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  shortBio: string | null;
  role: "mc" | "dj" | "producer" | "cantante" | "divo" | "lado_b";
  profileImageUrl: string | null;
  featuredImageUrl: string | null;
  bannerImageUrl: string | null;
  tintColor: string | null;
  location: string | null;
  country: string | null;
  yearStarted: number | null;
  genres: string | null;
  labels: string | null;
  monthlyListeners: number | null;
  followers: number | null;
  isFeatured: boolean;
  profiles: Profile[];
};

type Release = {
  id: string;
  title: string;
  slug: string;
  releaseType: "album" | "ep" | "single" | "maxi-single" | "compilation" | "mixtape";
  releaseDate: string;
  coverImageUrl: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  youtubeMusicUrl: string | null;
  description: string | null;
  isFeatured: boolean;
  artistNames: string[];
};

type Video = {
  id: string;
  title: string;
  description: string | null;
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  viewCount: number | null;
  publishedAt: string | null;
};

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  venue: string;
  city: string;
  country: string;
  eventDate: string;
  eventTime: string | null;
  ticketUrl: string | null;
  imageUrl: string | null;
  isCancelled: boolean;
};

type Playlist = {
  id: string;
  name: string;
  description: string | null;
  spotifyUrl: string;
  coverImageUrl: string | null;
  trackCount: number;
  isOfficial: boolean;
  isFeatured: boolean;
};

type Beat = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  producerName: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  duration: number | null;
  previewAudioUrl: string | null;
  coverImageUrl: string | null;
  isFree: boolean | null;
  gateEnabled: boolean | null;
  playCount: number | null;
};

type GalleryPhoto = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  photographer: string | null;
  albumId: string | null;
  artistId: string | null;
};

type YoutubeChannel = {
  id: string;
  channelName: string;
  channelUrl: string;
  thumbnailUrl: string | null;
  description: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
};

type TimelineItem = {
  id: string;
  type: "release" | "event" | "video";
  date: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  href: string;
};

type CatalogoData = {
  stats: {
    artists: number;
    releases: number;
    videos: number;
    events: number;
    playlists: number;
    beats: number;
    galleryPhotos: number;
    youtubeChannels: number;
  };
  artists: Artist[];
  releases: Release[];
  videos: Video[];
  events: EventItem[];
  playlists: Playlist[];
  beats: Beat[];
  galleryPhotos: GalleryPhoto[];
  youtubeChannels: YoutubeChannel[];
  timeline: TimelineItem[];
};

// ===========================================
// HELPERS
// ===========================================

const ROLE_LABELS: Record<Artist["role"], string> = {
  mc: "MC",
  dj: "DJ",
  producer: "Productor",
  cantante: "Cantante",
  divo: "Divo",
  lado_b: "Lado B",
};

const RELEASE_TYPE_LABELS: Record<Release["releaseType"], string> = {
  album: "Álbum",
  ep: "EP",
  single: "Single",
  "maxi-single": "Maxi-Single",
  compilation: "Compilación",
  mixtape: "Mixtape",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ===========================================
// MAIN COMPONENT
// ===========================================

type TabId =
  | "overview"
  | "artists"
  | "releases"
  | "videos"
  | "events"
  | "playlists"
  | "beats"
  | "gallery"
  | "timeline";

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "overview", label: "Resumen", icon: BarChart3 },
  { id: "artists", label: "Artistas", icon: User },
  { id: "releases", label: "Discografía", icon: Disc3 },
  { id: "videos", label: "Videos", icon: Film },
  { id: "events", label: "Eventos", icon: Calendar },
  { id: "playlists", label: "Playlists", icon: Music },
  { id: "beats", label: "Beats", icon: Music },
  { id: "gallery", label: "Galería", icon: ImageIcon },
  { id: "timeline", label: "Línea de Tiempo", icon: History },
];

export function CatalogoClient({ data }: { data: CatalogoData }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [releaseTypeFilter, setReleaseTypeFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<"upcoming" | "past" | "all">(
    "all",
  );

  const searchLower = search.trim().toLowerCase();

  const matches = (text: string | null | undefined) =>
    !searchLower || (text || "").toLowerCase().includes(searchLower);

  // Filtered datasets
  const filteredArtists = useMemo(
    () =>
      data.artists.filter(
        (a) =>
          (roleFilter === "all" || a.role === roleFilter) &&
          (matches(a.name) ||
            matches(a.bio) ||
            matches(a.shortBio) ||
            matches(a.location) ||
            matches(a.genres)),
      ),
    [data.artists, roleFilter, searchLower],
  );

  const filteredReleases = useMemo(
    () =>
      data.releases.filter(
        (r) =>
          (releaseTypeFilter === "all" || r.releaseType === releaseTypeFilter) &&
          (matches(r.title) ||
            matches(r.description) ||
            r.artistNames.some((n) => matches(n))),
      ),
    [data.releases, releaseTypeFilter, searchLower],
  );

  const filteredVideos = useMemo(
    () =>
      data.videos.filter(
        (v) => matches(v.title) || matches(v.description),
      ),
    [data.videos, searchLower],
  );

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    return data.events.filter((e) => {
      if (eventFilter === "upcoming" && new Date(e.eventDate).getTime() < now)
        return false;
      if (eventFilter === "past" && new Date(e.eventDate).getTime() >= now)
        return false;
      return (
        matches(e.title) ||
        matches(e.description) ||
        matches(e.venue) ||
        matches(e.city) ||
        matches(e.country)
      );
    });
  }, [data.events, eventFilter, searchLower]);

  const filteredPlaylists = useMemo(
    () =>
      data.playlists.filter(
        (p) => matches(p.name) || matches(p.description),
      ),
    [data.playlists, searchLower],
  );

  const filteredBeats = useMemo(
    () =>
      data.beats.filter(
        (b) =>
          matches(b.title) ||
          matches(b.description) ||
          matches(b.producerName) ||
          matches(b.genre),
      ),
    [data.beats, searchLower],
  );

  const filteredGallery = useMemo(
    () =>
      data.galleryPhotos.filter(
        (p) => matches(p.title) || matches(p.description) || matches(p.location),
      ),
    [data.galleryPhotos, searchLower],
  );

  const filteredTimeline = useMemo(
    () =>
      data.timeline.filter(
        (t) => matches(t.title) || matches(t.subtitle),
      ),
    [data.timeline, searchLower],
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slc-text">
      {/* ====== HERO HEADER ====== */}
      <header className="border-b border-slc-border bg-gradient-to-b from-slc-card to-[#0a0a0a]">
        <div className="section-container max-w-7xl py-12 md:py-16">
          <div className="flex items-center gap-2 text-primary text-xs uppercase tracking-widest mb-3">
            <Tags className="w-3 h-3" />
            <span>Base de conocimiento</span>
          </div>
          <h1 className="font-oswald text-4xl md:text-5xl lg:text-6xl uppercase tracking-wide text-white">
            Catálogo Sonido Líquido
          </h1>
          <p className="text-slc-muted mt-4 max-w-2xl text-base md:text-lg">
            Explora todo el colectivo en un solo lugar: artistas, discografía,
            videos, eventos, beats, playlists, galería y una línea de tiempo
            unificada de la historia del crew.
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-8">
            <StatChip label="Artistas" value={data.stats.artists} />
            <StatChip label="Lanzamientos" value={data.stats.releases} />
            <StatChip label="Videos" value={data.stats.videos} />
            <StatChip label="Eventos" value={data.stats.events} />
            <StatChip label="Playlists" value={data.stats.playlists} />
            <StatChip label="Beats" value={data.stats.beats} />
            <StatChip
              label="Fotos"
              value={data.stats.galleryPhotos}
            />
            <StatChip
              label="Canales YT"
              value={data.stats.youtubeChannels}
            />
          </div>
        </div>
      </header>

      {/* ====== STICKY CONTROLS (search + tabs) ====== */}
      <div className="sticky top-16 z-40 bg-slc-black/95 backdrop-blur border-b border-slc-border">
        <div className="section-container max-w-7xl py-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en todo el catálogo… (artistas, lanzamientos, videos, eventos, beats)"
              className="w-full pl-10 pr-4 py-2.5 bg-slc-card border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wide whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-slc-card text-slc-muted border border-slc-border hover:border-primary/50 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====== CONTENT ====== */}
      <main className="section-container max-w-7xl py-10">
        {/* ---------- OVERVIEW ---------- */}
        {activeTab === "overview" && (
          <OverviewSection data={data} onNavigate={setActiveTab} />
        )}

        {/* ---------- ARTISTS ---------- */}
        {activeTab === "artists" && (
          <section className="space-y-5">
            <SectionHeader
              title="Artistas"
              count={filteredArtists.length}
              total={data.artists.length}
            />
            <FilterChips
              label="Rol"
              value={roleFilter}
              options={[
                { value: "all", label: "Todos" },
                { value: "mc", label: "MCs" },
                { value: "dj", label: "DJs" },
                { value: "producer", label: "Productores" },
                { value: "cantante", label: "Cantantes" },
                { value: "divo", label: "Divos" },
                { value: "lado_b", label: "Lado B" },
              ]}
              onChange={setRoleFilter}
            />
            {filteredArtists.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredArtists.map((artist, idx) => (
                  <ArtistCard key={artist.id} artist={artist as never} index={idx} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- RELEASES ---------- */}
        {activeTab === "releases" && (
          <section className="space-y-5">
            <SectionHeader
              title="Discografía"
              count={filteredReleases.length}
              total={data.releases.length}
            />
            <FilterChips
              label="Tipo"
              value={releaseTypeFilter}
              options={[
                { value: "all", label: "Todos" },
                { value: "album", label: "Álbumes" },
                { value: "ep", label: "EPs" },
                { value: "single", label: "Singles" },
                { value: "maxi-single", label: "Maxi-Singles" },
                { value: "compilation", label: "Compilaciones" },
                { value: "mixtape", label: "Mixtapes" },
              ]}
              onChange={setReleaseTypeFilter}
            />
            {filteredReleases.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredReleases.map((release) => (
                  <ReleaseCard
                    key={release.id}
                    release={release as never}
                    showArtist
                    artistName={release.artistNames[0]}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- VIDEOS ---------- */}
        {activeTab === "videos" && (
          <section className="space-y-5">
            <SectionHeader
              title="Videos"
              count={filteredVideos.length}
              total={data.videos.length}
            />
            {filteredVideos.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredVideos.map((video) => (
                  <VideoCard key={video.id} video={video as never} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- EVENTS ---------- */}
        {activeTab === "events" && (
          <section className="space-y-5">
            <SectionHeader
              title="Eventos"
              count={filteredEvents.length}
              total={data.events.length}
            />
            <FilterChips
              label="Fecha"
              value={eventFilter}
              options={[
                { value: "all", label: "Todos" },
                { value: "upcoming", label: "Próximos" },
                { value: "past", label: "Pasados" },
              ]}
              onChange={(v) => setEventFilter(v as typeof eventFilter)}
            />
            {filteredEvents.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event as never} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- PLAYLISTS ---------- */}
        {activeTab === "playlists" && (
          <section className="space-y-5">
            <SectionHeader
              title="Playlists"
              count={filteredPlaylists.length}
              total={data.playlists.length}
            />
            {filteredPlaylists.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredPlaylists.map((p) => (
                  <a
                    key={p.id}
                    href={p.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block bg-slc-card border border-slc-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors"
                  >
                    <div className="aspect-square bg-slc-dark overflow-hidden">
                      {p.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.coverImageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slc-muted">
                          <Music className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        {p.isOfficial && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase">
                            Oficial
                          </span>
                        )}
                        {p.isFeatured && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 uppercase">
                            ★
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm text-white truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-slc-muted mt-0.5">
                        {p.trackCount} tracks
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- BEATS ---------- */}
        {activeTab === "beats" && (
          <section className="space-y-5">
            <SectionHeader
              title="Beats"
              count={filteredBeats.length}
              total={data.beats.length}
            />
            {filteredBeats.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBeats.map((beat) => (
                  <BeatCard key={beat.id} beat={beat as never} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- GALLERY ---------- */}
        {activeTab === "gallery" && (
          <section className="space-y-5">
            <SectionHeader
              title="Galería"
              count={filteredGallery.length}
              total={data.galleryPhotos.length}
            />
            {filteredGallery.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3">
                {filteredGallery.map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photo.id}
                    src={photo.thumbnailUrl || photo.imageUrl}
                    alt={photo.title || ""}
                    title={photo.title || undefined}
                    className="w-full rounded-lg border border-slc-border hover:border-primary/50 transition-colors"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- TIMELINE ---------- */}
        {activeTab === "timeline" && (
          <section className="space-y-5">
            <SectionHeader
              title="Línea de Tiempo"
              count={filteredTimeline.length}
              total={data.timeline.length}
            />
            {filteredTimeline.length === 0 ? (
              <EmptyState />
            ) : (
              <TimelineView items={filteredTimeline} />
            )}
          </section>
        )}
      </main>
    </div>
  );
}

// ===========================================
// SUB-COMPONENTS
// ===========================================

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slc-card border border-slc-border rounded-lg p-3 text-center">
      <div className="font-oswald text-2xl text-primary">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slc-muted mt-0.5">
        {label}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  count,
  total,
}: {
  title: string;
  count: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-oswald text-2xl uppercase tracking-wide text-white">
        {title}
      </h2>
      <span className="text-sm text-slc-muted">
        {count}
        {count !== total && ` de ${total}`}
      </span>
    </div>
  );
}

function FilterChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs uppercase tracking-wider text-slc-muted">
        {label}:
      </span>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
            value === opt.value
              ? "bg-primary/10 border-primary text-primary"
              : "bg-slc-card border-slc-border text-slc-muted hover:border-primary/50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slc-muted">
      <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
      <p>No se encontraron resultados.</p>
      <p className="text-xs mt-1">Prueba con otro término o filtro.</p>
    </div>
  );
}

function OverviewSection({
  data,
  onNavigate,
}: {
  data: CatalogoData;
  onNavigate: (tab: TabId) => void;
}) {
  const cards: {
    tab: TabId;
    label: string;
    count: number;
    icon: typeof User;
    blurb: string;
  }[] = [
    {
      tab: "artists",
      label: "Artistas",
      count: data.stats.artists,
      icon: User,
      blurb: "El roster completo del crew",
    },
    {
      tab: "releases",
      label: "Discografía",
      count: data.stats.releases,
      icon: Disc3,
      blurb: "Álbumes, EPs, singles y más",
    },
    {
      tab: "videos",
      label: "Videos",
      count: data.stats.videos,
      icon: Film,
      blurb: "Videoclips y contenido en YouTube",
    },
    {
      tab: "events",
      label: "Eventos",
      count: data.stats.events,
      icon: Calendar,
      blurb: "Conciertos y presentaciones",
    },
    {
      tab: "playlists",
      label: "Playlists",
      count: data.stats.playlists,
      icon: Music,
      blurb: "Curadurías en Spotify",
    },
    {
      tab: "beats",
      label: "Beats",
      count: data.stats.beats,
      icon: Music,
      blurb: "Instrumentales para descargar",
    },
    {
      tab: "gallery",
      label: "Galería",
      count: data.stats.galleryPhotos,
      icon: ImageIcon,
      blurb: "Fotos del crew en vivo",
    },
    {
      tab: "timeline",
      label: "Línea de Tiempo",
      count: data.timeline.length,
      icon: History,
      blurb: "Historia cronológica unificada",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-oswald text-2xl uppercase tracking-wide text-white mb-4">
          Explora por categoría
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ tab, label, count, icon: Icon, blurb }) => (
            <button
              key={tab}
              onClick={() => onNavigate(tab)}
              className="group text-left bg-slc-card border border-slc-border rounded-xl p-5 hover:border-primary transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className="w-6 h-6 text-primary" />
                <span className="font-oswald text-3xl text-white">{count}</span>
              </div>
              <h3 className="font-medium text-white uppercase text-sm tracking-wide">
                {label}
              </h3>
              <p className="text-xs text-slc-muted mt-1">{blurb}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Featured artists */}
      {data.artists.filter((a) => a.isFeatured).length > 0 && (
        <div>
          <h2 className="font-oswald text-2xl uppercase tracking-wide text-white mb-4">
            Artistas Destacados
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data.artists
              .filter((a) => a.isFeatured)
              .slice(0, 10)
              .map((artist, idx) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist as never}
                  index={idx}
                />
              ))}
          </div>
        </div>
      )}

      {/* Recent timeline preview */}
      {data.timeline.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-oswald text-2xl uppercase tracking-wide text-white">
              Actividad Reciente
            </h2>
            <button
              onClick={() => onNavigate("timeline")}
              className="text-sm text-primary hover:underline"
            >
              Ver todo →
            </button>
          </div>
          <TimelineView items={data.timeline.slice(0, 8)} />
        </div>
      )}

      {/* YouTube channels */}
      {data.youtubeChannels.length > 0 && (
        <div>
          <h2 className="font-oswald text-2xl uppercase tracking-wide text-white mb-4">
            Canales de YouTube
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.youtubeChannels.map((ch) => (
              <a
                key={ch.id}
                href={ch.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 bg-slc-card border border-slc-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-slc-dark overflow-hidden flex-shrink-0">
                  {ch.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ch.thumbnailUrl}
                      alt={ch.channelName}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {ch.channelName}
                  </p>
                  <p className="text-xs text-slc-muted">
                    {formatNumber(ch.subscriberCount)} suscriptores ·{" "}
                    {formatNumber(ch.videoCount)} videos
                  </p>
                </div>
                <Youtube className="w-4 h-4 text-red-500 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineView({ items }: { items: TimelineItem[] }) {
  const typeMeta: Record<
    TimelineItem["type"],
    { label: string; color: string; icon: typeof Disc3 }
  > = {
    release: {
      label: "Lanzamiento",
      color: "text-primary border-primary/40",
      icon: Disc3,
    },
    event: {
      label: "Evento",
      color: "text-blue-400 border-blue-500/40",
      icon: Calendar,
    },
    video: {
      label: "Video",
      color: "text-red-400 border-red-500/40",
      icon: Film,
    },
  };

  return (
    <ol className="relative border-l border-slc-border ml-3 space-y-5">
      {items.map((item) => {
        const meta = typeMeta[item.type];
        const Icon = meta.icon;
        return (
          <li key={item.id} className="ml-6">
            <span
              className={`absolute -left-[13px] flex items-center justify-center w-6 h-6 rounded-full bg-slc-card border ${meta.color}`}
            >
              <Icon className="w-3 h-3" />
            </span>
            <Link
              href={item.href}
              className="group flex gap-4 bg-slc-card border border-slc-border rounded-lg p-3 hover:border-primary/40 transition-colors"
            >
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  className="w-14 h-14 rounded object-cover flex-shrink-0"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] uppercase ${meta.color.split(" ")[0]}`}>
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-slc-muted">
                    {formatDate(item.date)}
                  </span>
                </div>
                <p className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-xs text-slc-muted truncate">
                    {item.subtitle}
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
