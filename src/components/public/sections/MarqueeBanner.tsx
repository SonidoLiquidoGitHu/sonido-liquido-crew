"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const marqueeItems = [
  { text: "ZAQUE", slug: "zaque", highlight: true },
  { text: "DOCTOR DESTINO", slug: "doctor-destino", highlight: false },
  { text: "BREZ", slug: "brez", highlight: false },
  { text: "BRUNO GRASSO", slug: "bruno-grasso", highlight: false },
  { text: "DILEMA", slug: "dilema", highlight: false },
  { text: "CODAK", slug: "codak", highlight: true },
  { text: "KEV CABRONE", slug: "kev-cabrone", highlight: false },
  { text: "HASSYEL", slug: "hassyel", highlight: false },
  { text: "LATIN GEISHA", slug: "latin-geisha", highlight: true },
  { text: "FANCY FREAK", slug: "fancy-freak", highlight: false },
  { text: "Q MASTER WEED", slug: "q-master-weed", highlight: false },
  { text: "X SANTA-ANA", slug: "x-santa-ana", highlight: false },
  { text: "CHAS7P", slug: "chas7p", highlight: false },
  { text: "REICK ONE", slug: "reick-one", highlight: false },
  { text: "PEPE LEVINE", slug: "pepe-levine", highlight: false },
];

interface MarqueeBannerProps {
  speed?: number;
}

export function MarqueeBanner({ speed = 40 }: MarqueeBannerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollerRef.current) return;

    const scroller = scrollerRef.current;
    const scrollerContent = Array.from(scroller.children);

    // Duplicate items multiple times for seamless loop
    for (let i = 0; i < 3; i++) {
      scrollerContent.forEach((item) => {
        const duplicated = item.cloneNode(true) as HTMLElement;
        duplicated.setAttribute("aria-hidden", "true");
        scroller.appendChild(duplicated);
      });
    }
  }, []);

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
            href={`/artistas/${item.slug}`}
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
