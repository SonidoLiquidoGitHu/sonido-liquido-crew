"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealDirection = "up" | "down" | "left" | "right" | "scale" | "fade";

interface ScrollRevealProps {
  children: ReactNode;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  threshold?: number;
  className?: string;
  once?: boolean;
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

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 700,
  distance = 50,
  threshold = 0.1,
  className = "",
  once = true,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for limited browser on mount
    const limited = isLimitedBrowser();
    setIsLimited(limited);

    // For limited browsers, show content immediately
    if (limited) {
      setIsVisible(true);
      return;
    }

    // Fallback timeout in case IntersectionObserver doesn't work
    const fallbackTimer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    // Skip if IntersectionObserver not available
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            setIsVisible(false);
          }
        });
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [threshold, once]);

  const getInitialStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      opacity: 0,
      transition: `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
    };

    switch (direction) {
      case "up":
        return { ...base, transform: `translateY(${distance}px)` };
      case "down":
        return { ...base, transform: `translateY(-${distance}px)` };
      case "left":
        return { ...base, transform: `translateX(${distance}px)` };
      case "right":
        return { ...base, transform: `translateX(-${distance}px)` };
      case "scale":
        return { ...base, transform: "scale(0.8)" };
      case "fade":
      default:
        return base;
    }
  };

  const getVisibleStyles = (): React.CSSProperties => ({
    opacity: 1,
    transform: "translateY(0) translateX(0) scale(1)",
  });

  return (
    <div
      ref={ref}
      className={className}
      style={isVisible || isLimited ? getVisibleStyles() : getInitialStyles()}
    >
      {children}
    </div>
  );
}

// Staggered children reveal
interface StaggerRevealProps {
  children: ReactNode[];
  direction?: RevealDirection;
  staggerDelay?: number;
  duration?: number;
  threshold?: number;
  className?: string;
  childClassName?: string;
}

export function StaggerReveal({
  children,
  direction = "up",
  staggerDelay = 100,
  duration = 600,
  threshold = 0.1,
  className = "",
  childClassName = "",
}: StaggerRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for limited browser on mount
    const limited = isLimitedBrowser();
    setIsLimited(limited);

    // For limited browsers, show content immediately
    if (limited) {
      setIsVisible(true);
      return;
    }

    // Fallback timeout
    const fallbackTimer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [threshold]);

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <ScrollReveal
          key={index}
          direction={direction}
          delay={index * staggerDelay}
          duration={duration}
          className={childClassName}
        >
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
}
