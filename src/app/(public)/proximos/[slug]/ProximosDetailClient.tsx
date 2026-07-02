"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, ExternalLink, Rocket, Share2 } from "lucide-react";
import { CountdownTimer } from "@/components/public/CountdownTimer";
import { PresaveButtons } from "@/components/public/PresaveButtons";
import { DownloadGate } from "@/components/public/DownloadGate";
import { ShareButtons } from "@/components/ui/share-button";
import { UpcomingReleaseStoryCard, type UpcomingReleaseShareData } from "./UpcomingReleaseStoryCard";

const releaseTypeLabels: Record<string, string> = {
  "maxi-single": "Maxi-Single",
  compilation: "Compilación",
  album: "Álbum",
  ep: "EP",
  single: "Single",
  mixtape: "Mixtape",
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractYouTubeId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return url;
}

// Full release shape — matches what the server component passes in.
// We import the type from the schema to stay in sync with the DB.
import type { UpcomingRelease } from "@/db/schema/upcoming";

interface ProximosDetailClientProps {
  release: UpcomingRelease;
}

export default function ProximosDetailClient({ release }: ProximosDetailClientProps) {
  const [showStoryCard, setShowStoryCard] = useState(false);

  const isReleased = new Date(release.releaseDate).getTime() <= Date.now();
  const bgColor = release.backgroundColor || "#0a0a0a";

  const presaveLinks = {
    rpm: release.rpmPresaveUrl,
    spotify: release.spotifyPresaveUrl,
    appleMusic: release.appleMusicPresaveUrl,
    deezer: release.deezerPresaveUrl,
    tidal: release.tidalPresaveUrl,
    amazonMusic: release.amazonMusicPresaveUrl,
    youtubeMusic: release.youtubeMusicPresaveUrl,
  };

  const hasPresaveLinks = Object.values(presaveLinks).some(Boolean);

  // Minimal shape consumed by the StoryCard canvas generators
  const shareData: UpcomingReleaseShareData = {
    id: release.id,
    title: release.title,
    slug: release.slug,
    description: release.description,
    artistName: release.artistName,
    featuredArtists: release.featuredArtists,
    releaseDate: release.releaseDate.toString(),
    coverImageUrl: release.coverImageUrl,
    releaseType: release.releaseType,
    rpmPresaveUrl: release.rpmPresaveUrl,
    spotifyPresaveUrl: release.spotifyPresaveUrl,
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: bgColor }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />

      {/* Banner Background */}
      {release.bannerImageUrl && (
        <div className="absolute inset-0 opacity-20">
          <Image
            src={release.bannerImageUrl}
            alt={`${release.title} banner`}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
        </div>
      )}

      <div className="relative z-10 py-12">
        <div className="section-container">
          {/* Back Button */}
          <Button asChild variant="ghost" className="mb-8 text-white/60 hover:text-white hover:bg-white/10">
            <Link href="/proximos">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Más Lanzamientos
            </Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Album Cover */}
            <div className="relative mx-auto lg:mx-0">
              <div
                className="absolute inset-0 blur-3xl opacity-50 scale-110"
                style={{ backgroundColor: bgColor }}
              />

              <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96">
                <div className="absolute inset-0 bg-black/40 rounded-2xl blur-2xl transform translate-y-8" />

                <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                  {release.coverImageUrl ? (
                    <Image
                      src={release.coverImageUrl}
                      alt={release.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slc-dark">
                      <Rocket className="w-24 h-24 text-slc-muted" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="text-center lg:text-left">
              {/* Release Type Badge */}
              <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium uppercase tracking-wider rounded-full mb-4">
                {releaseTypeLabels[release.releaseType] || release.releaseType}
              </span>

              {/* Title */}
              <h1 className="font-oswald text-5xl sm:text-6xl lg:text-7xl uppercase mb-4 text-white">
                {release.title}
              </h1>

              {/* Artist */}
              <p className="text-2xl sm:text-3xl text-white/80 mb-6">
                {release.artistName}
                {release.featuredArtists && (
                  <span className="text-white/50"> ft. {release.featuredArtists}</span>
                )}
              </p>

              {/* Release Date */}
              <div className="flex items-center justify-center lg:justify-start gap-3 text-white/60 mb-6">
                <Calendar className="w-5 h-5" />
                <span className="text-lg">{formatDate(release.releaseDate)}</span>
              </div>

              {/* Share Buttons — mirrors the beat detail page layout:
                  purple "Compartir en Stories" button + compact 4-icon row */}
              <div className="flex justify-center lg:justify-start items-center flex-wrap gap-3 mb-8">
                <Button
                  onClick={() => setShowStoryCard(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white gap-2"
                  size="default"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir en Stories
                </Button>
                <ShareButtons
                  title={`${release.title}${release.featuredArtists ? ` ft. ${release.featuredArtists}` : ""} — ${release.artistName} | Sonido Líquido`}
                />
              </div>

              {/* Description */}
              {release.description && (
                <p className="text-white/70 text-lg mb-8 max-w-lg mx-auto lg:mx-0">
                  {release.description}
                </p>
              )}

              {/* Countdown or Released Status */}
              {!isReleased && release.showCountdown ? (
                <div className="mb-10">
                  <CountdownTimer targetDate={release.releaseDate.toString()} />
                </div>
              ) : isReleased ? (
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 mb-10">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="font-medium">¡Ya Disponible!</span>
                </div>
              ) : null}

              {/* Presave Buttons */}
              {hasPresaveLinks && !isReleased && (
                <PresaveButtons links={presaveLinks} />
              )}

              {/* Main CTA if RPM link exists */}
              {release.rpmPresaveUrl && !isReleased && (
                <div className="mt-8">
                  <Button asChild size="lg" className="text-lg px-8 py-6">
                    <a href={release.rpmPresaveUrl} target="_blank" rel="noopener noreferrer">
                      Hacer Presave
                      <ExternalLink className="w-5 h-5 ml-2" />
                    </a>
                  </Button>
                </div>
              )}

              {/* Download Gate */}
              {release.downloadGateEnabled && release.downloadGateFiles && Array.isArray(release.downloadGateFiles) && release.downloadGateFiles.length > 0 && (
                <DownloadGate
                  releaseId={release.id}
                  releaseTitle={release.title}
                  files={release.downloadGateFiles as Array<{name: string; type: "remix" | "wallpaper" | "acapella" | "beat" | "stems" | "other"; url: string; fileName: string; fileSize?: string}>}
                  spotifyPresaveUrl={release.spotifyPresaveUrl}
                  hyperfollowUrl={release.distrokidHyperfollowUrl}
                  requirePresave={release.requirePresaveForDownload ?? true}
                  requireHyperfollow={release.requireHyperfollowForDownload ?? false}
                  requireEmail={release.requireEmailForDownload ?? true}
                />
              )}
            </div>
          </div>

          {/* Teaser Video */}
          {release.teaserVideoUrl && (
            <div className="mt-16 lg:mt-24">
              <h2 className="font-oswald text-2xl uppercase text-center text-white mb-8">
                Teaser
              </h2>
              <div className="max-w-4xl mx-auto">
                <div className="aspect-video rounded-2xl overflow-hidden bg-black/50 shadow-2xl">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(release.teaserVideoUrl)}`}
                    title={`${release.title} - Teaser`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Story Card Share Modal */}
      {showStoryCard && (
        <UpcomingReleaseStoryCard
          release={shareData}
          onClose={() => setShowStoryCard(false)}
        />
      )}
    </div>
  );
}
