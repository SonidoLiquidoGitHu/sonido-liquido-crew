"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  Play,
  Youtube,
  Search,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ── Types ─────────────────────────────────────────────── */
interface VideoArtist {
  id: string;
  name: string;
  slug: string | null;
  image: string | null;
}

interface Video {
  id: string;
  title: string;
  youtubeId: string | null;
  thumbnail: string | null;
  description: string | null;
  duration: string | null;
  viewCount: number;
  isFeatured: boolean;
  publishedAt: string | null;
  artist: VideoArtist | null;
}

/* ── Page ──────────────────────────────────────────────── */
export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [artistFilter, setArtistFilter] = useState<string>("Todos");
  const [embedId, setEmbedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/videos")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setVideos(data);
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  /* Unique artist names for filter */
  const artistNames = ["Todos", ...Array.from(new Set(videos.map((v) => v.artist?.name).filter((n): n is string => typeof n === "string")))];

  /* Filter logic */
  const filtered = videos.filter((v) => {
    const matchSearch =
      !search ||
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      (v.artist?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchArtist =
      artistFilter === "Todos" || v.artist?.name === artistFilter;
    return matchSearch && matchArtist;
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <Youtube className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Videos</h1>
        </div>
        <p className="max-w-xl text-lg text-muted-foreground">
          Videoclips, sesiones en vivo y contenido exclusivo del crew en YouTube.
        </p>
      </div>

      {/* Embedded player */}
      {embedId && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="relative aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            type="text"
            placeholder="Buscar videos o artistas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-border bg-card placeholder:text-muted-foreground/50 focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {artistNames.map((name) => (
            <Button
              key={name}
              variant={artistFilter === name ? "default" : "outline"}
              size="sm"
              onClick={() => setArtistFilter(name)}
              className={
                artistFilter === name
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50"
              }
            >
              {name}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Cargando videos&hellip;</p>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 py-20 text-center">
          <Youtube className="h-12 w-12 text-primary/50" />
          <h2 className="text-xl font-bold">Próximamente</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Videos nuevos en camino. Mientras tanto, visita nuestro canal de YouTube.
          </p>
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Youtube className="h-4 w-4" />
            Ir a YouTube
          </a>
        </div>
      )}

      {/* Videos grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={() => setEmbedId(video.youtubeId ?? null)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

/* ── Video Card ────────────────────────────────────────── */
function VideoCard({
  video,
  onPlay,
}: {
  video: Video;
  onPlay: () => void;
}) {
  const thumbnail =
    video.thumbnail ||
    (video.youtubeId
      ? `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`
      : null);

  const dateStr = video.publishedAt
    ? new Date(video.publishedAt).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30">
      {/* Thumbnail */}
      <div
        className="relative aspect-video cursor-pointer overflow-hidden bg-border"
        onClick={onPlay}
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={video.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Youtube className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Play className="h-5 w-5" />
          </div>
        </div>
        {/* Duration */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 rounded bg-[#0a0a0a]/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
            {video.duration}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-bold">{video.title}</h3>
        {video.artist && (
          <p className="mt-1 text-xs text-muted-foreground">{video.artist.name}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          {video.viewCount > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {video.viewCount.toLocaleString("es-MX")}
            </span>
          )}
          {dateStr && <span>{dateStr}</span>}
        </div>
      </div>

      {/* YouTube link */}
      {video.youtubeId && (
        <div className="border-t border-border px-4 py-2">
          <a
            href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            <ExternalLink className="h-3 w-3" />
            Ver en YouTube
          </a>
        </div>
      )}
    </div>
  );
}
