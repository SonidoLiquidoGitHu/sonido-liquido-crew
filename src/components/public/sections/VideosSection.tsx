"use client";

import { Shuffle, Tv, Video as VideoIcon } from "lucide-react";
import type { Video } from "@/types";
import dynamic from "next/dynamic";
import { useState } from "react";

// ===========================================
// VIDEOS SECTION - Tabbed: Destacados / Aleatorios / Canales
// Merges: FeaturedVideos + RandomVideoCarousel + ArtistChannels
// ===========================================

const FeaturedVideos = dynamic(
  () =>
    import("@/components/public/sections/FeaturedVideos").then((m) => ({
      default: m.FeaturedVideos,
    })),
  { ssr: true },
);

const RandomVideoCarousel = dynamic(
  () =>
    import("@/components/public/sections/RandomVideoCarousel").then((m) => ({
      default: m.RandomVideoCarousel,
    })),
  { ssr: true },
);

const ArtistChannels = dynamic(
  () =>
    import("@/components/public/sections/ArtistChannels").then((m) => ({
      default: m.ArtistChannels,
    })),
  { ssr: true },
);

const TABS = [
  { id: "featured", label: "Destacados", icon: VideoIcon },
  { id: "random", label: "Aleatorios", icon: Shuffle },
  { id: "channels", label: "Canales", icon: Tv },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface VideosSectionProps {
  featuredVideos: Video[];
}

export function VideosSection({ featuredVideos }: VideosSectionProps) {
  const [activeTab, setActiveTab] = useState<TabId>(
    featuredVideos.length > 0 ? "featured" : "random",
  );

  return (
    <section id="videos" className="py-16">
      <div className="section-container">
        {/* Header with tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-oswald text-3xl md:text-4xl uppercase text-white flex items-center gap-3">
              <VideoIcon className="w-8 h-8 text-primary" />
              Videos
            </h2>
            <p className="text-gray-400 mt-1 text-sm">
              Videoclips, sesiones y contenido del colectivo
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex gap-1 bg-slc-card rounded-lg p-1 border border-slc-border">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${
                      activeTab === tab.id
                        ? "bg-primary text-white shadow-sm"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="min-h-[400px]">
          {activeTab === "featured" &&
            (featuredVideos.length > 0 ? (
              <FeaturedVideos videos={featuredVideos} />
            ) : (
              <div className="text-center py-12 text-gray-400">
                <VideoIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Videos destacados próximamente</p>
              </div>
            ))}
          {activeTab === "random" && (
            <RandomVideoCarousel
              title="Videos Aleatorios"
              subtitle="Descubre contenido diferente cada vez que visitas"
              limit={6}
              showRefreshButton={true}
            />
          )}
          {activeTab === "channels" && <ArtistChannels />}
        </div>
      </div>
    </section>
  );
}
