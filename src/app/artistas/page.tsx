"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Users, ExternalLink, Disc3 } from "lucide-react";
import { type Artist, formatFollowers, normalizeArtist } from "@/lib/types";

export default function ArtistasPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/artists")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === "object" && "error" in data) {
          throw new Error(String(data.error));
        }
        if (!Array.isArray(data)) throw new Error("Invalid response format");
        setArtists(data.map((item: Record<string, unknown>) => normalizeArtist(item)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalFollowers = artists.reduce((sum, a) => sum + a.followers, 0);
  const totalReleases = artists.reduce((sum, a) => sum + a.releases, 0);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Artistas</h1>
        <p className="mt-3 max-w-xl text-lg text-muted-foreground">
          El roster más representativo del Hip Hop mexicano — {artists.length} artistas
        </p>

        {/* Collective stats bar */}
        {!loading && artists.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              <span><span className="font-bold text-foreground">{formatFollowers(totalFollowers)}</span> seguidores totales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Disc3 className="h-4 w-4 text-primary" />
              <span><span className="font-bold text-foreground">{totalReleases}</span> lanzamientos totales</span>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Cargando artistas&hellip;</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-16 text-center">
          <p className="text-sm font-medium text-destructive">Error al cargar artistas</p>
          <p className="max-w-md text-xs text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1a1a1a] hover:text-foreground"
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && artists.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">No se encontraron artistas.</p>
      )}

      {/* Artist Grid */}
      {!loading && !error && artists.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {artists.map((artist) => {
            const hasImage = typeof artist.image === "string" && artist.image.length > 0;

            return (
              <Link
                key={artist.id}
                href={`/artistas/${artist.id}`}
                className="group overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all hover:border-primary/30"
              >
                <div className="relative aspect-square overflow-hidden bg-[#2a2a2a]">
                  {hasImage ? (
                    <Image
                      src={artist.image}
                      alt={artist.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-muted-foreground">
                      {artist.name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/90 via-[#0a0a0a]/20 to-transparent" />

                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <ExternalLink className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Name overlay at bottom of image */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h2 className="text-lg font-black">{artist.name}</h2>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{formatFollowers(artist.followers)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Disc3 className="h-3 w-3" />
                      <span>{artist.releases} releases</span>
                    </div>
                  </div>

                  {/* Popularity bar */}
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-[#2a2a2a]">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${artist.popularity}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{artist.popularity}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
