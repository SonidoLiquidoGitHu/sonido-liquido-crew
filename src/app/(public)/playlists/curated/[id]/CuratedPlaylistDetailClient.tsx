"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  ListMusic,
  Loader2,
  Music,
  Play,
  Share2,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type PlaylistShareData,
  PlaylistStoryCard,
} from "../../PlaylistStoryCard";

// ===========================================
// Types — mirror the shape returned by /api/playlists?id=...
// ===========================================

export interface CuratedPlaylistDetail {
  id: string;
  name: string;
  description: string;
  coverColor: string;
  coverImageUrl?: string | null;
  spotifyPlaylistId?: string | null;
  spotifyPlaylistUrl?: string | null;
  trackCount: number;
}

interface CuratedPlaylistDetailClientProps {
  playlistId: string;
}

// ===========================================
// Fallback playlists — used when the DB isn't configured or the
// requested ID isn't found. Mirrors the list in /api/playlists/route.ts.
// ===========================================

const FALLBACK_PLAYLISTS: CuratedPlaylistDetail[] = [
  {
    id: "gran-reserva",
    name: "Gran Reserva",
    description: "Los mejores tracks del roster",
    coverColor: "#f97316",
    coverImageUrl: null,
    spotifyPlaylistId: "2y0Z7WdObJY1IvCLCXwUez",
    spotifyPlaylistUrl:
      "https://open.spotify.com/playlist/2y0Z7WdObJY1IvCLCXwUez",
    trackCount: 0,
  },
  {
    id: "weekly-picks",
    name: "Picks de la Semana",
    description: "Selección semanal",
    coverColor: "#22c55e",
    coverImageUrl: null,
    spotifyPlaylistId: null,
    spotifyPlaylistUrl: null,
    trackCount: 0,
  },
  {
    id: "new-releases",
    name: "Nuevos Lanzamientos",
    description: "Lo más reciente",
    coverColor: "#3b82f6",
    coverImageUrl: null,
    spotifyPlaylistId: null,
    spotifyPlaylistUrl: null,
    trackCount: 0,
  },
  {
    id: "classics",
    name: "Clásicos",
    description: "Tracks clásicos del crew",
    coverColor: "#8b5cf6",
    coverImageUrl: null,
    spotifyPlaylistId: null,
    spotifyPlaylistUrl: null,
    trackCount: 0,
  },
  {
    id: "collaborations",
    name: "Colaboraciones",
    description: "Featurings y colaboraciones",
    coverColor: "#eab308",
    coverImageUrl: null,
    spotifyPlaylistId: null,
    spotifyPlaylistUrl: null,
    trackCount: 0,
  },
];

// ===========================================
// Main component
// ===========================================

export default function CuratedPlaylistDetailClient({
  playlistId,
}: CuratedPlaylistDetailClientProps) {
  const [playlist, setPlaylist] = useState<CuratedPlaylistDetail | null>(null);
  const [others, setOthers] = useState<CuratedPlaylistDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showStoryCard, setShowStoryCard] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    setHasNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  // Fetch the requested playlist + the list of others
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Fetch the specific playlist
        const detailRes = await fetch(
          `/api/playlists?id=${encodeURIComponent(playlistId)}`,
          { cache: "no-store" },
        );
        const detailData = await detailRes.json();

        if (cancelled) return;

        if (detailData.success && detailData.data) {
          const p = detailData.data;
          setPlaylist({
            id: p.id,
            name: p.name,
            description: p.description || "",
            coverColor: p.coverColor || "#1DB954",
            coverImageUrl: p.coverImageUrl || null,
            spotifyPlaylistId: p.spotifyPlaylistId || null,
            spotifyPlaylistUrl: p.spotifyPlaylistUrl || null,
            trackCount: p.trackCount || 0,
          });
        } else {
          // Try fallback list
          const fallback = FALLBACK_PLAYLISTS.find((p) => p.id === playlistId);
          if (fallback) {
            setPlaylist(fallback);
          } else {
            setNotFound(true);
          }
        }

        // Fetch all playlists for the "others" grid
        const listRes = await fetch("/api/playlists", { cache: "no-store" });
        const listData = await listRes.json();

        if (cancelled) return;

        if (listData.success && Array.isArray(listData.data)) {
          const otherPlaylists = (listData.data as Array<{ id: string; name: string; description?: string; coverColor?: string; coverImageUrl?: string | null; spotifyPlaylistId?: string | null; spotifyPlaylistUrl?: string | null; trackCount?: number }>)
            .filter((p) => p.id !== playlistId)
            .slice(0, 4)
            .map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description || "",
              coverColor: p.coverColor || "#1DB954",
              coverImageUrl: p.coverImageUrl || null,
              spotifyPlaylistId: p.spotifyPlaylistId || null,
              spotifyPlaylistUrl: p.spotifyPlaylistUrl || null,
              trackCount: p.trackCount || 0,
            }));
          setOthers(otherPlaylists);
        }
      } catch (err) {
        console.error("[Curated Playlist Detail] fetch error:", err);
        // Try fallback
        const fallback = FALLBACK_PLAYLISTS.find((p) => p.id === playlistId);
        if (fallback) {
          setPlaylist(fallback);
        } else {
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  const detailUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://sonidoliquido.com/playlists/curated/${playlistId}`;

  function copyLink() {
    try {
      navigator.clipboard.writeText(detailUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2200);
    } catch (err) {
      console.error("clipboard error", err);
    }
  }

  async function nativeShare() {
    if (typeof navigator === "undefined" || !navigator.share) {
      copyLink();
      return;
    }
    try {
      await navigator.share({
        title: playlist
          ? `${playlist.name} — Sonido Líquido Crew`
          : "Sonido Líquido Crew",
        text: playlist
          ? `Escucha "${playlist.name}", playlist curada por Sonido Líquido Crew.`
          : "Playlist curada por Sonido Líquido Crew.",
        url: detailUrl,
      });
    } catch (err) {
      // User cancelled — silent.
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slc-dark via-slc-black to-slc-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1ed760]" />
      </div>
    );
  }

  // Not found state
  if (notFound || !playlist) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slc-dark via-slc-black to-slc-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <ListMusic className="w-16 h-16 text-slc-muted mx-auto mb-4" />
          <h1 className="font-oswald text-2xl uppercase text-white mb-2">
            Playlist no encontrada
          </h1>
          <p className="text-slc-muted mb-6">
            Esta playlist no existe o no está disponible públicamente.
          </p>
          <Link
            href="/playlists"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-black font-bold text-sm uppercase tracking-wide hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Ver Playlists
          </Link>
        </div>
      </div>
    );
  }

  const spotifyUrl =
    playlist.spotifyPlaylistUrl ||
    (playlist.spotifyPlaylistId
      ? `https://open.spotify.com/playlist/${playlist.spotifyPlaylistId}`
      : null);

  const shareData: PlaylistShareData = {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    coverImageUrl: playlist.coverImageUrl,
    coverColor: playlist.coverColor,
    trackCount: playlist.trackCount,
    spotifyPlaylistId: playlist.spotifyPlaylistId,
    spotifyPlaylistUrl: playlist.spotifyPlaylistUrl,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slc-dark via-slc-black to-slc-black">
      {/* Hero */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        {/* Blurred cover backdrop */}
        {playlist.coverImageUrl ? (
          <div className="absolute inset-0">
            <Image
              src={playlist.coverImageUrl}
              alt=""
              fill
              className="object-cover blur-3xl opacity-25 scale-110 pointer-events-none"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-slc-black/85 to-slc-black" />
          </div>
        ) : (
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 30%, ${playlist.coverColor}40 0%, transparent 55%), radial-gradient(circle at 75% 80%, ${playlist.coverColor}25 0%, transparent 55%)`,
            }}
          />
        )}

        <div className="relative section-container">
          <Link
            href="/playlists"
            className="inline-flex items-center gap-2 text-slc-muted hover:text-white mb-8 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Playlists
          </Link>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-start">
            {/* Cover */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-2xl overflow-hidden bg-slc-card shadow-2xl relative ring-1 ring-white/5">
                {playlist.coverImageUrl ? (
                  <Image
                    src={playlist.coverImageUrl}
                    alt={playlist.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 192px, 256px"
                    priority
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${playlist.coverColor}40, ${playlist.coverColor}10)`,
                    }}
                  >
                    <ListMusic
                      className="w-20 h-20"
                      style={{ color: playlist.coverColor }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1DB954]/15 border border-[#1DB954]/30 rounded-full mb-4">
                <svg
                  className="w-3.5 h-3.5 text-[#1ed760]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                <span className="text-[11px] uppercase tracking-widest font-medium text-[#1ed760]">
                  Playlist Curada
                </span>
              </div>

              <h1 className="font-oswald text-4xl md:text-5xl lg:text-6xl uppercase text-white leading-[1.05] mb-4">
                {playlist.name}
              </h1>

              {playlist.description && (
                <p className="text-slc-muted text-base md:text-lg max-w-xl leading-relaxed mb-6">
                  {playlist.description}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slc-muted mb-8">
                <span className="inline-flex items-center gap-1.5">
                  <Music className="w-4 h-4" />
                  {playlist.trackCount > 0
                    ? `${playlist.trackCount} tracks`
                    : "Playlist de Spotify"}
                </span>
                {spotifyUrl && (
                  <span className="inline-flex items-center gap-1.5">
                    <Play className="w-4 h-4" />
                    Reproducir en Spotify
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {spotifyUrl && (
                  <a
                    href={spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-sm uppercase tracking-wide transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    Abrir en Spotify
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <Button
                  onClick={() => setShowStoryCard(true)}
                  variant="outline"
                  className="border-[#1DB954]/40 text-[#1ed760] hover:bg-[#1DB954]/10 hover:text-[#1ed760] hover:border-[#1DB954]/60"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir
                </Button>

                <Button
                  onClick={copyLink}
                  variant="outline"
                  className="border-slc-border text-slc-muted hover:text-white hover:border-slc-border"
                  title="Copiar link de esta página"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar link
                    </>
                  )}
                </Button>

                {hasNativeShare && (
                  <Button
                    onClick={nativeShare}
                    variant="outline"
                    className="border-slc-border text-slc-muted hover:text-white hover:border-slc-border"
                    title="Compartir vía…"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spotify embed */}
      {playlist.spotifyPlaylistId && (
        <section className="pb-12 md:pb-16">
          <div className="section-container">
            <div className="bg-slc-card border border-slc-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slc-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-[#1ed760]" />
                  <span className="text-xs uppercase tracking-widest text-slc-muted">
                    Reproductor · Spotify
                  </span>
                </div>
                <span className="text-xs text-slc-muted">{playlist.name}</span>
              </div>
              <div className="p-3 md:p-4">
                <iframe
                  src={`https://open.spotify.com/embed/playlist/${playlist.spotifyPlaylistId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="420"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-xl"
                  style={{ border: "none" }}
                  title={`Reproductor de ${playlist.name}`}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Other curated playlists */}
      {others.length > 0 && (
        <section className="pb-16 md:pb-24">
          <div className="section-container">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-oswald text-2xl md:text-3xl uppercase text-white tracking-wide">
                Otras playlists curadas
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {others.map((p) => (
                <Link
                  key={p.id}
                  href={`/playlists/curated/${p.id}`}
                  className="group bg-slc-card border border-slc-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-[0_0_25px_-5px_rgba(249,115,22,0.25)] transition-all duration-300"
                >
                  <div className="relative aspect-square w-full overflow-hidden">
                    {p.coverImageUrl ? (
                      <Image
                        src={p.coverImageUrl}
                        alt={p.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${p.coverColor}40, ${p.coverColor}10)`,
                        }}
                      >
                        <ListMusic
                          className="w-12 h-12"
                          style={{ color: p.coverColor }}
                        />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <ChevronRight className="absolute top-3 right-3 w-5 h-5 text-white/70 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-oswald text-base uppercase text-white group-hover:text-primary transition-colors truncate">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-xs text-slc-muted mt-1 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                    {p.trackCount > 0 && (
                      <p className="text-[10px] uppercase tracking-widest text-slc-muted/70 mt-2">
                        {p.trackCount} tracks
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {showStoryCard && (
        <PlaylistStoryCard
          playlist={shareData}
          onClose={() => setShowStoryCard(false)}
        />
      )}
    </div>
  );
}
