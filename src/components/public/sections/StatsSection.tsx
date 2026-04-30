"use client";

import { useEffect, useState, useRef } from "react";
import { Users, Disc3, Play, Calendar, TrendingUp } from "lucide-react";
import { ScrollReveal } from "../effects/ScrollReveal";

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
  color: string;
}

interface ApiStats {
  artists: number;
  releases: number;
  videos: number;
  yearsOfHistory: number;
}

// Default fallback values
const defaultApiStats: ApiStats = {
  artists: 15,
  releases: 195,
  videos: 800,
  yearsOfHistory: 27,
};

function createStatsFromApi(apiStats: ApiStats): StatItem[] {
  return [
    { icon: <Users className="w-8 h-8" />, value: apiStats.artists, suffix: "+", label: "Artistas", color: "#f97316" },
    { icon: <Disc3 className="w-8 h-8" />, value: apiStats.releases, suffix: "+", label: "Lanzamientos", color: "#22c55e" },
    { icon: <Play className="w-8 h-8" />, value: apiStats.videos, suffix: "+", label: "Videos", color: "#ef4444" },
    { icon: <Calendar className="w-8 h-8" />, value: apiStats.yearsOfHistory, suffix: "+", label: "Años de Historia", color: "#3b82f6" },
  ];
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

export function StatsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<StatItem[]>(createStatsFromApi(defaultApiStats));
  // Initialize counts with actual values for limited browsers
  const [counts, setCounts] = useState<number[]>(() =>
    createStatsFromApi(defaultApiStats).map(s => s.value)
  );
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Check for limited browser on mount
  useEffect(() => {
    const limited = isLimitedBrowser();
    setIsLimited(limited);

    // For limited browsers, show stats immediately without animation
    if (limited) {
      setIsVisible(true);
      setHasAnimated(true);
      // Counts are already initialized with actual values
    } else {
      // Reset counts to 0 for animation in normal browsers
      setCounts(stats.map(() => 0));
    }
  }, []);

  // Fetch real stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats", {
          // Add cache headers for better performance
          cache: "force-cache",
        });
        const data = await res.json();
        if (data.success && data.data) {
          const newStats = createStatsFromApi({
            artists: data.data.artists || defaultApiStats.artists,
            releases: data.data.releases || defaultApiStats.releases,
            videos: data.data.videos || defaultApiStats.videos,
            yearsOfHistory: data.data.yearsOfHistory || defaultApiStats.yearsOfHistory,
          });
          setStats(newStats);

          // For limited browsers, update counts directly
          // For normal browsers, reset counts to 0 for animation
          if (isLimited || hasAnimated) {
            setCounts(newStats.map(s => s.value));
          } else {
            setCounts(newStats.map(() => 0));
          }
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Keep default stats on error - counts already have values
      }
    };

    fetchStats();
  }, [isLimited, hasAnimated]);

  useEffect(() => {
    // Skip observer for limited browsers
    if (isLimited) {
      setIsVisible(true);
      return;
    }

    // Fallback timeout in case IntersectionObserver doesn't work
    const fallbackTimer = setTimeout(() => {
      if (!isVisible) {
        setIsVisible(true);
      }
    }, 1500);

    // Try IntersectionObserver
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 } // Lower threshold for better detection
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [isLimited, isVisible]);

  // Animation effect
  useEffect(() => {
    // Skip animation for limited browsers
    if (isLimited || !isVisible || hasAnimated) return;

    const duration = 2500;
    const steps = 80;
    const interval = duration / steps;

    setHasAnimated(true);

    const timers = stats.map((stat, index) => {
      let step = 0;
      return setInterval(() => {
        step++;
        const progress = step / steps;
        // Cubic ease out for smoother animation
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(stat.value * easeOut);

        setCounts((prev) => {
          const newCounts = [...prev];
          newCounts[index] = currentValue;
          return newCounts;
        });

        if (step >= steps) {
          clearInterval(timers[index]);
        }
      }, interval);
    });

    return () => timers.forEach((timer) => clearInterval(timer));
  }, [isVisible, stats, hasAnimated, isLimited]);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slc-black via-slc-card to-slc-black" />

      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Border lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slc-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slc-border to-transparent" />

      <div className="relative section-container">
        {/* Section header with scroll reveal */}
        <ScrollReveal direction="up" duration={600}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-primary">
                Nuestros números
              </span>
            </div>
            <h2 className="font-oswald text-3xl md:text-4xl uppercase tracking-wide text-white">
              La historia en cifras
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <ScrollReveal
              key={index}
              direction="up"
              delay={index * 100}
              duration={600}
            >
              <div
                className="relative group text-center p-6 rounded-2xl bg-slc-card/50 backdrop-blur-sm border border-slc-border/50 transition-all duration-500 hover:border-primary/50 hover:bg-slc-card/80 opacity-100"
              >
                {/* Glow effect on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                  style={{
                    boxShadow: `0 0 40px ${stat.color}20`,
                  }}
                />

                {/* Icon */}
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: `${stat.color}15`,
                    color: stat.color,
                    boxShadow: `0 0 20px ${stat.color}30`,
                  }}
                >
                  {stat.icon}
                </div>

                {/* Number */}
                <div
                  className="font-oswald text-4xl md:text-5xl lg:text-6xl font-bold transition-all duration-300"
                  style={{
                    color: stat.color,
                    textShadow: `0 0 30px ${stat.color}50, 0 0 60px ${stat.color}30`,
                  }}
                >
                  {counts[index]}
                  {stat.suffix && (
                    <span className="text-white/80">{stat.suffix}</span>
                  )}
                </div>

                {/* Label */}
                <div className="text-slc-muted text-sm uppercase tracking-wider mt-3 font-medium group-hover:text-white transition-colors">
                  {stat.label}
                </div>

                {/* Decorative line */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 rounded-full transition-all duration-500 group-hover:w-1/2"
                  style={{ backgroundColor: stat.color }}
                />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
