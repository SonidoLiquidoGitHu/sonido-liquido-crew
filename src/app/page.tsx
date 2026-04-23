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
        // Pick a random artist on each page load
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

  // Auto-rotate hero carousel every 8 seconds — shows a different artist each time
  const rotateToNext = useCallback(() => {
    if (artists.length <= 1) return;
    setHeroFade(false);
    setTimeout(() => {
      setHeroIndex((prev) => {
        // Pick next artist (sequential rotation through roster)
        const next = (prev + 1) % artists.length;
        setFeaturedArtist(artists[next]);
        return next;
      });
      setHeroFade(true);
    }, 500); // fade out duration before swap
  }, [artists]);

  useEffect(() => {
    if (artists.length <= 1) return;
    const interval = setInterval(rotateToNext, 8000);
    return () => clearInterval(interval);
  }, [artists, rotateToNext]);

  const totalReleases = artists.reduce((sum, a) => sum + a.releases, 0);
  const featured = artists.slice(0, 6);

  return (
    <main className="flex flex-col">
      {/* ═══════════════════════════════════════════════════════
          HERO — Random Artist Carousel
          Shows one random artist from the roster each page load,
          then auto-rotates through all artists every 8 seconds.
      ═══════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-4">
        {/* Background image (blurred / dimmed) */}
        {featuredArtist?.image && (
          <div
            className={`absolute inset-0 -z-10 transition-opacity duration-700 ${heroFade ? "opacity-100" : "opacity-0"}`}
          >
            <Image
              src={featuredArtist.image}
              alt=""
              fill
              className="object-cover blur-2xl scale-110"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-black/75" />
          </div>
        )}

        {/* Fallback gradient if no artist image */}
        {!featuredArtist?.image && (
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        )}

        <div className="mx-auto max-w-5xl text-center">
          {/* Artist image + info */}
          {featuredArtist && (
            <div
              className={`transition-all duration-700 ${heroFade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              {/* Artist photo */}
              <div className="mx-auto mb-6 relative h-40 w-40 sm:h-48 sm:w-48 overflow-hidden rounded-full border-4 border-primary/30 shadow-2xl shadow-primary/20">
                {featuredArtist.image ? (
                  <Image
                    src={featuredArtist.image}
                    alt={featuredArtist.name}
                    fill
                    className="object-cover"
                    sizes="192px"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-card text-4xl font-black text-muted-foreground">
                    {featuredArtist.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Badge */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/80 px-4 py-1.5 text-xs font-medium tracking-wider text-primary uppercase backdrop-blur-sm">
                <Headphones className="h-3.5 w-3.5" />
                Artista del Crew
              </div>

              {/* Artist name */}
              <h1 className="mb-2 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-[family-name:var(--font-oswald)]">
                {featuredArtist.name}
              </h1>

              {/* Genres */}
              {featuredArtist.genres.length > 0 && (
                <p className="mb-6 text-sm text-muted-foreground sm:text-base">
                  {featuredArtist.genres.slice(0, 4).join(" · ")}
                </p>
              )}

              {/* CTA buttons */}
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href={featuredArtist.spotifyUrl || "https://open.spotify.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Play className="h-4 w-4" />
                  Escuchar en Spotify
                </a>
                <Link
                  href={`/artistas/${featuredArtist.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-6 py-3 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-primary"
                >
                  Ver Perfil
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Carousel indicators */}
              {artists.length > 1 && (
                <div className="mt-8 flex items-center justify-center gap-1">
                  {artists.slice(0, Math.min(artists.length, 10)).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setHeroFade(false);
                        setTimeout(() => {
                          setHeroIndex(i);
                          setFeaturedArtist(artists[i]);
                          setHeroFade(true);
                        }, 300);
                      }}
                      className="relative flex items-center justify-center p-2.5"
                      aria-label={`Ver ${artists[i]?.name}`}
                    >
                      <span
                        className={`block h-1.5 rounded-full transition-all duration-300 ${
                          i === heroIndex
                            ? "w-6 bg-primary"
                            : "w-1.5 bg-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-4 py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Cargando crew...</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Artist Name Marquee ── */}
      {!loading && artists.length > 0 && (
        <section className="overflow-hidden border-y border-border bg-card py-4">
          <div className="animate-marquee flex whitespace-nowrap">
            {[...artists, ...artists, ...artists, ...artists].map((artist, i) => (
              <span
                key={`${artist.id}-${i}`}
                className="mx-6 inline-block text-sm font-bold tracking-wider text-muted-foreground uppercase transition-colors hover:text-primary font-[family-name:var(--font-oswald)]"
              >
                {artist.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          PRÓXIMOS LANZAMIENTOS — TOPMOST section after hero
      ═══════════════════════════════════════════════════════ */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-3 text-center">
            <h2 className="section-title text-3xl font-black tracking-tight sm:text-4xl font-[family-name:var(--font-oswald)]">
              Próximos Lanzamientos
            </h2>
            <div className="section-divider" />
          </div>
          <p className="section-subtitle mb-10">
            Lo que viene del crew — no te lo pierdas
          </p>

          {upcomingReleases.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingReleases.map((release) => (
                <div
                  key={release.id}
                  className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
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
                      className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 min-h-[44px]"
                    >
                      <Bell className="h-3 w-3" />
                      Notificarme
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Music2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">Próximamente — nuevas drops del crew</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-10 sm:px-6 lg:grid-cols-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-3xl font-black sm:text-4xl">
              {loading ? "—" : `${artists.length}+`}
            </span>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Artistas</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <Disc3 className="h-5 w-5 text-primary" />
            <span className="text-3xl font-black sm:text-4xl">
              {loading ? "—" : `${totalReleases}+`}
            </span>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Lanzamientos</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <Headphones className="h-5 w-5 text-primary" />
            <span className="text-3xl font-black sm:text-4xl">
              {loading ? "—" : `${artists.length}+`}
            </span>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Integrantes</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="text-3xl font-black sm:text-4xl">27+</span>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Años de Historia</span>
          </div>
        </div>
      </section>

      {/* ── Artists Section ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-3 text-center">
          <h2 className="section-title text-3xl font-black tracking-tight sm:text-4xl font-[family-name:var(--font-oswald)]">
            Artistas
          </h2>
          <div className="section-divider" />
        </div>
        <p className="section-subtitle mb-10">
          El roster más representativo del Hip Hop mexicano — {artists.length} artistas
        </p>

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
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            Ver todos los artistas
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Now Playing Section ── */}
      {!loading && artists.length > 0 && (
        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
              <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse-green" />
              En Reproducción
            </div>
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-secondary">
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
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary"
              >
                <Play className="h-4 w-4 text-primary" />
                Abrir en Spotify
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── Latest Releases ── */}
      {!loading && artists.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-3 text-center">
            <h2 className="section-title text-3xl font-black tracking-tight sm:text-4xl font-[family-name:var(--font-oswald)]">
              Últimos Lanzamientos
            </h2>
            <div className="section-divider" />
          </div>
          <p className="section-subtitle mb-10">
            Lo más nuevo del crew en todas las plataformas
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {artists.slice(0, 8).map((artist) => (
              <a
                key={artist.id}
                href={artist.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30"
              >
                <div className="relative aspect-square overflow-hidden bg-secondary">
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
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

          <div className="mt-8 text-center">
            <Link
              href="/discografia"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-80"
            >
              Ver toda la discografía
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Spotify Playlist Embed ── */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-3 text-center">
            <h2 className="section-title text-3xl font-black tracking-tight sm:text-4xl font-[family-name:var(--font-oswald)]">
              Playlist Oficial
            </h2>
            <div className="section-divider" />
          </div>
          <p className="section-subtitle mb-10">
            Escucha lo mejor del colectivo en una sola playlist. Actualizada constantemente.
          </p>
          <div className="flex justify-center">
            <iframe
              src="https://open.spotify.com/embed/playlist/5qHTKCZIwi3GM3mhPq45Ab?utm_source=generator&theme=0"
              width="100%"
              height="380"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="max-w-2xl rounded-xl border border-border"
              style={{ backgroundColor: "#121212" }}
            />
          </div>
        </div>
      </section>

      {/* ── Newsletter CTA ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
          <Music2 className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="section-title text-2xl font-black tracking-tight sm:text-3xl font-[family-name:var(--font-oswald)]">
            Anótate
          </h2>
          <div className="section-divider" />
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
      className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
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
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>

      <div className="flex items-center justify-between p-4">
        <div>
          <h3 className="text-base font-bold font-[family-name:var(--font-oswald)]">{artist.name}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{artist.releases} lanzamientos</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {artist.spotifyUrl && (
            <div
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(artist.spotifyUrl, "_blank", "noopener,noreferrer"); }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground opacity-70 sm:opacity-0 transition-all sm:group-hover:opacity-100 hover:border-primary hover:text-primary cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
