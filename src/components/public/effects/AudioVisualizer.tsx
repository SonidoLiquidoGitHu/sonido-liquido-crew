"use client";

import { useEffect, useRef } from "react";

export function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Bar properties
    const barCount = 64;
    const bars: number[] = Array(barCount).fill(0);
    const targetBars: number[] = Array(barCount).fill(0);

    // Animation
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update target values randomly (simulating audio)
      for (let i = 0; i < barCount; i++) {
        if (Math.random() > 0.92) {
          targetBars[i] = Math.random() * 0.8 + 0.2;
        } else {
          targetBars[i] *= 0.95;
        }
        // Smooth interpolation
        bars[i] += (targetBars[i] - bars[i]) * 0.1;
      }

      const barWidth = canvas.width / barCount;
      const maxHeight = canvas.height * 0.4;

      // Draw bars from bottom
      for (let i = 0; i < barCount; i++) {
        const height = bars[i] * maxHeight;
        const x = i * barWidth;
        const y = canvas.height - height;

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
        gradient.addColorStop(0, "rgba(249, 115, 22, 0.6)"); // Primary orange
        gradient.addColorStop(0.5, "rgba(249, 115, 22, 0.3)");
        gradient.addColorStop(1, "rgba(249, 115, 22, 0.05)");

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y, barWidth - 2, height);
      }

      // Mirror effect at top (subtle)
      for (let i = 0; i < barCount; i++) {
        const height = bars[i] * maxHeight * 0.3;
        const x = i * barWidth;

        const gradient = ctx.createLinearGradient(x, 0, x, height);
        gradient.addColorStop(0, "rgba(249, 115, 22, 0.05)");
        gradient.addColorStop(1, "rgba(249, 115, 22, 0.15)");

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, 0, barWidth - 2, height);
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-40"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
