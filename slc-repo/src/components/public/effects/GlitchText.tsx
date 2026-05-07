"use client";

import { useEffect, useState } from "react";

interface GlitchTextProps {
  text: string;
  className?: string;
  glitchColor1?: string;
  glitchColor2?: string;
}

export function GlitchText({
  text,
  className = "",
}: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setIsGlitching(true);
      setOffset({
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 2,
      });
      setTimeout(() => {
        setIsGlitching(false);
        setOffset({ x: 0, y: 0 });
      }, 150);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <span className={`relative inline-block ${className}`}>
      <span
        className="absolute inset-0 text-white/5 blur-[2px]"
        style={{ transform: "translate(4px, 4px)" }}
        aria-hidden="true"
      >
        {text}
      </span>
      <span
        className="absolute inset-0 text-white/10 blur-[1px]"
        style={{ transform: "translate(2px, 2px)" }}
        aria-hidden="true"
      >
        {text}
      </span>
      <span
        className="relative z-10 transition-transform duration-75"
        style={{
          transform: isGlitching ? `translate(${offset.x}px, ${offset.y}px)` : "none",
          textShadow: isGlitching
            ? "0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.3)"
            : "0 0 30px rgba(255,255,255,0.1)",
        }}
      >
        {text}
      </span>
      {isGlitching && (
        <>
          <span
            className="absolute inset-0 z-20 text-white"
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 33%, 0 33%)",
              transform: `translate(${-offset.x * 0.5}px, 0)`,
              opacity: 0.9,
              filter: "blur(0.5px)",
            }}
            aria-hidden="true"
          >
            {text}
          </span>
          <span
            className="absolute inset-0 z-20 text-white"
            style={{
              clipPath: "polygon(0 67%, 100% 67%, 100% 100%, 0 100%)",
              transform: `translate(${offset.x * 0.5}px, 0)`,
              opacity: 0.9,
              filter: "blur(0.5px)",
            }}
            aria-hidden="true"
          >
            {text}
          </span>
        </>
      )}
    </span>
  );
}

// Shimmer text effect - continuous shine sweep
export function ShimmerText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={`relative inline-block ${className}`}>
      {/* Shadow for depth */}
      <span
        className="absolute inset-0 text-white/5 blur-sm"
        style={{ transform: "translate(3px, 3px)" }}
        aria-hidden="true"
      >
        {text}
      </span>

      {/* Base text */}
      <span
        className="relative z-10"
        style={{
          textShadow: "0 0 40px rgba(255,255,255,0.15), 0 0 80px rgba(255,255,255,0.05)",
        }}
      >
        {text}
      </span>

      {/* Shimmer sweep overlay */}
      <span
        className="absolute inset-0 z-20 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <span
          className="absolute inset-0 animate-shimmer-sweep"
          style={{
            background: "linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%, transparent 100%)",
            backgroundSize: "200% 100%",
          }}
        />
      </span>

      <style jsx>{`
        @keyframes shimmer-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer-sweep {
          animation: shimmer-sweep 3s ease-in-out infinite;
        }
      `}</style>
    </span>
  );
}

// Letter-by-letter reveal effect
export function RevealText({
  text,
  className = "",
  delay = 0,
  staggerMs = 50,
}: {
  text: string;
  className?: string;
  delay?: number;
  staggerMs?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      // After reveal completes, mark as revealed for shimmer
      setTimeout(() => setHasRevealed(true), text.length * staggerMs + 500);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, text.length, staggerMs]);

  return (
    <span className={`relative inline-block ${className}`}>
      {/* Shadow layer */}
      <span
        className="absolute inset-0 text-white/5 blur-sm pointer-events-none"
        style={{ transform: "translate(3px, 3px)" }}
        aria-hidden="true"
      >
        {text}
      </span>

      {/* Letters */}
      <span className="relative z-10">
        {text.split("").map((char, index) => (
          <span
            key={index}
            className="inline-block transition-all duration-500 ease-out"
            style={{
              transform: isVisible ? "translateY(0) rotateX(0)" : "translateY(100%) rotateX(-90deg)",
              opacity: isVisible ? 1 : 0,
              transitionDelay: `${index * staggerMs}ms`,
              textShadow: hasRevealed ? "0 0 30px rgba(255,255,255,0.2)" : "none",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </span>

      {/* Shimmer after reveal */}
      {hasRevealed && (
        <span
          className="absolute inset-0 z-20 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <span
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%, transparent 100%)",
              animation: "shimmer-sweep 4s ease-in-out infinite 1s",
            }}
          />
        </span>
      )}

      <style jsx>{`
        @keyframes shimmer-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </span>
  );
}

// Typewriter effect - types out letter by letter
export function TypewriterText({
  text,
  className = "",
  delay = 0,
  speed = 80,
}: {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
}) {
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      let index = 0;
      const typeInterval = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(typeInterval);
          // Blink cursor then hide
          setTimeout(() => setShowCursor(false), 2000);
        }
      }, speed);

      return () => clearInterval(typeInterval);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [text, delay, speed]);

  return (
    <span className={`relative inline-block ${className}`}>
      <span>{displayText}</span>
      {showCursor && (
        <span className="inline-block w-[3px] h-[1em] bg-primary ml-1 animate-pulse" />
      )}
    </span>
  );
}
