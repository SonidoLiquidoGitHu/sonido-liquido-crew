"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Bell, Rocket, Music, Calendar, Clock, ChevronRight, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UpcomingRelease } from "@/db/schema/upcoming";

interface UpcomingReleasesHeroProps {
  releases: UpcomingRelease[];
  isLoading?: boolean;
}

function formatReleaseDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

function getDaysUntil(date: Date | string) {
  const now = new Date();
  const release = new Date(date);
  const diff = release.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getTimeRemaining(releaseDate: Date | string): TimeRemaining {
  const now = new Date();
  const release = new Date(releaseDate);
  const total = release.getTime() - now.getTime();

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, total };
}

function formatTimeShort(time: TimeRemaining): string {
  if (time.total <= 0) return "¡Ya disponible!";
  if (time.days > 30) {
    const months = Math.floor(time.days / 30);
    return `${months}m`;
  }
  if (time.days > 0) return `${time.days}d ${time.hours}h`;
  if (time.hours > 0) return `${time.hours}h ${time.minutes}m`;
  return `${time.minutes}m ${time.seconds}s`;
}

// =============================================
// SKELETON LOADING STATE
// =============================================
export function UpcomingReleasesHeroSkeleton() {
  return (
    <section className="relative w-full bg-gradient-to-b from-slc-dark via-slc-black to-slc-black py-12 md:py-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-2xl" />
      </div>

      <div className="section-container relative z-10">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slc-card animate-pulse" />
            <div className="h-7 w-48 bg-slc-card rounded animate-pulse" />
          </div>
          <div className="h-5 w-20 bg-slc-card rounded animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-slc-card border border-slc-border rounded-xl overflow-hidden">
              <div className="aspect-square bg-slc-dark animate-pulse relative">
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              </div>
              <div className="p-3 space-y-2">
                <div className="h-4 bg-slc-dark rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-slc-dark rounded w-1/2 animate-pulse" />
                <div className="h-3 bg-slc-dark rounded w-1/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================
export function UpcomingReleasesHero({ releases, isLoading }: UpcomingReleasesHeroProps) {
  if (isLoading) {
    return <UpcomingReleasesHeroSkeleton />;
  }

  if (!releases || releases.length === 0) {
    return null;
  }

  // Take up to 4 releases
  const displayReleases = releases.slice(0, 4);

  return (
    <section className="relative w-full bg-gradient-to-b from-slc-dark via-slc-black to-slc-black py-12 md:py-16">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-2xl" />
      </div>

      <div className="section-container relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-oswald text-xl md:text-2xl uppercase tracking-wide text-white">
                Próximos Lanzamientos
              </h2>
            </div>
          </div>
          <Link
            href="/proximos"
            className="flex items-center gap-1.5 text-sm text-slc-muted hover:text-primary transition-colors"
          >
            Ver todos
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4 Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayReleases.map((release, index) => (
            <CompactReleaseCard key={release.id} release={release} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================
// RELEASE CARD WITH REAL-TIME COUNTDOWN
// =============================================
function CompactReleaseCard({
  release,
  index,
}: {
  release: UpcomingRelease;
  index: number;
}) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    getTimeRemaining(release.releaseDate)
  );
  const [isHovered, setIsHovered] = useState(false);

  // Real-time countdown update
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(release.releaseDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [release.releaseDate]);

  const bgColor = release.backgroundColor || "#1a1a1a";
  const hasPresave = Boolean(release.rpmPresaveUrl || release.spotifyPresaveUrl || release.appleMusicPresaveUrl);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        "bg-slc-card border border-slc-border rounded-xl overflow-hidden transition-all duration-300",
        "hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10",
        isHovered && "transform scale-[1.02]"
      )}>
        {/* Cover Image */}
        <div className="aspect-square relative overflow-hidden">
          {release.coverImageUrl ? (
            <SafeImage
              src={release.coverImageUrl}
              alt={release.title}
              fill
              className={cn(
                "object-cover transition-all duration-500",
                isHovered ? "scale-110 brightness-50" : "scale-100"
              )}
              unoptimized
              priority={index < 2}
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center transition-all duration-300",
                isHovered && "brightness-50"
              )}
              style={{ backgroundColor: bgColor }}
            >
              <Rocket className="w-10 h-10 text-white/30" />
            </div>
          )}

          {/* Featured badge */}
          {release.isFeatured && (
            <div className={cn(
              "absolute top-2 left-2 px-2 py-0.5 bg-yellow-500/90 rounded-full flex items-center gap-1 transition-opacity duration-300",
              isHovered && "opacity-0"
            )}>
              <Star className="w-3 h-3 text-black fill-black" />
              <span className="text-[10px] font-bold text-black uppercase">Destacado</span>
            </div>
          )}

          {/* Countdown Badge - Real-time */}
          {timeRemaining.total > 0 && (
            <div className={cn(
              "absolute top-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded-full flex items-center gap-1 text-xs transition-all duration-300",
              isHovered && "opacity-0 translate-y-[-10px]"
            )}>
              <Clock className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-white font-medium font-mono">
                {formatTimeShort(timeRemaining)}
              </span>
            </div>
          )}

          {/* Type badge */}
          <div className={cn(
            "absolute bottom-2 left-2 transition-all duration-300",
            isHovered && "opacity-0 translate-y-[10px]"
          )}>
            <span className="px-2 py-0.5 bg-primary/90 text-white text-[10px] font-bold uppercase tracking-wider rounded">
              {release.releaseType === "single" ? "Single" :
               release.releaseType === "ep" ? "EP" :
               release.releaseType === "album" ? "Álbum" : "Mixtape"}
            </span>
          </div>

          {/* Pre-save indicator - hides on hover */}
          {hasPresave && (
            <div className={cn(
              "absolute bottom-2 right-2 transition-all duration-300",
              isHovered && "opacity-0 translate-y-[10px]"
            )}>
              <div className="w-6 h-6 rounded-full bg-primary/90 flex items-center justify-center">
                <Bell className="w-3 h-3 text-white" />
              </div>
            </div>
          )}

          {/* =============================================
              HOVER OVERLAY - PRESAVE BUTTON
              ============================================= */}
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-3 transition-all duration-300",
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            {/* Live countdown on hover */}
            {timeRemaining.total > 0 && (
              <div className="text-center mb-2">
                <div className="flex items-center gap-1 text-white/80 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  <span>Disponible en</span>
                </div>
                <div className="flex gap-1.5 text-center">
                  {timeRemaining.days > 0 && (
                    <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                      <div className="font-oswald text-lg text-white leading-none">{timeRemaining.days}</div>
                      <div className="text-[8px] text-white/60 uppercase">días</div>
                    </div>
                  )}
                  <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                    <div className="font-oswald text-lg text-white leading-none">{String(timeRemaining.hours).padStart(2, '0')}</div>
                    <div className="text-[8px] text-white/60 uppercase">hrs</div>
                  </div>
                  <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                    <div className="font-oswald text-lg text-white leading-none">{String(timeRemaining.minutes).padStart(2, '0')}</div>
                    <div className="text-[8px] text-white/60 uppercase">min</div>
                  </div>
                  <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                    <div className="font-oswald text-lg text-primary leading-none">{String(timeRemaining.seconds).padStart(2, '0')}</div>
                    <div className="text-[8px] text-white/60 uppercase">seg</div>
                  </div>
                </div>
              </div>
            )}

            {/* Presave Button */}
            {hasPresave ? (
              <Link
                href={release.rpmPresaveUrl || release.spotifyPresaveUrl || release.appleMusicPresaveUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="transform hover:scale-105 transition-transform"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wide shadow-lg shadow-primary/30 gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Pre-save ahora
                </Button>
              </Link>
            ) : (
              <Link
                href={`/proximos/${release.slug}`}
                className="transform hover:scale-105 transition-transform"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/50 text-white hover:bg-white/10 font-bold uppercase tracking-wide gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver detalles
                </Button>
              </Link>
            )}

            {/* Multiple platform links on hover */}
            {hasPresave && (
              <div className="flex gap-2 mt-1">
                {release.spotifyPresaveUrl && (
                  <Link
                    href={release.spotifyPresaveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/40 flex items-center justify-center transition-colors"
                    title="Spotify"
                  >
                    <svg className="w-4 h-4 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </Link>
                )}
                {release.appleMusicPresaveUrl && (
                  <Link
                    href={release.appleMusicPresaveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-[#FC3C44]/20 hover:bg-[#FC3C44]/40 flex items-center justify-center transition-colors"
                    title="Apple Music"
                  >
                    <svg className="w-4 h-4 text-[#FC3C44]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.802.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.8-.335-2.22-1.078-.263-.467-.323-.974-.238-1.498.12-.753.507-1.332 1.172-1.72.322-.188.673-.306 1.032-.396.51-.127 1.026-.234 1.538-.36.29-.07.564-.164.79-.347.263-.212.39-.5.396-.84.005-.268.002-.535.002-.804V7.593c0-.238-.047-.328-.28-.29-.623.1-1.244.203-1.866.306-.997.163-1.994.325-2.99.49-.14.024-.232.1-.26.24-.013.064-.02.13-.02.196v7.645c0 .347-.03.69-.14 1.025-.193.586-.55 1.043-1.092 1.362-.424.25-.89.372-1.378.41-.53.04-1.05-.005-1.544-.217-.773-.33-1.22-.912-1.34-1.74-.093-.64.02-1.25.386-1.8.365-.55.883-.87 1.503-1.032.393-.1.793-.166 1.19-.24.377-.07.755-.136 1.127-.222.252-.06.49-.16.686-.332.22-.194.328-.44.335-.727.002-.054.002-.11.002-.163V5.606c0-.12.013-.24.043-.357.062-.236.195-.402.436-.46.138-.035.28-.057.42-.08.93-.152 1.86-.306 2.79-.457l2.067-.34c.618-.1 1.235-.203 1.853-.302.2-.033.4-.06.603-.07.14-.007.27.038.368.15.085.097.12.216.12.34v5.084z"/>
                    </svg>
                  </Link>
                )}
                {release.deezerPresaveUrl && (
                  <Link
                    href={release.deezerPresaveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-[#00C7F2]/20 hover:bg-[#00C7F2]/40 flex items-center justify-center transition-colors"
                    title="Deezer"
                  >
                    <span className="text-[#00C7F2] font-bold text-xs">D</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-oswald text-sm uppercase mb-0.5 group-hover:text-primary transition-colors line-clamp-1">
            {release.title}
          </h3>

          <p className="text-xs text-slc-muted mb-2 line-clamp-1">
            {release.artistName}
            {release.featuredArtists && (
              <span className="text-slc-muted/70"> ft. {release.featuredArtists}</span>
            )}
          </p>

          <div className="flex items-center gap-1.5 text-[10px] text-slc-muted">
            <Calendar className="w-3 h-3" />
            <span>{formatReleaseDate(release.releaseDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// HORIZONTAL SCROLLABLE VERSION (COMPATIBILITY)
// =============================================
export function UpcomingReleasesStrip({ releases }: UpcomingReleasesHeroProps) {
  if (!releases || releases.length === 0) {
    return null;
  }

  return (
    <section className="bg-slc-dark py-4 border-b border-slc-border/30">
      <div className="section-container">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Rocket className="w-4 h-4 text-primary" />
          <span className="font-oswald text-sm uppercase tracking-wide text-white">
            Próximos
          </span>
        </div>

        {/* Horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {releases.slice(0, 4).map((release) => (
            <MiniReleaseCard key={release.id} release={release} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniReleaseCard({ release }: { release: UpcomingRelease }) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    getTimeRemaining(release.releaseDate)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(release.releaseDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [release.releaseDate]);

  return (
    <Link
      href={release.rpmPresaveUrl || `/proximos/${release.slug}`}
      target={release.rpmPresaveUrl ? "_blank" : undefined}
      className="flex-shrink-0 w-36 group"
    >
      <div className="relative aspect-square rounded-lg overflow-hidden border border-slc-border/50 group-hover:border-primary/50 transition-all mb-2">
        {release.coverImageUrl ? (
          <SafeImage
            src={release.coverImageUrl}
            alt={release.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-slc-dark flex items-center justify-center">
            <Music className="w-8 h-8 text-slc-muted" />
          </div>
        )}
        {/* Countdown badge - real time */}
        {timeRemaining.total > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white font-medium font-mono">
            {formatTimeShort(timeRemaining)}
          </div>
        )}
      </div>
      <p className="text-[10px] text-slc-muted truncate">{release.artistName}</p>
      <h3 className="font-oswald text-xs uppercase text-white truncate group-hover:text-primary transition-colors">
        {release.title}
      </h3>
    </Link>
  );
}
