"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";
import { type Artist, normalizeArtist } from "@/lib/types";

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

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Header — matches reference site */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">ARTISTAS</h1>
          <p className="mt-2 max-w-xl text-base text-muted-foreground">
            El roster más representativo del Hip Hop mexicano — {artists.length} artistas
          </p>
        </div>
        <Link
          href="#artistas-grid"
          className="inline-flex items-center gap-2 self-start rounded-full border border-primary/30 px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:self-auto"
        >
          Ver perfiles
          <ArrowRight className="h-4 w-4" />
        </Link>
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

      {/* Artist Grid — 5 columns like reference site */}
      {!loading && !error && artists.length > 0 && (
        <div
          id="artistas-grid"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {artists.map((artist) => {
            const hasImage = typeof artist.image === "string" && artist.image.length > 0;

            return (
              <Link
                key={artist.id}
                href={`/artistas/${artist.id}`}
                className="group relative block overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Square image container */}
                <div className="relative aspect-square overflow-hidden bg-[#2a2a2a]">
                  {hasImage ? (
                    <Image
                      src={artist.image}
                      alt={artist.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-muted-foreground/30">
                      {artist.name.charAt(0)}
                    </div>
                  )}

                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-transform duration-300 group-hover:scale-100 scale-75">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Artist name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h2 className="text-sm font-black tracking-wide sm:text-base">{artist.name}</h2>
                    {artist.genres.length > 0 && (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/80 sm:text-xs">
                        {artist.genres.slice(0, 2).join(" · ")}
                      </p>
                    )}
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
