"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, AlertCircle, Users, ExternalLink } from "lucide-react";

interface Artist {
  id: string;
  name: string;
  image: string;
  followers: number;
  spotifyUrl: string;
}

function formatFollowers(n: number): string {
  if (typeof n !== "number" || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

function safeString(val: unknown, fallback = ""): string {
  if (typeof val === "string" && val.length > 0) return val;
  return fallback;
}

function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  return fallback;
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
        if (data && typeof data === "object" && "error" in data) {
          throw new Error(String(data.error));
        }
        if (!Array.isArray(data)) {
          throw new Error("Invalid response format");
        }
        const normalized: Artist[] = data.map((item: Record<string, unknown>) => ({
          id: safeString(item.id, crypto.randomUUID?.() ?? String(Math.random())),
          name: safeString(item.name, "Unknown Artist"),
          image: safeString(item.image),
          followers: safeNumber(item.followers),
          spotifyUrl: safeString(item.spotifyUrl),
        }));
        setArtists(normalized);
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
          {artists.map((artist) => {
            const href = artist.spotifyUrl || "#";
            const hasImage = typeof artist.image === "string" && artist.image.length > 0;

            return (
              <a
                key={artist.id}
                href={href}
                target={artist.spotifyUrl ? "_blank" : undefined}
                rel={artist.spotifyUrl ? "noopener noreferrer" : undefined}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  {artist.spotifyUrl && (
                    <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                      <ExternalLink className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 p-4">
                  <h2 className="text-lg font-bold tracking-tight">{artist.name}</h2>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{formatFollowers(artist.followers)} followers</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </main>
  );
}
