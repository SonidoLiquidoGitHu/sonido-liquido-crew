"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Loader2, AlertCircle, Users, ExternalLink,
  Disc3, Play, Clock, Music2, Instagram, Youtube,
} from "lucide-react";
import { reporter, parseApiError } from "@/lib/error-reporter";
import {
  type Artist, type Track, type Release, type YouTubeVideo,
  formatFollowers, formatDuration, safeString, safeNumber,
} from "@/lib/types";

interface ArtistDetail {
  artist: Artist;
  tracks: Track[];
  releases: Release[];
  videos: YouTubeVideo[];
}

export default function ArtistDetailPage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<ArtistDetail | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
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
          followers: safeNumber(json.artist?.followers),
          spotifyUrl: safeString(json.artist?.spotifyUrl),
          popularity: safeNumber(json.artist?.popularity),
          releases: safeNumber(json.artist?.releases),
          instagram: json.artist?.instagram ?? null,
          youtubeChannelId: json.artist?.youtubeChannelId ?? null,
          youtubeHandle: json.artist?.youtubeHandle ?? null,
        };

        const tracks: Track[] = Array.isArray(json.tracks)
          ? json.tracks.map((t: Record<string, unknown>) => ({
              id: safeString(t.id),
              name: safeString(t.name, "Unknown"),
              album: safeString(t.album),
              albumImage: safeString(t.albumImage),
              durationMs: safeNumber(t.durationMs),
              spotifyUrl: safeString(t.spotifyUrl),
              previewUrl: t.previewUrl ? String(t.previewUrl) : null,
            }))
          : [];

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
          setData({ artist, tracks, releases, videos });
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
            className="mt-2 rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1a1a1a] hover:text-foreground"
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

  const { artist, tracks, releases, videos } = data;
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
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#2a2a2a]">
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
          <div className="mt-2 text-sm text-muted-foreground">Sonido Líquido Crew</div>
          <div className="mt-6 h-px w-16 bg-primary" />

          {/* Stats Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-center">
              <Users className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-lg font-black">{formatFollowers(artist.followers)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Seguidores</p>
            </div>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-center">
              <Disc3 className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-lg font-black">{artist.releases}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Lanzamientos</p>
            </div>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-center">
              <Music2 className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-lg font-black">{artist.popularity}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Popularidad</p>
            </div>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-center">
              <div className="mx-auto mb-1 h-4 flex items-center justify-center">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a2a]">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${artist.popularity}%` }} />
                </div>
              </div>
              <p className="text-lg font-black">{artist.popularity}/100</p>
              <p className="text-[10px] text-muted-foreground uppercase">Spotify Score</p>
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
                className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-pink-500"
              >
                <Instagram className="h-4 w-4 text-pink-500" />
                Instagram
              </a>
            )}
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(artist.name + " Sonido Líquido")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-red-500"
            >
              <Youtube className="h-4 w-4 text-red-500" />
              YouTube
            </a>
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
              className="rounded-xl border border-[#2a2a2a]"
              style={{ backgroundColor: "#1a1a1a" }}
            />
          </div>
        </section>
      )}

      {/* ── Top Tracks ── */}
      {tracks.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-black tracking-tight">Canciones Populares</h2>
          <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]">
            {tracks.map((track, i) => (
              <div
                key={track.id}
                className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[#2a2a2a] ${
                  i < tracks.length - 1 ? "border-b border-[#2a2a2a]" : ""
                }`}
              >
                <span className="w-6 text-right text-sm text-muted-foreground">{i + 1}</span>

                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-[#2a2a2a]">
                  {track.albumImage ? (
                    <Image src={track.albumImage} alt={track.album} fill className="object-cover" sizes="40px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                      {track.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{track.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{track.album}</p>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(track.durationMs)}
                </div>

                {/* Play preview button */}
                {track.previewUrl ? (
                  <button
                    onClick={() => {
                      const audio = document.getElementById(`preview-${track.id}`) as HTMLAudioElement;
                      if (playingTrack === track.id) {
                        audio?.pause();
                        setPlayingTrack(null);
                      } else {
                        document.querySelectorAll("audio").forEach((a) => a.pause());
                        audio?.play();
                        setPlayingTrack(track.id);
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a2a] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Play className={`h-3.5 w-3.5 ${playingTrack === track.id ? "animate-pulse" : ""}`} />
                  </button>
                ) : (
                  <a
                    href={track.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a2a] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {/* Hidden audio element for preview */}
                {track.previewUrl && (
                  <audio
                    id={`preview-${track.id}`}
                    src={track.previewUrl}
                    onEnded={() => setPlayingTrack(null)}
                    className="hidden"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Latest Releases ── */}
      {releases.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-black tracking-tight">Lanzamientos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {releases.map((release) => (
              <a
                key={release.id}
                href={release.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all hover:border-primary/30"
              >
                <div className="relative aspect-square overflow-hidden bg-[#2a2a2a]">
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
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(artist.name + " Sonido Líquido")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:opacity-80"
          >
            Ver más en YouTube <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {videos.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <div
                key={video.videoId}
                className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all hover:border-red-500/30"
              >
                <div className="relative aspect-video overflow-hidden bg-[#2a2a2a]">
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
          <div className="mt-6 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center">
            <Youtube className="mx-auto mb-3 h-10 w-10 text-red-500/50" />
            <p className="text-sm text-muted-foreground">
              Videos de {artist.name} en YouTube
            </p>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(artist.name + " Sonido Líquido")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              <Youtube className="h-4 w-4" />
              Buscar en YouTube
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
