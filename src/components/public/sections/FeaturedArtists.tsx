"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ArtistCard } from "../cards/ArtistCard";
import type { Artist } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "../effects/ScrollReveal";

interface FeaturedArtistsProps {
  artists: Artist[];
}

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
  { bg: "#8A4A7A", highlight: "#AA6A9A", shadow: "#6A2A5A" },
  { bg: "#3A6090", highlight: "#5A80B0", shadow: "#1A4070" },
  { bg: "#908050", highlight: "#B0A070", shadow: "#706030" },
  { bg: "#4A8A60", highlight: "#6AAA80", shadow: "#2A6A40" },
  { bg: "#904040", highlight: "#B06060", shadow: "#702020" },
  { bg: "#4A4A90", highlight: "#6A6AB0", shadow: "#2A2A70" },
];

export function FeaturedArtists({ artists }: FeaturedArtistsProps) {
  if (!artists.length) return null;

  // Show all 15 artists in a 5x3 grid
  const featuredArtists = artists.slice(0, 15);

  // Fill remaining slots with placeholders if we have less than 15 artists
  const totalSlots = 15;
  const emptySlots = totalSlots - featuredArtists.length;

  return (
    <section id="featured-artists" className="py-16 md:py-24 bg-[#0a0a0a]">
      <div className="section-container max-w-6xl">
        {/* Header with scroll reveal */}
        <ScrollReveal direction="up" duration={600}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="font-oswald text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide text-white">
                Artistas
              </h2>
              <p className="text-gray-400 mt-2">
                El roster más representativo del Hip Hop mexicano - 15 artistas
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0 border-gray-600 text-white hover:bg-white/10">
              <Link href="/artistas">
                Ver perfiles
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>

        {/* Pop-Art Artists Grid - Framed like a museum print */}
        <ScrollReveal direction="scale" duration={800} delay={200}>
          <div className="relative">
            {/* Outer cream/beige frame - like a gallery frame */}
            <div className="bg-[#C8B896] p-2 sm:p-3 rounded-sm shadow-2xl">
              {/* Inner dark border for depth */}
              <div className="bg-[#1a1a1a] p-[2px]">
                {/* 5x3 Grid of artists (15 total) */}
                <div className="grid grid-cols-3 sm:grid-cols-5">
                  {featuredArtists.map((artist, index) => (
                    <ArtistCard key={artist.id} artist={artist} index={index} />
                  ))}
                  {/* Placeholder colored squares for empty slots */}
                  {Array.from({ length: emptySlots }).map((_, i) => {
                    const colorIndex = featuredArtists.length + i;
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
        </ScrollReveal>

        {/* Mobile CTA */}
        <ScrollReveal direction="up" delay={400}>
          <div className="mt-10 text-center sm:hidden">
            <Button asChild variant="outline" size="lg" className="border-gray-600 text-white hover:bg-white/10">
              <Link href="/artistas">
                Ver todos los artistas
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
