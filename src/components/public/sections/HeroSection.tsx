"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, Volume2 } from "lucide-react";
import { AudioVisualizer, FloatingParticles, ShimmerText, RevealText, useSoundEffects } from "../effects";

interface Stats {
  artists: number;
  releases: number;
  yearsOfHistory: number;
}

// Default fallback stats
const defaultStats: Stats = {
  artists: 15,
  releases: 160,
  yearsOfHistory: 26,
};

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [stats, setStats] = useState<Stats>(defaultStats);
  const { playSound } = useSoundEffects();

  useEffect(() => {
    setIsVisible(true);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Fetch real stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        if (data.success && data.data) {
          setStats({
            artists: data.data.artists || defaultStats.artists,
            releases: data.data.releases || defaultStats.releases,
            yearsOfHistory: data.data.yearsOfHistory || defaultStats.yearsOfHistory,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Keep default stats on error
      }
    };

    fetchStats();
  }, []);

  const scrollToContent = useCallback(() => {
    playSound("whoosh");
    const nextSection = document.getElementById("featured-artists");
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: "smooth" });
    }
  }, [playSound]);

  const handleButtonHover = useCallback(() => {
    playSound("hover");
  }, [playSound]);

  const handleButtonClick = useCallback(() => {
    playSound("click");
  }, [playSound]);

  // Format stats for display
  const displayStats = [
    { value: `${stats.artists}+`, label: "Artistas" },
    { value: `${stats.releases}+`, label: "Lanzamientos" },
    { value: `${stats.yearsOfHistory}+`, label: "Años" },
  ];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-slc-black">
        {/* Audio Visualizer */}
        <AudioVisualizer />

        {/* Floating Particles */}
        <FloatingParticles />

        {/* Dynamic Gradient Orbs with mouse movement */}
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px] animate-pulse"
          style={{
            transform: `translate(${mousePosition.x * 2}px, ${mousePosition.y * 2}px)`,
            transition: "transform 0.3s ease-out",
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[120px] animate-pulse"
          style={{
            animationDelay: "1s",
            transform: `translate(${-mousePosition.x * 1.5}px, ${-mousePosition.y * 1.5}px)`,
            transition: "transform 0.3s ease-out",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-[180px]"
          style={{
            animationDelay: "2s",
            transform: `translate(calc(-50% + ${mousePosition.x}px), calc(-50% + ${mousePosition.y}px))`,
            transition: "transform 0.5s ease-out",
          }}
        />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(249,115,22,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Noise overlay */}
        <div className="absolute inset-0 noise-overlay" />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Live Badge */}
        <div
          className={`inline-flex items-center gap-3 px-5 py-2 bg-slc-card/90 backdrop-blur-sm border border-slc-border/50 rounded-full mb-8 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-slc-muted">
            Lo más avanzado del Hip Hop mexicano
          </span>
          <Volume2 className="w-4 h-4 text-primary animate-pulse" />
        </div>

        {/* Main Title with Letter Reveal + Shimmer Effect */}
        <h1
          className={`transition-all duration-1000 delay-150 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="block font-oswald text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] uppercase tracking-tight text-white leading-[0.85]">
            <ShimmerText text="Sonido Líquido" />
          </span>
          <span className="block font-oswald text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] uppercase tracking-tight text-white leading-[0.85] mt-2">
            <RevealText text="Crew" delay={300} />
          </span>
        </h1>

        {/* Tagline with typewriter effect */}
        <p
          className={`text-slc-muted text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto mt-8 transition-all duration-700 delay-300 font-light tracking-wide ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          El colectivo de Hip Hop más representativo de{" "}
          <span className="text-primary font-medium">México</span>.
          <br className="hidden sm:block" />
          Fundado en <span className="text-white font-medium">1999</span> en la Ciudad de México por{" "}
          <span className="text-primary font-medium">Zaque</span>.
        </p>

        {/* Stats with Glow Effect */}
        <div
          className={`grid grid-cols-3 gap-6 sm:gap-12 max-w-xl mx-auto mt-12 transition-all duration-700 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {displayStats.map((stat, index) => (
            <div
              key={index}
              className="text-center group cursor-default"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="font-oswald text-4xl sm:text-5xl md:text-7xl text-primary font-bold glow-orange transition-all duration-300 group-hover:scale-110">
                {stat.value}
              </div>
              <div className="text-slc-muted text-xs sm:text-sm uppercase tracking-[0.15em] mt-2 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 transition-all duration-700 delay-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <a
            href="https://open.spotify.com/playlist/5qHTKCZIwi3GM3mhPq45Ab"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-spotify hover:bg-spotify-dark text-white font-semibold rounded-full transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-[0_0_30px_rgba(30,215,96,0.4)]"
            onMouseEnter={handleButtonHover}
            onFocus={handleButtonHover}
            onClick={handleButtonClick}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
              />
            </svg>
            <span className="relative">Escuchar en Spotify</span>
          </a>
          <a
            href="https://www.youtube.com/@sonidoliquidocrew"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-slc-card/80 backdrop-blur-sm hover:bg-youtube text-white font-semibold rounded-full border border-slc-border hover:border-youtube transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-[0_0_30px_rgba(255,0,0,0.3)]"
            onMouseEnter={handleButtonHover}
            onFocus={handleButtonHover}
            onClick={handleButtonClick}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
              />
            </svg>
            <span className="relative">Ver en YouTube</span>
          </a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slc-muted hover:text-primary transition-colors cursor-pointer group"
        aria-label="Scroll to content"
        onMouseEnter={handleButtonHover}
        onFocus={handleButtonHover}
      >
        <span className="text-xs uppercase tracking-[0.2em] group-hover:tracking-[0.3em] transition-all">
          Explorar
        </span>
        <div className="relative">
          <ChevronDown className="w-6 h-6 animate-bounce" />
          <ChevronDown className="w-6 h-6 absolute top-2 left-0 animate-bounce opacity-50" style={{ animationDelay: "0.1s" }} />
        </div>
      </button>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slc-black to-transparent pointer-events-none" />
    </section>
  );
}
