"use client";

import { useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Play, ExternalLink, Disc3 } from "lucide-react";
import { cn, formatDate, getReleaseTypeDisplay } from "@/lib/utils";
import type { Release } from "@/types";

interface ReleaseCardProps {
  release: Release;
  showArtist?: boolean;
  artistName?: string;
}

export function ReleaseCard({ release, showArtist = true, artistName }: ReleaseCardProps) {
  const [imageError, setImageError] = useState(false);
  const hasValidImage = release.coverImageUrl && !imageError;

  return (
    <div className="release-card group">
      {/* Album Cover */}
      <div className="absolute inset-0">
        {hasValidImage ? (
          <SafeImage
            src={release.coverImageUrl!}
            alt={release.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            onError={() => setImageError(true)}
            unoptimized={
              release.coverImageUrl?.includes("dropbox") ||
              release.coverImageUrl?.includes("dl.dropboxusercontent")
            }
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slc-card to-slc-dark flex items-center justify-center">
            <Disc3 className="w-16 h-16 text-slc-border animate-pulse" />
          </div>
        )}
      </div>

      {/* Hover Overlay with Actions */}
      <div className="release-card-overlay">
        <div className="flex flex-col items-center gap-3">
          {release.spotifyUrl && (
            <a
              href={release.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
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

      {/* Info Below Card */}
      <div className="absolute -bottom-16 left-0 right-0 text-center">
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
