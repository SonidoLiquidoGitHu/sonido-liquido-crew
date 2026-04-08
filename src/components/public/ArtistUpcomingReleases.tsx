"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  Bell,
  Calendar,
  Play,
  Music,
  ExternalLink,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UpcomingRelease } from "@/db/schema/upcoming";

interface ArtistUpcomingReleasesProps {
  artistName: string;
  artistSlug: string;
  initialReleases?: UpcomingRelease[];
  className?: string;
}

// Platform icons for presave buttons
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  spotify: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  ),
  apple: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  deezer: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM0 12.626v3.03h5.19v-3.03H0zm6.27 0v3.03h5.189v-3.03h-5.19zm6.27 0v3.03h5.19v-3.03h-5.19zm6.27 0v3.03H24v-3.03h-5.19zM0 16.88v3.027h5.19V16.88H0zm6.27 0v3.027h5.189V16.88h-5.19zm6.27 0v3.027h5.19V16.88h-5.19zm6.27 0v3.027H24V16.88h-5.19z" />
    </svg>
  ),
};

// Countdown helpers
function getDaysUntil(date: Date | string) {
  const now = new Date();
  const release = new Date(date);
  const diff = release.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatReleaseDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ArtistUpcomingReleases({
  artistName,
  artistSlug,
  initialReleases,
  className = "",
}: ArtistUpcomingReleasesProps) {
  const [releases, setReleases] = useState<UpcomingRelease[]>(initialReleases || []);
  const [loading, setLoading] = useState(!initialReleases);
  const [presaving, setPresaving] = useState<string | null>(null);

  // Fetch releases if not provided
  useEffect(() => {
    if (!initialReleases) {
      fetchReleases();
    }
  }, [artistName, initialReleases]);

  async function fetchReleases() {
    try {
      const res = await fetch(`/api/upcoming-releases?artistName=${encodeURIComponent(artistName)}`);
      const data = await res.json();
      if (data.success) {
        setReleases(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching upcoming releases:", error);
    } finally {
      setLoading(false);
    }
  }

  // Track presave click
  async function handlePresaveClick(releaseId: string, url: string) {
    setPresaving(releaseId);
    try {
      // Track the click
      await fetch("/api/upcoming-releases/presave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId }),
      });
    } catch (error) {
      console.error("Error tracking presave:", error);
    } finally {
      setPresaving(null);
      // Open presave link
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  if (loading) {
    return (
      <div className={`py-8 flex justify-center ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (releases.length === 0) {
    return null; // Don't show section if no upcoming releases
  }

  return (
    <section className={`mb-16 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-oswald text-2xl uppercase flex items-center gap-3">
          <Rocket className="w-6 h-6 text-primary" />
          Próximos Lanzamientos
        </h2>
        {releases.length > 2 && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/proximos">
              Ver todos
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        )}
      </div>

      {/* Releases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {releases.slice(0, 2).map((release) => (
          <UpcomingReleaseCard
            key={release.id}
            release={release}
            presaving={presaving === release.id}
            onPresave={(url) => handlePresaveClick(release.id, url)}
          />
        ))}
      </div>
    </section>
  );
}

// Individual release card
function UpcomingReleaseCard({
  release,
  presaving,
  onPresave,
}: {
  release: UpcomingRelease;
  presaving: boolean;
  onPresave: (url: string) => void;
}) {
  const daysUntil = getDaysUntil(release.releaseDate);
  const hasPresaveLinks = release.rpmPresaveUrl || release.spotifyPresaveUrl || release.appleMusicPresaveUrl;

  // Get available presave links
  const presaveLinks = [
    { platform: "rpm", url: release.rpmPresaveUrl, label: "Pre-save", primary: true },
    { platform: "spotify", url: release.spotifyPresaveUrl, label: "Spotify" },
    { platform: "apple", url: release.appleMusicPresaveUrl, label: "Apple Music" },
    { platform: "deezer", url: release.deezerPresaveUrl, label: "Deezer" },
    { platform: "youtube", url: release.youtubeMusicPresaveUrl, label: "YouTube" },
  ].filter((link) => link.url);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slc-border bg-slc-card transition-all hover:border-primary/30"
      style={{
        background: release.backgroundColor
          ? `linear-gradient(135deg, ${release.backgroundColor}22, transparent)`
          : undefined,
      }}
    >
      {/* Background blur with cover */}
      {release.coverImageUrl && (
        <div className="absolute inset-0 overflow-hidden">
          <SafeImage
            src={release.coverImageUrl}
            alt=""
            fill
            className="object-cover blur-3xl opacity-20 scale-110"
            unoptimized
          />
        </div>
      )}

      <div className="relative z-10 p-6">
        <div className="flex gap-5">
          {/* Cover Image */}
          <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-xl overflow-hidden bg-slc-dark flex-shrink-0 shadow-lg group-hover:shadow-primary/20 transition-shadow">
            {release.coverImageUrl ? (
              <SafeImage
                src={release.coverImageUrl}
                alt={release.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-10 h-10 text-slc-muted" />
              </div>
            )}

            {/* Countdown Badge */}
            {release.showCountdown && daysUntil > 0 && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded-lg text-center">
                <p className="font-oswald text-lg text-white leading-none">{daysUntil}</p>
                <p className="text-[10px] text-white/60 uppercase">días</p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Type Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs uppercase tracking-wider rounded-full">
                {release.releaseType === "single" ? "Single" :
                 release.releaseType === "ep" ? "EP" :
                 release.releaseType === "album" ? "Álbum" : "Mixtape"}
              </span>
              {release.isFeatured && (
                <span className="flex items-center gap-1 text-xs text-yellow-500">
                  <Sparkles className="w-3 h-3" />
                  Destacado
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-oswald text-xl md:text-2xl uppercase text-white mb-1 truncate group-hover:text-primary transition-colors">
              {release.title}
            </h3>

            {/* Artist */}
            <p className="text-sm text-slc-muted mb-2">
              {release.artistName}
              {release.featuredArtists && (
                <span className="text-slc-muted/60"> ft. {release.featuredArtists}</span>
              )}
            </p>

            {/* Release Date */}
            <p className="text-xs text-slc-muted flex items-center gap-1.5 mb-4">
              <Calendar className="w-3.5 h-3.5" />
              {formatReleaseDate(release.releaseDate)}
            </p>

            {/* Presave Buttons */}
            {hasPresaveLinks && (
              <div className="flex flex-wrap gap-2">
                {/* Primary presave button (RPM or first available) */}
                {presaveLinks[0] && (
                  <Button
                    onClick={() => onPresave(presaveLinks[0].url!)}
                    disabled={presaving}
                    size="sm"
                    className="bg-primary hover:bg-primary/80"
                  >
                    {presaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Bell className="w-4 h-4 mr-1.5" />
                        Pre-save
                      </>
                    )}
                  </Button>
                )}

                {/* Secondary platform buttons */}
                {presaveLinks.slice(1, 4).map((link) => (
                  <Button
                    key={link.platform}
                    variant="outline"
                    size="sm"
                    className="border-slc-border hover:border-white/30"
                    onClick={() => window.open(link.url!, "_blank", "noopener,noreferrer")}
                    title={`Pre-save en ${link.label}`}
                  >
                    {PLATFORM_ICONS[link.platform] || <ExternalLink className="w-4 h-4" />}
                  </Button>
                ))}
              </div>
            )}

            {/* No presave - Coming Soon */}
            {!hasPresaveLinks && (
              <p className="text-sm text-slc-muted italic">
                Pre-save próximamente...
              </p>
            )}
          </div>
        </div>

        {/* Preview Video Link */}
        {release.teaserVideoUrl && (
          <a
            href={release.teaserVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-2 text-sm text-slc-muted hover:text-white transition-colors"
          >
            <Play className="w-4 h-4" />
            Ver teaser
          </a>
        )}
      </div>
    </div>
  );
}

export default ArtistUpcomingReleases;
