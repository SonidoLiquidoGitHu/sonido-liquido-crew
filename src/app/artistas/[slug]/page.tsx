"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Loader2, AlertCircle, ExternalLink,
  Play, Instagram, Youtube, Disc3, Music,
} from "lucide-react";
import { reporter, parseApiError } from "@/lib/error-reporter";
import {
  type Artist, type Release, type YouTubeVideo,
  safeString, safeNumber,
} from "@/lib/types";

interface ArtistDetail {
  artist: Artist;
  releases: Release[];
  videos: YouTubeVideo[];
}

export default function ArtistDetailPage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/artists/${params.slug}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        return res.json();
      })
      .then((json) => {
        const apiError = parseApiError(json, "");
        if (apiError) throw new Error(apiError);

        const artist: Artist = {
          id: safeString(json.artist?.id, ""),
          name: safeString(json.artist?.name, "Unknown Artist"),
          image: safeString(json.artist?.image),
          followers: json.artist?.followers ?? null,
          spotifyUrl: safeString(json.artist?.spotifyUrl),
          popularity: json.artist?.popularity ?? null,
          releases: safeNumber(json.artist?.releases),
          genres: Array.isArray(json.artist?.genres) ? json.artist.genres : [],
          instagram: json.artist?.instagram ?? null,
          youtubeChannelId: json.artist?.youtubeChannelId ?? null,
          youtubeHandle: json.artist?.youtubeHandle ?? null,
        };

        const releases: Release[] = Array.isArray(json.releases)
          ? json.releases.map((r: Record<string, unknown>) => ({
              id: safeString(r.id),
              name: safeString(r.name, "Unknown"),
              artistName: safeString(r.artistName),
              image: safeString(r.image),
              releaseDate: safeString(r.releaseDate),
              type: (r.type as Release["type"]) || "album",
              spotifyUrl: safeString(r.spotifyUrl),
            }))
          : [];

        const videos: YouTubeVideo[] = Array.isArray(json.videos)
          ? json.videos.map((v: Record<string, unknown>) => ({
              videoId: safeString(v.videoId),
              title: safeString(v.title),
              thumbnail: safeString(v.thumbnail),
              channelTitle: safeString(v.channelTitle),
            }))
          : [];

        if (!artist.id) {
          setData(null);
        } else {
          setData({ artist, releases, videos });
        }
      })
      .catch((err) => {
        reporter.error({
          source: "page:/artistas/[slug]",
          action: "fetch-artist",
          error: err,
          meta: { slug: params.slug },
        });
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Cargando artista&hellip;</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">Error al cargar artista</p>
          <p className="max-w-md text-xs text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            Intentar de nuevo
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">Artista no encontrado</p>
          <Link
            href="/artistas"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Artistas
          </Link>
        </div>
      </main>
    );
  }

  const { artist, releases, videos } = data;
  const hasImage = typeof artist.image === "string" && artist.image.length > 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/artistas"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Artistas
      </Link>

      {/* ── Artist Header ── */}
      <div className="grid gap-8 lg:grid-cols-[360px_1fr] lg:gap-12">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-border">
          {hasImage ? (
            <Image
              src={artist.image}
              alt={artist.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 360px"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-7xl font-bold text-muted-foreground">
              {artist.name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/50 to-transparent" />
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            {artist.name}
          </h1>
          <div className="mt-1 text-sm text-muted-foreground">Sonido Líquido Crew</div>

          {/* Genres */}
          {artist.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {artist.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 h-px w-16 bg-primary" />

          {/* Stats — only show releases count (which works) */}
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl border border-border bg-card px-5 py-3 text-center">
              <Disc3 className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-lg font-black">{artist.releases}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Lanzamientos</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-5 py-3 text-center">
              <Music className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-lg font-black">SLC</p>
              <p className="text-[10px] text-muted-foreground uppercase">Sonido Líquido</p>
            </div>
          </div>

          {/* Social + Spotify CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            {artist.spotifyUrl && (
              <a
                href={artist.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                <Play className="h-4 w-4" />
                Abrir en Spotify
              </a>
            )}
            {artist.instagram && (
              <a
                href={artist.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-pink-500"
              >
                <Instagram className="h-4 w-4 text-pink-500" />
                Instagram
              </a>
            )}
            {artist.youtubeChannelId ? (
              <a
                href={`https://www.youtube.com/channel/${artist.youtubeChannelId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-red-500"
              >
                <Youtube className="h-4 w-4 text-red-500" />
                {artist.youtubeHandle ? `${artist.youtubeHandle}` : "YouTube"}
              </a>
            ) : (
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(artist.name + " Sonido Líquido")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-red-500"
              >
                <Youtube className="h-4 w-4 text-red-500" />
                YouTube
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Spotify Embed (Full Artist Player) ── */}
      {artist.id && (
        <section className="mt-16">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight">Escuchar en Spotify</h2>
            {artist.spotifyUrl && (
              <a
                href={artist.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
              >
                Ver perfil completo <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="mt-6">
            <iframe
              src={`https://open.spotify.com/embed/artist/${artist.id}?utm_source=generator&theme=0`}
              width="100%"
              height="400"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl border border-border"
              style={{ backgroundColor: "var(--card)" }}
            />
          </div>
        </section>
      )}

      {/* ── Latest Releases ── */}
      {releases.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-black tracking-tight">Lanzamientos</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {releases.map((release) => (
              <a
                key={release.id}
                href={release.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30"
              >
                <div className="relative aspect-square overflow-hidden bg-border">
                  {release.image ? (
                    <Image src={release.image} alt={release.name} fill className="object-cover" sizes="200px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                      {release.name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Play className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold">{release.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{release.type} · {release.releaseDate?.slice(0, 7)}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── YouTube Videos ── */}
      <section className="mt-16">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight">Videos</h2>
          {artist.youtubeChannelId ? (
            <a
              href={`https://www.youtube.com/channel/${artist.youtubeChannelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:opacity-80"
            >
              {artist.youtubeHandle ? `${artist.youtubeHandle} en YouTube` : "Ver canal en YouTube"} <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(artist.name + " Sonido Líquido")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:opacity-80"
            >
              Ver más en YouTube <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {videos.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <div
                key={video.videoId}
                className="overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-red-500/30"
              >
                <div className="relative aspect-video overflow-hidden bg-border">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.videoId}`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium">{video.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{video.channelTitle}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-border bg-card p-8 text-center">
            <Youtube className="mx-auto mb-3 h-10 w-10 text-red-500/50" />
            <p className="text-sm text-muted-foreground">
              Videos de {artist.name} en YouTube
            </p>
            {artist.youtubeChannelId ? (
              <a
                href={`https://www.youtube.com/channel/${artist.youtubeChannelId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                <Youtube className="h-4 w-4" />
                Ver canal en YouTube
              </a>
            ) : (
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(artist.name + " Sonido Líquido")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                <Youtube className="h-4 w-4" />
                Buscar en YouTube
              </a>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
