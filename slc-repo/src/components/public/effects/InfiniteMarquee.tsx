"use client";

import { useEffect, useRef } from "react";

interface MarqueeItem {
  text: string;
  highlight?: boolean;
}

interface InfiniteMarqueeProps {
  items: MarqueeItem[];
  speed?: number;
  direction?: "left" | "right";
  className?: string;
}

export function InfiniteMarquee({
  items,
  speed = 30,
  direction = "left",
  className = "",
}: InfiniteMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return;

    const scroller = scrollerRef.current;
    const scrollerContent = Array.from(scroller.children);

    // Duplicate items for seamless loop
    scrollerContent.forEach((item) => {
      const duplicated = item.cloneNode(true) as HTMLElement;
      duplicated.setAttribute("aria-hidden", "true");
      scroller.appendChild(duplicated);
    });

    // Set animation direction
    scroller.style.setProperty("--marquee-direction", direction === "left" ? "forwards" : "reverse");
    scroller.style.setProperty("--marquee-duration", `${items.length * (100 / speed)}s`);
  }, [items, direction, speed]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      style={{ maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)" }}
    >
      <div
        ref={scrollerRef}
        className="flex whitespace-nowrap animate-marquee"
        style={{
          animationDirection: "var(--marquee-direction, forwards)",
          animationDuration: "var(--marquee-duration, 20s)",
        }}
      >
        {items.map((item, index) => (
          <span
            key={index}
            className={`inline-flex items-center mx-8 text-sm md:text-base font-medium uppercase tracking-wider ${
              item.highlight ? "text-primary" : "text-slc-muted"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-primary/50 mr-4" />
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
