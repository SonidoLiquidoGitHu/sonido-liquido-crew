"use client";

import { useState } from "react";
import { Music2, Headphones, ListMusic } from "lucide-react";

// ===========================================
// MÚSICA SECTION - Tabbed: Artistas / Beats / Playlists
// Merges: RandomArtistPlayer + FeaturedBeats + SpotifySection
// ===========================================

// Lazy load the heavy sub-components
import dynamic from "next/dynamic";

const RandomArtistPlayer = dynamic(
  () => import("@/components/public/RandomArtistPlayer").then(m => ({ default: m.RandomArtistPlayer })),
  { ssr: false }
);

const FeaturedBeats = dynamic(
  () => import("@/components/public/sections/FeaturedBeats").then(m => ({ default: m.FeaturedBeats })),
  { ssr: true }
);

const SpotifySection = dynamic(
  () => import("@/components/public/sections/SpotifySection").then(m => ({ default: m.SpotifySection })),
  { ssr: true }
);

const TABS = [
  { id: "artistas", label: "Artistas", icon: Music2 },
  { id: "beats", label: "Beats", icon: Headphones },
  { id: "playlists", label: "Playlists", icon: ListMusic },
] as const;

type TabId = typeof TABS[number]["id"];

interface MusicaSectionProps {
  featuredBeats: any[];
}

export function MusicaSection({ featuredBeats }: MusicaSectionProps) {
  const [activeTab, setActiveTab] = useState<TabId>("artistas");

  return (
    <section id="musica" className="py-16">
      <div className="section-container">
        {/* Header with tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-oswald text-3xl md:text-4xl uppercase text-white flex items-center gap-3">
              <Music2 className="w-8 h-8 text-primary" />
              Música
            </h2>
            <p className="text-gray-400 mt-1 text-sm">
              Escucha, descubre y conecta con el sonido del colectivo
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
                    ${activeTab === tab.id
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
        <div className="min-h-[300px]">
          {activeTab === "artistas" && <RandomArtistPlayer />}
          {activeTab === "beats" && (
            featuredBeats.length > 0 ? (
              <FeaturedBeats beats={featuredBeats} />
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Headphones className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Próximamente más beats</p>
              </div>
            )
          )}
          {activeTab === "playlists" && <SpotifySection />}
        </div>
      </div>
    </section>
  );
}
