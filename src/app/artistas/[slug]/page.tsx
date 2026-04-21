"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, Users, ExternalLink } from "lucide-react";
import { reporter, parseApiError } from "@/lib/error-reporter";
import { type Artist, formatFollowers, safeString, safeNumber } from "@/lib/types";

export default function ArtistDetailPage() {
  const params = useParams<{ slug: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/artists")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        return res.json();
      })
      .then((data) => {
        const apiError = parseApiError(data, "");
        if (apiError) throw new Error(apiError);

        if (!Array.isArray(data)) {
          throw new Error("Invalid response format");
        }

        // Normalize every item to a safe Artist object
        const list: Artist[] = data.map((item: Record<string, unknown>) => ({
          id: safeString(item.id, ""),
          name: safeString(item.name, "Unknown Artist"),
          image: safeString(item.image),
          followers: safeNumber(item.followers),
          spotifyUrl: safeString(item.spotifyUrl),
        }));

        // Match by Spotify id (the slug param IS the Spotify artist id)
        const found = list.find((a) => a.id === params.slug) ?? null;

        if (!found) {
          reporter.warn({
            source: "page:/artistas/[slug]",
            action: "find-artist",
            error: new Error("Artist not found for slug"),
            meta: { slug: params.slug },
          });
        } else {
          reporter.info({
            source: "page:/artistas/[slug]",
            action: "find-artist",
            error: `Loaded artist: ${found.name}`,
            meta: { slug: params.slug, artistId: found.id },
          });
        }

        setArtist(found);
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
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading artist&hellip;</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">Failed to load artist</p>
          <p className="max-w-md text-xs text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg border border-border/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">Artist not found</p>
          <Link
            href="/artistas"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Artists
          </Link>
        </div>
      </main>
    );
  }

  const hasImage = typeof artist.image === "string" && artist.image.length > 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/artistas"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Artists
      </Link>

      <div className="grid gap-10 lg:grid-cols-[400px_1fr] lg:gap-16">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
          {hasImage ? (
            <Image
              src={artist.image}
              alt={artist.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 400px"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-7xl font-bold text-muted-foreground">
              {artist.name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
        </div>

        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {artist.name}
          </h1>
          <div className="mt-6 h-px w-16 bg-primary" />

          <div className="mt-6 flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{formatFollowers(artist.followers)} followers</span>
          </div>

          {artist.spotifyUrl && (
            <div className="mt-8">
              <a
                href={artist.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/50 hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Spotify
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
