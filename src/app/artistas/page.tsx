"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Loader2, AlertCircle } from "lucide-react";

interface Artist {
  id: string;
  name: string;
  image: string;
  genres?: string[];
  followers?: number;
  spotifyUrl?: string;
  slug?: string;
}

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
        if (data.error) throw new Error(data.error);
        setArtists(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Artistas</h1>
        <p className="mt-3 max-w-xl text-lg text-muted-foreground">
          The creative forces behind the collective. Each artist brings a unique
          voice, a distinct vision, and an unwavering commitment to pushing
          sonic boundaries.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading artists&hellip;</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">Failed to load artists</p>
          <p className="max-w-md text-xs text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg border border-border/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && artists.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">No artists found.</p>
      )}

      {!loading && !error && artists.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              href={artist.slug ? `/artistas/${artist.slug}` : artist.spotifyUrl ?? "#"}
              target={artist.slug ? undefined : "_blank"}
              rel={artist.slug ? undefined : "noopener noreferrer"}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="relative aspect-square overflow-hidden">
                {artist.image ? (
                  <Image
                    src={artist.image}
                    alt={artist.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-4xl font-bold text-muted-foreground">
                    {artist.name.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-xl font-bold tracking-tight">{artist.name}</h2>
                  {artist.genres && artist.genres.length > 0 && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {artist.genres.slice(0, 3).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
