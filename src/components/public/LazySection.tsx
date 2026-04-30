"use client";

import { useEffect, useRef, useState, ReactNode, Suspense } from "react";

interface LazySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  minHeight?: string;
  className?: string;
}

// Detect if we're in a limited browser (Instagram, Facebook, etc.)
function isLimitedBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("instagram") ||
    ua.includes("fban") ||
    ua.includes("fbav") ||
    ua.includes("fb_iab") ||
    ua.includes("twitter") ||
    ua.includes("tiktok")
  );
}

// Default loading skeleton
function DefaultSkeleton({ minHeight = "400px" }: { minHeight?: string }) {
  return (
    <div
      className="animate-pulse bg-gradient-to-b from-slc-dark/50 to-slc-black flex items-center justify-center"
      style={{ minHeight }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-slc-border/30" />
        <div className="w-48 h-4 rounded bg-slc-border/30" />
        <div className="w-32 h-3 rounded bg-slc-border/20" />
      </div>
    </div>
  );
}

/**
 * LazySection - Defers rendering of below-the-fold sections until they're about to enter the viewport.
 * This dramatically improves initial page load by reducing the amount of JavaScript that needs to execute.
 *
 * Note: For limited browsers (Instagram, Facebook, etc.), content is shown immediately
 * since their IntersectionObserver implementation may not work properly.
 */
export function LazySection({
  children,
  fallback,
  rootMargin = "200px", // Start loading 200px before entering viewport
  threshold = 0,
  minHeight = "400px",
  className = "",
}: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for limited browser
    const limited = isLimitedBrowser();
    setIsLimited(limited);

    // For limited browsers, show content immediately
    if (limited) {
      setIsVisible(true);
      setHasLoaded(true);
      return;
    }

    // Check if IntersectionObserver is available
    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      setHasLoaded(true);
      return;
    }

    // Fallback timeout in case IntersectionObserver doesn't work
    const fallbackTimer = setTimeout(() => {
      if (!isVisible) {
        setIsVisible(true);
        setHasLoaded(true);
      }
    }, 2000);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, disconnect observer
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [rootMargin, threshold, isVisible]);

  // Mark as loaded after first render
  useEffect(() => {
    if (isVisible) {
      // Small delay to allow render (skip for limited browsers)
      const delay = isLimited ? 0 : 100;
      const timer = setTimeout(() => setHasLoaded(true), delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isLimited]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? (
        <Suspense fallback={fallback || <DefaultSkeleton minHeight={minHeight} />}>
          <div
            className={`transition-opacity duration-500 ${hasLoaded ? "opacity-100" : "opacity-0"}`}
          >
            {children}
          </div>
        </Suspense>
      ) : (
        fallback || <DefaultSkeleton minHeight={minHeight} />
      )}
    </div>
  );
}

// Section-specific skeletons
export function ArtistsSkeleton() {
  return (
    <section className="py-20 bg-slc-dark">
      <div className="section-container">
        <div className="animate-pulse">
          <div className="w-48 h-8 bg-slc-border/30 rounded mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-slc-border/20" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReleasesSkeleton() {
  return (
    <section className="py-20 bg-slc-black">
      <div className="section-container">
        <div className="animate-pulse">
          <div className="w-48 h-8 bg-slc-border/30 rounded mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-square rounded-lg bg-slc-border/20" />
                <div className="w-3/4 h-4 bg-slc-border/20 rounded" />
                <div className="w-1/2 h-3 bg-slc-border/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function VideosSkeleton() {
  return (
    <section className="py-20 bg-slc-dark">
      <div className="section-container">
        <div className="animate-pulse">
          <div className="w-48 h-8 bg-slc-border/30 rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-xl bg-slc-border/20" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function EventsSkeleton() {
  return (
    <section className="py-20 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
      <div className="section-container">
        <div className="animate-pulse">
          <div className="w-48 h-8 bg-slc-border/30 rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-slc-border/20" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function GallerySkeleton() {
  return (
    <section className="py-20 bg-slc-black">
      <div className="section-container">
        <div className="animate-pulse">
          <div className="w-48 h-8 bg-slc-border/30 rounded mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-slc-border/20" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default LazySection;
