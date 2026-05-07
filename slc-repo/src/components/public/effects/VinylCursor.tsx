"use client";

import { useEffect, useState, useCallback } from "react";

interface CursorPosition {
  x: number;
  y: number;
}

export function VinylCursor() {
  const [position, setPosition] = useState<CursorPosition>({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
    if (!isVisible) setIsVisible(true);
  }, [isVisible]);

  const handleMouseEnter = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "A" ||
      target.tagName === "BUTTON" ||
      target.closest("a") ||
      target.closest("button") ||
      target.classList.contains("cursor-pointer") ||
      target.closest(".cursor-pointer")
    ) {
      setIsHovering(true);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsClicking(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsClicking(false);
  }, []);

  // Vinyl rotation animation
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setRotation((prev) => (prev + (isHovering ? 8 : 2)) % 360);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isHovering]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseover", handleMouseEnter);
    document.addEventListener("mouseout", handleMouseLeave);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseover", handleMouseEnter);
      document.removeEventListener("mouseout", handleMouseLeave);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseEnter, handleMouseLeave, handleMouseDown, handleMouseUp]);

  // Don't render on mobile/touch devices
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  return (
    <>
      {/* Hide default cursor globally */}
      <style jsx global>{`
        @media (pointer: fine) {
          * {
            cursor: none !important;
          }
        }
      `}</style>

      {/* Main vinyl cursor */}
      <div
        className="fixed pointer-events-none z-[9999] transition-transform duration-100"
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.85 : isHovering ? 1.3 : 1})`,
          opacity: isVisible ? 1 : 0,
        }}
      >
        {/* Vinyl record */}
        <div
          className="relative"
          style={{
            width: isHovering ? "48px" : "32px",
            height: isHovering ? "48px" : "32px",
            transition: "width 0.2s, height 0.2s",
          }}
        >
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(
                from ${rotation}deg,
                #1a1a1a 0deg,
                #333 30deg,
                #1a1a1a 60deg,
                #333 90deg,
                #1a1a1a 120deg,
                #333 150deg,
                #1a1a1a 180deg,
                #333 210deg,
                #1a1a1a 240deg,
                #333 270deg,
                #1a1a1a 300deg,
                #333 330deg,
                #1a1a1a 360deg
              )`,
              boxShadow: isHovering
                ? "0 0 20px rgba(249, 115, 22, 0.5), inset 0 0 10px rgba(0,0,0,0.5)"
                : "0 0 10px rgba(0,0,0,0.5), inset 0 0 5px rgba(0,0,0,0.3)",
              border: "2px solid #444",
            }}
          />

          {/* Groove rings */}
          <div
            className="absolute rounded-full"
            style={{
              inset: "15%",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              inset: "25%",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          />

          {/* Label center */}
          <div
            className="absolute rounded-full"
            style={{
              inset: "30%",
              background: isHovering
                ? "linear-gradient(135deg, #f97316, #ea580c)"
                : "linear-gradient(135deg, #f97316, #c2410c)",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {/* Label text/logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-1.5 h-1.5 rounded-full bg-black/50"
                style={{ boxShadow: "0 0 2px rgba(0,0,0,0.5)" }}
              />
            </div>
          </div>

          {/* Spindle hole */}
          <div
            className="absolute rounded-full bg-black"
            style={{
              inset: "45%",
              boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2)",
            }}
          />

          {/* Shine effect */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
            }}
          />
        </div>
      </div>

      {/* Trailing glow effect */}
      <div
        className="fixed pointer-events-none z-[9998] rounded-full transition-all duration-300"
        style={{
          left: position.x,
          top: position.y,
          width: isHovering ? "80px" : "50px",
          height: isHovering ? "80px" : "50px",
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, rgba(249, 115, 22, ${isHovering ? 0.3 : 0.1}) 0%, transparent 70%)`,
          opacity: isVisible ? 1 : 0,
        }}
      />
    </>
  );
}
