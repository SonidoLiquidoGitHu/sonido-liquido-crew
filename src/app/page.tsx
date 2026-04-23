"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Disc3, Users, Calendar, Music2, Play, ExternalLink,
  ChevronRight, Loader2, Headphones, Bell,
} from "lucide-react";
import { type Artist, normalizeArtist } from "@/lib/types";
import { NewsletterForm } from "@/components/newsletter-form";

// ── Upcoming Release type (from /api/upcoming-releases) ──
interface UpcomingRelease {
  id: string;
  title: string;
  type: string;
  releaseDate: string | null;
  coverUrl: string | null;
  artist: {
    id: string;
    name: string;
    slug: string | null;
    image: string | null;
  };
}

export default function HomePage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredArtist, setFeaturedArtist] = useState<Artist | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroFade, setHeroFade] = useState(true);
  const [upcomingReleases, setUpcomingReleases] = useState<UpcomingRelease[]>([]);

  // Fetch artists
  useEffect(() => {
    fetch("/api/artists")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) return;
        const normalized = data.map((item: Record<string, unknown>) => normalizeArtist(item));
        setArtists(normalized);
        // Pick a random artist on load
        if (normalized.length > 0) {
          const randomIdx = Math.floor(Math.random() * normalized.length);
          setFeaturedArtist(normalized[randomIdx]);
          setHeroIndex(randomIdx);
        }
      })
      .catch(() => setArtists([]))
      .finally(() => setLoading(false));
  }, []);

  // Fetch upcoming releases
  useEffect(() => {
    fetch("/api/upcoming-releases")
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setUpcomingReleases(data);
      })
      .catch(() => setUpcomingReleases([]));
  }, []);

  // Auto-rotate hero carousel every 6 seconds
  const rotateToNext = useCallback(() => {
    setHeroFade(false);
    setTimeout(() => {
      setHeroIndex((prev) => {
        const next = (prev + 1) % artists.length;
        setFeaturedArtist(artists[next]);
        return next;
      });
      setHeroFade(true);
    }, 400); // fade out duration before swap
  }, [artists]);

  useEffect(() => {
    if (artists.length <= 1) return;
    const interval = setInterval(rotateToNext, 6000);
    return () => clearInterval(interval);
  }, [artists, rotateToNext]);

  const totalReleases = artists.reduce((sum, a) => sum + a.releases, 0);
  const featured = artists.slice(0, 6);

  return (
    <main className="flex flex-col">
      {/* ── Hero Section — Random Artist Carousel ── */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4">
        {/* Background image (blurred / dimmed) */}
        {featuredArtist?.image && (
          <div
            className={`absolute inset-0 -z-10 transition-opacity duration-500 ${heroFade ? "opacity-100" : "opacity-0"}`}
          >
            <Image
              src={featuredArtist.image}
              alt=""
              fill
              className="object-cover blur-xl scale-110"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-black/70" />
          </div>
        )}

        {/* Fallback gradient if no artist image */}
        {!featuredArtist?.image && (
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        )}

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a]/80 px-4 py-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase backdrop-blur-sm">
            <Headphones className="h-3.5 w-3.5 text-primary" />
            Hip Hop Mexicano desde 1999
          </div>

          <h1 className="mb-2 text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            SONIDO
          </h1>
          <h1 className="mb-6 text-5xl font-black leading-[1.05] tracking-tight text-[#FF6600] sm:text-6xl md:text-7xl lg:text-8xl">
            LÍQUIDO
          </h1>

          <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Lo más avanzado del Hip Hop mexicano. El colectivo más representativo de México, fundado en 1999 en la CDMX.
          </p>

          {/* Featured artist info */}
          {featuredArtist && (
            <div
              className={`mb-8 transition-opacity duration-500 ${heroFade ? "opacity-100" : "opacity-0"}`}
            >
              <p className="text-sm font-bold tracking-wider text-primary uppercase">
                Artista destacado
              </p>
              <p className="mt-1 text-xl font-black sm:text-2xl">
                {featuredArtist.name}
              </p>
              {featuredArtist.genres.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {featuredArtist.genres.slice(0, 3).join(" · ")}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={featuredArtist?.spotifyUrl || "https://open.spotify.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#FF6600] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              <Play className="h-4 w-4" />
              Escuchar en Spotify
            </a>
            <Link
              href="/artistas"
              className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a]/80 px-6 py-3 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-[#FF6600]"
            >
              Explorar Artistas
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Artist Name Marquee ── */}
      {!loading && artists.length > 0 && (
        <section className="overflow-hidden border-y border-[#2a2a2a] bg-[#1a1a1a] py-4">
          <div className="animate-marquee flex whitespace-nowrap">
            {[...artists, ...artists, ...artists, ...artists].map((artist, i) => (
              <span
                key={`${artist.id}-${i}`}
                className="mx-6 inline-block text-sm font-bold tracking-wider text-muted-foreground uppercase transition-colors hover:text-[#FF6600]"
              >
                {artist.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Próximos Lanzamientos (Upcoming Releases) ── */}
      <section className="border-b border-[#2a2a2a] bg-[#121212]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Próximos Lanzamientos</h2>
              <p className="mt-2 text-muted-foreground">
                Lo que viene del crew — no te lo pierdas
              </p>
            </div>
          </div>

          {upcomingReleases.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingReleases.map((release) => (
                <div
                  key={release.id}
                  className="group overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all hover:border-[#FF6600]/30"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#2a2a2a]">
                      {release.coverUrl ? (
                        <Image
                          src={release.coverUrl}
                          alt={release.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : release.artist.image ? (
                        <Image
                          src={release.artist.image}
                          alt={release.artist.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-bold text-muted-foreground">
                          {release.title.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{release.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{release.artist.name}</p>
                      {release.releaseDate && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(release.releaseDate).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/proximos"
                      className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[#FF6600]/40 bg-[#FF6600]/10 px-3 py-1.5 text-xs font-medium text-[#FF6600] transition-colors hover:bg-[#FF6600]/20"
                    >
                      <Bell className="h-3 w-3" />
                      Notificarme
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center">
              <Music2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">Próximamente — nuevas drops del crew</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="border-b border-[#2a2a2a] bg-[#121212]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-10 sm:px-6 lg:grid-cols-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <Users className="h-5 w-5 text-[#FF6600]" />
            <span className="text-3xl font-black sm:text-4xl">
              {loading ? "—" : `${artists.length}+`}
            </span>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Artistas</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <Disc3 className="h-5 w-5 text-[#FF6600]" />
            <span className="text-3xl font-black sm:text-4xl">
              {loading ? "—" : `${totalReleases}+`}
            </span>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Lanzamientos</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <Headphones className="h-5 w-5 text-[#FF6600]" />
            <span className="text-3xl font-black sm:text-4xl">
              {loading ? "—" : `${artists.length}+`}
            </span>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Integrantes</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <Calendar className="h-5 w-5 text-[#FF6600]" />
            <span className="text-3xl font-black sm:text-4xl">27+</span>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Años de Historia</span>
          </div>
        </div>
      </section>

      {/* ── Artists Section ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Artistas</h2>
            <p className="mt-2 text-muted-foreground">
              El roster más representativo del Hip Hop mexicano — {artists.length} artistas
            </p>
          </div>
          <Link
            href="/artistas"
            className="hidden items-center gap-1 text-sm font-medium text-[#FF6600] transition-opacity hover:opacity-80 sm:inline-flex"
          >
            Ver perfiles
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && featured.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/artistas"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#FF6600]"
          >
            Ver todos los artistas
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Now Playing Section ── */}
      {!loading && artists.length > 0 && (
        <section className="border-y border-[#2a2a2a] bg-[#1a1a1a]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
              <span className="inline-block h-2 w-2 rounded-full bg-[#FF6600] animate-pulse-green" />
              En Reproducción
            </div>
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-[#2a2a2a]">
                  {artists[0].image ? (
                    <Image
                      src={artists[0].image}
                      alt={artists[0].name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-muted-foreground">
                      {artists[0].name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-lg font-bold">{artists[0].name}</p>
                  <p className="text-sm text-muted-foreground">Sonido Líquido Crew</p>
                </div>
              </div>
              <a
                href={artists[0].spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#121212] px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-[#FF6600]"
              >
                <Play className="h-4 w-4 text-[#FF6600]" />
                Abrir en Spotify
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── Latest Releases ── */}
      {!loading && artists.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Últimos Lanzamientos</h2>
              <p className="mt-2 text-muted-foreground">Lo más nuevo del crew en todas las plataformas</p>
            </div>
            <Link
              href="/discografia"
              className="hidden items-center gap-1 text-sm font-medium text-[#FF6600] transition-opacity hover:opacity-80 sm:inline-flex"
            >
              Ver todo
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {artists.slice(0, 8).map((artist) => (
              <a
                key={artist.id}
                href={artist.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all hover:border-[#FF6600]/30 hover:bg-[#1a1a1a]"
              >
                <div className="relative aspect-square overflow-hidden bg-[#2a2a2a]">
                  {artist.image ? (
                    <Image
                      src={artist.image}
                      alt={artist.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted-foreground">
                      {artist.name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF6600] text-white">
                      <Play className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold">{artist.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {artist.releases} lanzamientos
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── Spotify Playlist Embed ── */}
      <section className="border-y border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Playlist Oficial</h2>
            <p className="mt-2 text-muted-foreground">
              Escucha lo mejor del colectivo en una sola playlist. Actualizada constantemente.
            </p>
          </div>
          <div className="flex justify-center">
            <iframe
              src="https://open.spotify.com/embed/playlist/5qHTKCZIwi3GM3mhPq45Ab?utm_source=generator&theme=0"
              width="100%"
              height="380"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="max-w-2xl rounded-xl border border-[#2a2a2a]"
              style={{ backgroundColor: "#1a1a1a" }}
            />
          </div>
        </div>
      </section>

      {/* ── Newsletter CTA ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center sm:p-12">
          <Music2 className="mx-auto mb-4 h-8 w-8 text-[#FF6600]" />
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Anótate</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Obtén remixes exclusivos, beats e información actualizada directamente en tu correo.
          </p>
          <div className="mx-auto mt-6 max-w-md">
            <NewsletterForm variant="hero" />
          </div>
        </div>
      </section>
    </main>
  );
}

// ── Artist Card Component ──
function ArtistCard({ artist }: { artist: Artist }) {
  const hasImage = typeof artist.image === "string" && artist.image.length > 0;

  return (
    <Link
      href={`/artistas/${artist.id}`}
      className="group overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all hover:border-[#FF6600]/30"
    >
      <div className="relative aspect-square overflow-hidden bg-[#2a2a2a]">
        {hasImage ? (
          <Image
            src={artist.image}
            alt={artist.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-muted-foreground">
            {artist.name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212]/80 via-transparent to-transparent" />
      </div>

      <div className="flex items-center justify-between p-4">
        <div>
          <h3 className="text-base font-bold">{artist.name}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{artist.releases} lanzamientos</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {artist.spotifyUrl && (
            <div
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(artist.spotifyUrl, "_blank", "noopener,noreferrer"); }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a2a] text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:border-[#FF6600] hover:text-[#FF6600] cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
