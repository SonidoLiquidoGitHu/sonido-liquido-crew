"use client";

import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { useState, useRef, useCallback } from "react";
import type { Artist } from "@/types";
import { useSoundEffects } from "../effects/SoundEffects";

// Pop-art color palette matching classic Warhol-style prints
// Each color has a background, highlight tint, and shadow for depth
const popArtColors = [
  // Row 1
  { bg: "#3D7A7A", highlight: "#5BA8A8", shadow: "#2A5555" },      // Teal/Cyan
  { bg: "#D4A520", highlight: "#F0C040", shadow: "#A88010" },     // Yellow/Gold
  { bg: "#5A7590", highlight: "#7A95B0", shadow: "#3A5570" },    // Steel Blue
  // Row 2
  { bg: "#C45A3A", highlight: "#E07A5A", shadow: "#943A20" },    // Coral/Salmon
  { bg: "#C09020", highlight: "#E0B040", shadow: "#907000" },       // Amber/Orange
  { bg: "#B54A30", highlight: "#D56A50", shadow: "#852A10" },        // Terracotta
  // Row 3
  { bg: "#7A4A4A", highlight: "#9A6A6A", shadow: "#5A2A2A" },    // Dusty Rose/Brown
  { bg: "#4A9070", highlight: "#6AB090", shadow: "#2A7050" },      // Mint/Green
  { bg: "#C06A50", highlight: "#E08A70", shadow: "#904A30" },     // Peach/Salmon
  // Additional colors
  { bg: "#8A4A7A", highlight: "#AA6A9A", shadow: "#6A2A5A" },      // Purple/Magenta
  { bg: "#3A6090", highlight: "#5A80B0", shadow: "#1A4070" },      // Blue
  { bg: "#908050", highlight: "#B0A070", shadow: "#706030" },     // Olive/Tan
  { bg: "#4A8A60", highlight: "#6AAA80", shadow: "#2A6A40" },      // Green
  { bg: "#904040", highlight: "#B06060", shadow: "#702020" },        // Red/Crimson
  { bg: "#4A4A90", highlight: "#6A6AB0", shadow: "#2A2A70" },      // Indigo
];

// Glow colors for 3D effect
const glowColors = [
  "rgba(249, 115, 22, 0.6)", // Orange
  "rgba(34, 211, 238, 0.6)", // Cyan
  "rgba(74, 222, 128, 0.6)", // Green
  "rgba(251, 191, 36, 0.6)", // Yellow
  "rgba(244, 114, 182, 0.6)", // Pink
  "rgba(167, 139, 250, 0.6)", // Purple
];

interface ArtistCardProps {
  artist: Artist;
  index?: number;
}

export function ArtistCard({ artist, index = 0 }: ArtistCardProps) {
  const colorScheme = popArtColors[index % popArtColors.length];
  const glowColor = glowColors[index % glowColors.length];
  const [imageError, setImageError] = useState(false);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const { playSound } = useSoundEffects();

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate rotation based on mouse position
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 12;
    const rotateX = -((e.clientY - centerY) / (rect.height / 2)) * 12;

    // Calculate glare position
    const glareX = ((e.clientX - rect.left) / rect.width) * 100;
    const glareY = ((e.clientY - rect.top) / rect.height) * 100;

    setTransform({ rotateX, rotateY, scale: 1.05 });
    setGlarePosition({ x: glareX, y: glareY });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    playSound("hover");
  }, [playSound]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTransform({ rotateX: 0, rotateY: 0, scale: 1 });
    setGlarePosition({ x: 50, y: 50 });
  }, []);

  const handleClick = useCallback(() => {
    playSound("click");
  }, [playSound]);

  return (
    <Link
      ref={cardRef}
      href={`/artistas/${artist.slug}`}
      className="group relative block aspect-square overflow-hidden border-[1px] border-[#1a1a1a]/40"
      style={{
        backgroundColor: colorScheme.bg,
        transform: `perspective(1000px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg) scale3d(${transform.scale}, ${transform.scale}, ${transform.scale})`,
        transformStyle: "preserve-3d",
        transition: isHovering ? "transform 0.1s ease-out" : "transform 0.5s ease-out",
        boxShadow: isHovering
          ? `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${glowColor}`
          : "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Artist Image with strong duotone pop-art effect */}
      {artist.profileImageUrl && !imageError ? (
        <div className="absolute inset-0">
          {/* Background solid color layer */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: colorScheme.bg }}
          />

          {/* Artist image with duotone effect - grayscale then colorized */}
          <SafeImage
            src={artist.profileImageUrl}
            alt={artist.name}
            fill
            unoptimized
            className="object-cover object-top"
            style={{
              filter: `grayscale(100%) contrast(1.2) brightness(1.1)`,
              mixBlendMode: "luminosity",
              opacity: 0.95,
              transform: isHovering ? "scale(1.1)" : "scale(1)",
              transition: "transform 0.5s ease-out",
            }}
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 33vw, 33vw"
            onError={() => setImageError(true)}
          />

          {/* Color tint overlay - creates the duotone effect */}
          <div
            className="absolute inset-0 mix-blend-multiply pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${colorScheme.highlight} 0%, ${colorScheme.bg} 50%, ${colorScheme.shadow} 100%)`,
              opacity: 0.85,
            }}
          />

          {/* Halftone-like texture overlay for pop-art feel */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle, ${colorScheme.shadow} 1px, transparent 1px)`,
              backgroundSize: '4px 4px',
            }}
          />
        </div>
      ) : (
        /* Fallback for artists without photos */
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${colorScheme.highlight} 0%, ${colorScheme.bg} 50%, ${colorScheme.shadow} 100%)`,
            }}
          />
          <span
            className="font-oswald text-6xl sm:text-7xl md:text-8xl font-black uppercase relative z-10"
            style={{
              color: colorScheme.shadow,
              textShadow: `2px 2px 0px ${colorScheme.highlight}`,
              transform: "translateZ(30px)",
            }}
          >
            {artist.name.charAt(0)}
          </span>
        </div>
      )}

      {/* 3D Glare Effect */}
      {isHovering && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.25) 0%, transparent 50%)`,
            mixBlendMode: "overlay",
          }}
        />
      )}

      {/* Name overlay - appears on hover with subtle gradient */}
      <div
        className="absolute inset-0 flex items-end justify-center pb-3 sm:pb-4 transition-all duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          transform: `translateZ(40px)`,
        }}
      >
        {/* Gradient backdrop */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        />
        <h3
          className="font-oswald text-sm sm:text-lg md:text-xl uppercase tracking-wider text-white text-center px-2 relative z-10 drop-shadow-lg"
          style={{
            transform: isHovering ? "translateY(0)" : "translateY(10px)",
            transition: "transform 0.3s ease-out",
          }}
        >
          {artist.name}
        </h3>
      </div>

      {/* Edge highlight for depth */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)`,
        }}
      />
    </Link>
  );
}

// Export for grid usage
export function ArtistCardCompact({ artist, index = 0 }: { artist: Artist; index?: number }) {
  return <ArtistCard artist={artist} index={index} />;
}
