"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ReleaseCard } from "../cards/ReleaseCard";
import type { Release } from "@/types";
import { Button } from "@/components/ui/button";

interface LatestReleasesProps {
  releases: Release[];
  title?: string;
  subtitle?: string;
}

export function LatestReleases({
  releases,
  title = "Últimos Lanzamientos",
  subtitle = "Lo más nuevo del crew en todas las plataformas",
}: LatestReleasesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!releases.length) return null;

  return (
    <section className="py-20 bg-slc-black">
      <div className="section-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
          <div>
            <h2 className="section-title text-left">{title}</h2>
            <p className="section-subtitle text-left mt-2">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("left")}
              className="hidden sm:flex"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("right")}
              className="hidden sm:flex"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/discografia">
                Ver todo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Releases Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-20 -mb-20 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {releases.map((release) => (
            <div
              key={release.id}
              className="flex-shrink-0 w-40 sm:w-48 snap-start"
            >
              <ReleaseCard release={release} showArtist={false} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
