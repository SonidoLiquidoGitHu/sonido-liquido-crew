"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface MarqueeItem {
  text: string;
  slug: string;
  highlight: boolean;
}

const FALLBACK_ITEMS: MarqueeItem[] = [
  { text: "SONIDO LÍQUIDO CREW", slug: "", highlight: true },
];

interface MarqueeBannerProps {
  speed?: number;
}

export function MarqueeBanner({ speed = 40 }: MarqueeBannerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [marqueeItems, setMarqueeItems] =
    useState<MarqueeItem[]>(FALLBACK_ITEMS);

  // Fetch roster data from API
  useEffect(() => {
    async function fetchRoster() {
      try {
        const res = await fetch("/api/artists/roster");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.length > 0) {
            const items: MarqueeItem[] = data.data.map(
              (artist: {
                name: string;
                slug: string;
                isFeatured: boolean;
              }) => ({
                text: artist.name.toUpperCase(),
                slug: artist.slug,
                highlight: artist.isFeatured,
              }),
            );
            setMarqueeItems(items);
          }
        }
      } catch (error) {
        console.error("Failed to fetch roster for marquee:", error);
      }
    }
    fetchRoster();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: stable function reference
  useEffect(() => {
    if (!scrollerRef.current) return;

    const scroller = scrollerRef.current;
    const scrollerContent = Array.from(scroller.children);

    // Duplicate items multiple times for seamless loop
    for (let i = 0; i < 3; i++) {
      for (const item of scrollerContent) {
        const duplicated = item.cloneNode(true) as HTMLElement;
        duplicated.setAttribute("aria-hidden", "true");
        scroller.appendChild(duplicated);
      }
    }
  }, [marqueeItems]);

  return (
    <div className="relative py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-y border-primary/20 overflow-hidden">
      {/* Glow effects */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slc-black to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slc-black to-transparent z-10" />

      {/* Animated background line */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>

      <div
        ref={scrollerRef}
        className="flex whitespace-nowrap animate-marquee"
        style={{
          animationDuration: `${marqueeItems.length * (100 / speed)}s`,
        }}
      >
        {marqueeItems.map((item, index) => (
          <Link
            key={index}
            href={item.slug ? `/artistas/${item.slug}` : "#"}
            className={`inline-flex items-center mx-6 sm:mx-10 font-oswald text-lg sm:text-2xl md:text-3xl uppercase tracking-wider transition-all duration-300 hover:scale-110 ${
              item.highlight
                ? "text-primary glow-orange hover:text-primary"
                : "text-white/60 hover:text-white"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-4 ${
                item.highlight ? "bg-primary animate-pulse" : "bg-white/30"
              }`}
            />
            {item.text}
          </Link>
        ))}
      </div>
    </div>
  );
}
