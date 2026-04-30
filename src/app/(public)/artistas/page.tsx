import { Suspense } from "react";
import { ArtistCard } from "@/components/public/cards/ArtistCard";
import { artistsService } from "@/lib/services";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Artistas | Sonido Líquido Crew",
  description: "Conoce a los artistas del colectivo de Hip Hop más representativo de México.",
};

export const dynamic = "force-dynamic";

// Placeholder colors for empty grid slots
const placeholderColors = [
  { bg: "#3D7A7A", highlight: "#5BA8A8", shadow: "#2A5555" },
  { bg: "#D4A520", highlight: "#F0C040", shadow: "#A88010" },
  { bg: "#5A7590", highlight: "#7A95B0", shadow: "#3A5570" },
  { bg: "#C45A3A", highlight: "#E07A5A", shadow: "#943A20" },
  { bg: "#C09020", highlight: "#E0B040", shadow: "#907000" },
  { bg: "#B54A30", highlight: "#D56A50", shadow: "#852A10" },
  { bg: "#7A4A4A", highlight: "#9A6A6A", shadow: "#5A2A2A" },
  { bg: "#4A9070", highlight: "#6AB090", shadow: "#2A7050" },
  { bg: "#C06A50", highlight: "#E08A70", shadow: "#904A30" },
];

async function ArtistsGrid() {
  const artists = await artistsService.getAll({ onlyActive: true });

  // Calculate empty slots to fill grid to a multiple of 3 (minimum 9)
  const minSlots = 9;
  const artistCount = artists.length;
  const targetSlots = Math.max(minSlots, Math.ceil(artistCount / 3) * 3);
  const emptySlots = targetSlots - artistCount;

  return (
    <div className="relative">
      {/* Outer cream/beige frame - like a gallery frame */}
      <div className="bg-[#C8B896] p-2 sm:p-3 rounded-sm shadow-2xl">
        {/* Inner dark border for depth */}
        <div className="bg-[#1a1a1a] p-[2px]">
          {/* 3x3 Grid of artists */}
          <div className="grid grid-cols-3">
            {artists.map((artist, index) => (
              <ArtistCard key={artist.id} artist={artist} index={index} />
            ))}
            {/* Placeholder colored squares for empty slots */}
            {Array.from({ length: emptySlots }).map((_, i) => {
              const colorIndex = artistCount + i;
              const color = placeholderColors[colorIndex % placeholderColors.length];
              return (
                <div
                  key={`placeholder-${i}`}
                  className="aspect-square border-[1px] border-[#1a1a1a]/40"
                  style={{
                    background: `linear-gradient(135deg, ${color.highlight} 0%, ${color.bg} 50%, ${color.shadow} 100%)`,
                  }}
                >
                  {/* Halftone-like texture overlay */}
                  <div
                    className="w-full h-full opacity-10"
                    style={{
                      backgroundImage: `radial-gradient(circle, ${color.shadow} 1px, transparent 1px)`,
                      backgroundSize: '4px 4px',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subtle drop shadow effect */}
      <div className="absolute -bottom-2 left-4 right-4 h-4 bg-gradient-to-b from-black/30 to-transparent blur-sm -z-10" />
    </div>
  );
}

function ArtistsGridSkeleton() {
  const colors = [
    "#3D7A7A", "#D4A520", "#5A7590",
    "#C45A3A", "#C09020", "#B54A30",
    "#7A4A4A", "#4A9070", "#C06A50",
  ];

  return (
    <div className="relative">
      <div className="bg-[#C8B896] p-2 sm:p-3 rounded-sm shadow-2xl">
        <div className="bg-[#1a1a1a] p-[2px]">
          <div className="grid grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArtistasPage() {
  return (
    <div className="py-12 md:py-20 bg-[#0a0a0a] min-h-screen">
      <div className="section-container max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-oswald text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide text-white">
            Artistas
          </h1>
          <p className="text-gray-400 mt-3">
            El roster más representativo del Hip Hop mexicano
          </p>
          <div className="w-20 h-1 bg-primary mx-auto mt-6" />
        </div>

        {/* Pop-Art Artists Grid */}
        <Suspense fallback={<ArtistsGridSkeleton />}>
          <ArtistsGrid />
        </Suspense>

        {/* Stats */}
        <div className="mt-16 text-center">
          <p className="text-gray-400">
            <span className="text-primary font-oswald text-2xl">15+</span> artistas activos ·
            <span className="text-primary font-oswald text-2xl ml-2">25+</span> años de historia
          </p>
        </div>
      </div>
    </div>
  );
}
