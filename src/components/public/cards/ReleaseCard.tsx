"use client";

import Link from "next/link";
import { Play, ExternalLink } from "lucide-react";
import { getReleaseTypeDisplay } from "@/lib/utils";
import { Img } from "@/components/ui/img";
import type { Release } from "@/types";

interface ReleaseCardProps {
  release: Release;
  showArtist?: boolean;
  artistName?: string;
}

/**
 * ReleaseCard — displays a single release with cover art, title, artist, and date.
 *
 * Uses the Img component (plain <img> with Dropbox proxying) instead of next/image because:
 * 1. Cover images come from Spotify CDN or Dropbox (Img auto-proxies Dropbox URLs)
 * 2. next/image with fill + unoptimized has proven unreliable for client-rendered
 *    sections (LazySection delays render until scroll)
 * 3. The global unoptimized:true config means next/image adds zero value
 * 4. Plain <img> is simpler, more reliable, and renders identically across all browsers
 */
export function ReleaseCard({ release, showArtist = true, artistName }: ReleaseCardProps) {
  return (
    <div className="group">
      {/* Album Cover — isolated container with overflow-hidden */}
      <div className="release-card">
        {release.coverImageUrl ? (
          <Img
            src={release.coverImageUrl}
            alt={release.title}
            fill
            className="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-slc-card flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-16 h-16 text-slc-border">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
        )}

        {/* Hover/Touch Overlay with Actions — visible on hover (desktop) and always on mobile */}
        <div className="release-card-overlay">
          <div className="flex flex-col items-center gap-3">
            {release.spotifyUrl && (
              <a
                href={release.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Escuchar ${release.title} en Spotify`}
                className="w-14 h-14 rounded-full bg-spotify flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <Play className="w-7 h-7 text-white ml-1" fill="white" />
              </a>
            )}
            <Link
              href={`/lanzamientos/${release.slug}`}
              className="text-xs uppercase tracking-wider text-white/80 hover:text-white transition-colors flex items-center gap-1"
            >
              Ver detalles <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Mobile: always-visible play indicator + touch-friendly link */}
        <Link
          href={`/lanzamientos/${release.slug}`}
          className="absolute inset-0 z-10 md:hidden"
          aria-label={`Ver ${release.title}`}
        >
          {/* Small play icon always visible on mobile */}
          {release.spotifyUrl && (
            <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
            </div>
          )}
        </Link>
      </div>

      {/* Info Below Card — in normal document flow, no absolute positioning */}
      <div className="mt-3 text-center">
        <span className="text-xs text-primary uppercase tracking-wider">
          {getReleaseTypeDisplay(release.releaseType)}
        </span>
        <h3 className="font-oswald text-sm sm:text-base uppercase tracking-wide text-white mt-1 truncate px-2">
          {release.title}
        </h3>
        {showArtist && artistName && (
          <p className="text-xs text-slc-muted truncate px-2">
            {artistName}
          </p>
        )}
        <p className="text-xs text-slc-muted mt-1" suppressHydrationWarning>
          {new Date(release.releaseDate).toLocaleDateString("es-MX", {
            year: "numeric",
            month: "short",
            timeZone: "UTC"
          })}
        </p>
      </div>
    </div>
  );
}
