"use client";

import { useRef, useState, useCallback, type ReactNode, type CSSProperties } from "react";

interface Parallax3DProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  perspective?: number;
  scale?: number;
  glareEnabled?: boolean;
  glareColor?: string;
  borderGlow?: boolean;
  borderGlowColor?: string;
}

export function Parallax3D({
  children,
  className = "",
  intensity = 15,
  perspective = 1000,
  scale = 1.05,
  glareEnabled = true,
  glareColor = "rgba(255, 255, 255, 0.3)",
  borderGlow = true,
  borderGlowColor = "rgba(249, 115, 22, 0.5)",
}: Parallax3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<CSSProperties>({});
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate rotation based on mouse position relative to center
      const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * intensity;
      const rotateX = -((e.clientY - centerY) / (rect.height / 2)) * intensity;

      // Calculate glare position
      const glareX = ((e.clientX - rect.left) / rect.width) * 100;
      const glareY = ((e.clientY - rect.top) / rect.height) * 100;

      setTransform({
        transform: `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`,
        transition: "transform 0.1s ease-out",
      });

      setGlarePosition({ x: glareX, y: glareY });
    },
    [intensity, perspective, scale]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTransform({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
      transition: "transform 0.5s ease-out",
    });
    setGlarePosition({ x: 50, y: 50 });
  }, [perspective]);

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{
        transformStyle: "preserve-3d",
        ...transform,
        boxShadow: isHovering && borderGlow
          ? `0 20px 50px -10px rgba(0, 0, 0, 0.5), 0 0 30px ${borderGlowColor}`
          : "0 10px 30px -10px rgba(0, 0, 0, 0.3)",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* 3D Glare Effect */}
      {glareEnabled && isHovering && (
        <div
          className="absolute inset-0 pointer-events-none rounded-inherit overflow-hidden"
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, ${glareColor} 0%, transparent 60%)`,
            mixBlendMode: "overlay",
          }}
        />
      )}

      {/* Depth shadow layer */}
      {isHovering && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: "translateZ(-50px)",
            boxShadow: "0 30px 60px -20px rgba(0, 0, 0, 0.6)",
          }}
        />
      )}
    </div>
  );
}

// Wrapper for artist cards with 3D effect
interface Parallax3DCardProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

const glowColors = [
  "rgba(249, 115, 22, 0.5)", // Orange
  "rgba(34, 211, 238, 0.5)", // Cyan
  "rgba(74, 222, 128, 0.5)", // Green
  "rgba(251, 191, 36, 0.5)", // Yellow
  "rgba(244, 114, 182, 0.5)", // Pink
  "rgba(167, 139, 250, 0.5)", // Purple
];

export function Parallax3DCard({ children, className = "", index = 0 }: Parallax3DCardProps) {
  const glowColor = glowColors[index % glowColors.length];

  return (
    <Parallax3D
      className={className}
      intensity={12}
      scale={1.03}
      borderGlowColor={glowColor}
    >
      {children}
    </Parallax3D>
  );
}
