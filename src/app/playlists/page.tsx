"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ListMusic, Play, ExternalLink, Loader2, Music2, Headphones,
  ChevronRight, Lock, Globe, Settings,
} from "lucide-react";

// ── Curated playlists that are always shown on the public page ────
// These are SLC playlist IDs that will be embedded and displayed.
// When you create playlists via the admin, add their IDs here.

const FEATURED_PLAYLIST_IDS = [
  "5qHTKCZIwi3GM3mhPq45Ab", // Existing SLC playlist from the homepage embed
];

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  // Parse auth status from URL params using useMemo (not in effect)
  const { authError, authSuccess } = useMemo(() => {
    if (typeof window === "undefined") return { authError: null, authSuccess: false };
    const params = new URLSearchParams(window.location.search);
    const error = params.get("auth_error");
    const success = params.get("auth_success");
    // Clean up URL
    if (error || success) {
      window.history.replaceState({}, "", "/playlists");
    }
    return {
      authError: error ? decodeURIComponent(error) : null,
      authSuccess: !!success,
    };
  }, []);

  // Fetch user playlists (if authenticated)
  useEffect(() => {
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((data) => {
        if (data.playlists) {
          setPlaylists(data.playlists);
        }
      })
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="relative flex items-center justify-center overflow-hidden px-4 py-16 sm:py-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            <ListMusic className="h-3.5 w-3.5 text-primary" />
            Curated by SLC
          </div>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            PLAYLISTS
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Playlists curadas por Sonido Líquido Crew. Lo mejor del Hip Hop mexicano y más.
          </p>
        </div>
      </section>

      {/* Auth Status Messages */}
      {authError && (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Error de autenticación: {authError}
          </div>
        </div>
      )}
      {authSuccess && (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            Sesión iniciada correctamente. Puedes gestionar tus playlists desde el admin.
          </div>
        </div>
      )}

      {/* Featured SLC Playlist Embeds */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Playlist Oficial SLC</h2>
            <p className="mt-1 text-muted-foreground">
              La selección oficial del colectivo, actualizada constantemente
            </p>
          </div>
          <Link
            href="/playlists/admin"
            className="hidden items-center gap-1.5 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground sm:inline-flex"
          >
            <Settings className="h-3.5 w-3.5" />
            Gestionar Playlists
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {FEATURED_PLAYLIST_IDS.map((id) => (
            <div key={id} className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]">
              <iframe
                src={`https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`}
                width="100%"
                height="380"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ backgroundColor: "#1a1a1a" }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* User's Playlists (if authenticated) */}
      {!loading && playlists.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
          <div className="mb-8">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Tus Playlists</h2>
            <p className="mt-1 text-muted-foreground">
              Playlists creadas desde el admin de SLC
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((pl) => {
              const images = pl.images as { url: string; height: number; width: number }[] | undefined;
              const tracks = pl.tracks as { total: number } | undefined;
              const externalUrls = pl.external_urls as { spotify: string } | undefined;
              return (
                <div
                  key={String(pl.id)}
                  className="group overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all hover:border-primary/30"
                >
                  <div className="relative aspect-video overflow-hidden bg-[#2a2a2a]">
                    {images && images.length > 0 ? (
                      <Image
                        src={images[0].url}
                        alt={String(pl.name)}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ListMusic className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    {externalUrls?.spotify && (
                      <a
                        href={externalUrls.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#1DB954] text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Play className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-base font-bold">{String(pl.name)}</h3>
                      {pl.public ? (
                        <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      ) : (
                        <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tracks?.total ?? 0} tracks
                    </p>
                    {pl.description && String(pl.description).length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {String(pl.description)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA to Admin */}
      <section className="border-y border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <Headphones className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Crea tus propias playlists</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Inicia sesión con Spotify para crear y gestionar playlists curadas con tracks del roster y otros artistas.
          </p>
          <Link
            href="/playlists/admin"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ListMusic className="h-4 w-4" />
            Ir al Playlist Creator
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Mobile Admin Link */}
      <div className="p-4 text-center sm:hidden">
        <Link
          href="/playlists/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          <Settings className="h-4 w-4" />
          Gestionar Playlists
        </Link>
      </div>
    </main>
  );
}
