"use client";

import { Button } from "@/components/ui/button";
import { proxyImageUrl } from "@/hooks/use-proxied-image";
import {
  AlertCircle,
  Check,
  CheckCircle,
  ClipboardCopy,
  Copy,
  Download,
  ExternalLink,
  Instagram,
  Loader2,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ===========================================
// TYPES
// ===========================================

interface BeatData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  producerName: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  tags: string[] | null;
  duration: number | null;
  coverImageUrl: string | null;
  isFree: boolean;
  price: number | null;
}

interface BeatStoryCardProps {
  beat: BeatData;
  onClose: () => void;
}

type FormatTab = "story" | "post" | "reel";

// ===========================================
// SOCIAL MEDIA ICONS
// ===========================================

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ===========================================
// CANVAS HELPERS
// ===========================================

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const testLine = line + (line ? " " : "") + word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = testLine;
    }
  }
  if (lines.length < maxLines && line) {
    lines.push(line);
  }

  if (lines.length === maxLines && line) {
    const lastLine = lines[maxLines - 1];
    if (ctx.measureText(`${lastLine}...`).width > maxWidth) {
      let truncated = lastLine;
      while (
        ctx.measureText(`${truncated}...`).width > maxWidth &&
        truncated.length > 0
      ) {
        truncated = truncated.slice(0, -1);
      }
      lines[maxLines - 1] = `${truncated}...`;
    }
  }

  return lines;
}

async function loadOswaldFont(): Promise<void> {
  try {
    await document.fonts.load("bold 52px 'Oswald'");
    await document.fonts.load("bold 28px 'Oswald'");
    await document.fonts.load("18px 'Oswald'");
    await document.fonts.load("bold 24px 'Oswald'");
    await document.fonts.load("bold 42px 'Oswald'");
    await document.fonts.load("bold 48px 'Oswald'");
  } catch {
    // Font may not be available, fallback to sans-serif
  }
}

async function loadCoverImage(
  coverImageUrl: string | null,
): Promise<HTMLImageElement | null> {
  if (!coverImageUrl) return null;
  try {
    const { src: proxiedUrl } = proxyImageUrl(coverImageUrl);
    const coverImg = new Image();
    const isSameOrigin = proxiedUrl.startsWith("/");
    if (!isSameOrigin) {
      coverImg.crossOrigin = "anonymous";
    }
    coverImg.src = proxiedUrl;
    await new Promise<void>((resolve, reject) => {
      coverImg.onload = () => resolve();
      coverImg.onerror = () => reject(new Error("Image failed"));
      setTimeout(() => reject(new Error("Image timeout")), 8000);
    });
    return coverImg;
  } catch {
    return null;
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Draw a waveform visualization
function drawWaveform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  barCount = 40,
) {
  const barWidth = (width / barCount) * 0.6;
  const gap = (width / barCount) * 0.4;
  // Use a seeded pseudo-random based on bar index for consistency
  const seed = 42;

  for (let i = 0; i < barCount; i++) {
    const pseudoRandom = Math.sin(seed + i * 127.1) * 0.5 + 0.5;
    const barHeight = height * (0.2 + pseudoRandom * 0.8);
    const barX = x + i * (barWidth + gap);
    const barY = y + (height - barHeight) / 2;

    const grad = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
    grad.addColorStop(0, "rgba(168, 85, 247, 0.9)");
    grad.addColorStop(1, "rgba(236, 72, 153, 0.7)");
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, barWidth / 2);
    ctx.fill();
  }
}

// ===========================================
// CANVAS GENERATORS
// ===========================================

// --- STORY: 1080x1920 (9:16) ---
async function generateStoryCard(
  canvas: HTMLCanvasElement,
  beat: BeatData,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  await loadOswaldFont();

  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;

  // --- Background: dark gradient ---
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#0a0a0a");
  bgGrad.addColorStop(0.5, "#111111");
  bgGrad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const coverImg = await loadCoverImage(beat.coverImageUrl);

  // --- Draw blurred cover as background accent (top portion) ---
  if (coverImg) {
    ctx.save();
    ctx.filter = "blur(60px) brightness(0.3)";
    const imgAspect = coverImg.width / coverImg.height;
    let drawW = W + 200;
    let drawH = drawW / imgAspect;
    if (drawH < H * 0.6) {
      drawH = H * 0.6;
      drawW = drawH * imgAspect;
    }
    ctx.drawImage(coverImg, (W - drawW) / 2, 0, drawW, drawH);
    ctx.restore();
  }

  // --- Gradient overlay ---
  const overlayGrad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  overlayGrad.addColorStop(0, "rgba(10,10,10,0.5)");
  overlayGrad.addColorStop(1, "rgba(10,10,10,1)");
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, W, H * 0.6);

  // --- Top branding ---
  ctx.textAlign = "center";
  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 28px 'Oswald', sans-serif";
  const brandText = "SONIDO LÍQUIDO";
  let brandX = W / 2 - ctx.measureText(brandText).width / 2 + 12;
  ctx.textAlign = "left";
  for (const char of brandText) {
    ctx.fillText(char, brandX, 120);
    brandX += ctx.measureText(char).width + 4;
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "18px 'Oswald', sans-serif";
  ctx.fillText("BEATS", W / 2, 155);

  // --- Center cover image ---
  const coverSize = 680;
  const coverX = (W - coverSize) / 2;
  const coverY = 220;
  const radius = 24;

  ctx.save();
  drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, radius);
  ctx.clip();

  if (coverImg) {
    const imgAspect = coverImg.width / coverImg.height;
    let drawW = coverSize;
    let drawH = coverSize;
    if (imgAspect > 1) {
      drawW = coverSize * imgAspect;
    } else {
      drawH = coverSize / imgAspect;
    }
    ctx.drawImage(
      coverImg,
      coverX + (coverSize - drawW) / 2,
      coverY + (coverSize - drawH) / 2,
      drawW,
      drawH,
    );
  } else {
    const placeholderGrad = ctx.createLinearGradient(
      coverX,
      coverY,
      coverX + coverSize,
      coverY + coverSize,
    );
    placeholderGrad.addColorStop(0, "#1a1a2e");
    placeholderGrad.addColorStop(1, "#16213e");
    ctx.fillStyle = placeholderGrad;
    ctx.fillRect(coverX, coverY, coverSize, coverSize);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.font = "120px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\u266B", coverX + coverSize / 2, coverY + coverSize / 2 + 40);
  }
  ctx.restore();

  // --- Border around cover ---
  ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, radius);
  ctx.stroke();

  // --- Beat title ---
  const textY = coverY + coverSize + 60;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px 'Oswald', sans-serif";

  const title = beat.title.toUpperCase();
  const maxWidth = W - 120;
  const words = title.split(" ");
  let line = "";
  let lineY = textY;
  const lineHeight = 62;

  for (const word of words) {
    const testLine = line + (line ? " " : "") + word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, W / 2, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, W / 2, lineY);

  // --- Producer name ---
  let metaY = lineY + 50;
  if (beat.producerName) {
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
    ctx.fillText(`Prod. ${beat.producerName}`, W / 2, metaY);
    metaY += 40;
  }

  // --- Beat metadata tags ---
  ctx.font = "22px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";

  const metaParts: string[] = [];
  if (beat.bpm) metaParts.push(`${beat.bpm} BPM`);
  if (beat.key) metaParts.push(beat.key);
  if (beat.genre) metaParts.push(beat.genre);

  if (metaParts.length > 0) {
    ctx.fillText(metaParts.join("  \u2022  "), W / 2, metaY);
    metaY += 40;
  }

  // --- Price / Free badge ---
  if (beat.isFree) {
    ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("GRATIS", W / 2, metaY);
    metaY += 40;
  } else if (beat.price) {
    ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(`$${beat.price} USD`, W / 2, metaY);
    metaY += 40;
  }

  // --- Description ---
  if (beat.description) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "20px sans-serif";
    const descLines = wrapText(ctx, beat.description, W - 160, 2);
    descLines.forEach((l, i) => {
      ctx.fillText(l, W / 2, metaY + i * 30);
    });
  }

  // --- Waveform visualization ---
  const waveY = H - 380;
  drawWaveform(ctx, 80, waveY, W - 160, 60);

  // --- Bottom section ---
  const bottomY = H - 200;

  const sepGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
  sepGrad.addColorStop(0, "rgba(168,85,247,0)");
  sepGrad.addColorStop(0.5, "rgba(168,85,247,0.5)");
  sepGrad.addColorStop(1, "rgba(168,85,247,0)");
  ctx.fillStyle = sepGrad;
  ctx.fillRect(W * 0.2, bottomY, W * 0.6, 1);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "22px monospace";
  ctx.fillText(`sonidoliquido.com/beats/${beat.slug}`, W / 2, bottomY + 40);

  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 20px 'Oswald', sans-serif";
  ctx.fillText("SONIDO LÍQUIDO CREW", W / 2, bottomY + 80);

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "16px sans-serif";
  ctx.fillText("Toca para escuchar el beat", W / 2, bottomY + 120);
}

// --- POST: 1080x1080 (1:1 square) ---
async function generatePostCard(
  canvas: HTMLCanvasElement,
  beat: BeatData,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  await loadOswaldFont();

  const W = 1080;
  const H = 1080;
  canvas.width = W;
  canvas.height = H;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#0a0a0a");
  bgGrad.addColorStop(1, "#111111");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const coverImg = await loadCoverImage(beat.coverImageUrl);

  // Blurred background
  if (coverImg) {
    ctx.save();
    ctx.filter = "blur(40px) brightness(0.25)";
    const imgAspect = coverImg.width / coverImg.height;
    let drawW = W + 100;
    let drawH = drawW / imgAspect;
    if (drawH < H) {
      drawH = H;
      drawW = drawH * imgAspect;
    }
    ctx.drawImage(coverImg, (W - drawW) / 2, (H - drawH) / 2, drawW, drawH);
    ctx.restore();
  }

  // Dark overlay
  ctx.fillStyle = "rgba(10,10,10,0.7)";
  ctx.fillRect(0, 0, W, H);

  // Cover image - centered square
  const coverSize = 460;
  const coverX = (W - coverSize) / 2;
  const coverY = 60;
  const radius = 16;

  ctx.save();
  drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, radius);
  ctx.clip();

  if (coverImg) {
    const imgAspect = coverImg.width / coverImg.height;
    let drawW = coverSize;
    let drawH = coverSize;
    if (imgAspect > 1) {
      drawW = coverSize * imgAspect;
    } else {
      drawH = coverSize / imgAspect;
    }
    ctx.drawImage(
      coverImg,
      coverX + (coverSize - drawW) / 2,
      coverY + (coverSize - drawH) / 2,
      drawW,
      drawH,
    );
  } else {
    const placeholderGrad = ctx.createLinearGradient(
      coverX,
      coverY,
      coverX + coverSize,
      coverY + coverSize,
    );
    placeholderGrad.addColorStop(0, "#1a1a2e");
    placeholderGrad.addColorStop(1, "#16213e");
    ctx.fillStyle = placeholderGrad;
    ctx.fillRect(coverX, coverY, coverSize, coverSize);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\u266B", coverX + coverSize / 2, coverY + coverSize / 2 + 30);
  }
  ctx.restore();

  // Border
  ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, radius);
  ctx.stroke();

  // Title
  const textY = coverY + coverSize + 50;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px 'Oswald', sans-serif";

  const title = beat.title.toUpperCase();
  const maxWidth = W - 120;
  const words = title.split(" ");
  let line = "";
  let lineY = textY;
  const lineHeight = 50;

  for (const word of words) {
    const testLine = line + (line ? " " : "") + word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, W / 2, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, W / 2, lineY);

  // Producer name
  let metaY = lineY + 36;
  if (beat.producerName) {
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
    ctx.fillText(`Prod. ${beat.producerName}`, W / 2, metaY);
    metaY += 30;
  }

  // Metadata
  const metaParts: string[] = [];
  if (beat.bpm) metaParts.push(`${beat.bpm} BPM`);
  if (beat.key) metaParts.push(beat.key);
  if (beat.genre) metaParts.push(beat.genre);

  if (metaParts.length > 0) {
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(metaParts.join("  \u2022  "), W / 2, metaY);
    metaY += 28;
  }

  // Free / Price badge
  if (beat.isFree) {
    ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("GRATIS", W / 2, metaY);
  } else if (beat.price) {
    ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(`$${beat.price} USD`, W / 2, metaY);
  }

  // Waveform
  const waveY = H - 140;
  drawWaveform(ctx, 80, waveY, W - 160, 40, 30);

  // Bottom branding
  const bottomY = H - 50;
  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 16px 'Oswald', sans-serif";
  ctx.fillText("SONIDO LÍQUIDO CREW", W / 2, bottomY - 10);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "14px monospace";
  ctx.fillText(`sonidoliquido.com/beats/${beat.slug}`, W / 2, bottomY + 8);
}

// --- REEL: 1080x1920 (9:16 with audio CTA) ---
async function generateReelCard(
  canvas: HTMLCanvasElement,
  beat: BeatData,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  await loadOswaldFont();

  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#0a0a0a");
  bgGrad.addColorStop(0.5, "#111111");
  bgGrad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const coverImg = await loadCoverImage(beat.coverImageUrl);

  // Blurred background
  if (coverImg) {
    ctx.save();
    ctx.filter = "blur(60px) brightness(0.3)";
    const imgAspect = coverImg.width / coverImg.height;
    let drawW = W + 200;
    let drawH = drawW / imgAspect;
    if (drawH < H * 0.6) {
      drawH = H * 0.6;
      drawW = drawH * imgAspect;
    }
    ctx.drawImage(coverImg, (W - drawW) / 2, 0, drawW, drawH);
    ctx.restore();
  }

  // Dark overlay
  const overlayGrad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  overlayGrad.addColorStop(0, "rgba(10,10,10,0.5)");
  overlayGrad.addColorStop(1, "rgba(10,10,10,1)");
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, W, H * 0.6);

  // Reel-specific: vertical video overlay graphic (top & bottom bars)
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(0, 0, W, 80);
  ctx.fillRect(0, H - 160, W, 160);

  // Reel top bar UI mock
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Reels", W / 2, 52);

  // Camera icon placeholder
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "24px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("\uD83D\uDCF7", 40, 55);
  ctx.textAlign = "right";
  ctx.fillText("\uD83D\uDCAC", W - 40, 55);

  // Top branding
  ctx.textAlign = "center";
  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 24px 'Oswald', sans-serif";
  ctx.fillText("SONIDO LÍQUIDO", W / 2, 160);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "16px 'Oswald', sans-serif";
  ctx.fillText("BEATS", W / 2, 185);

  // Cover image
  const coverSize = 620;
  const coverX = (W - coverSize) / 2;
  const coverY = 230;
  const radius = 20;

  ctx.save();
  drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, radius);
  ctx.clip();

  if (coverImg) {
    const imgAspect = coverImg.width / coverImg.height;
    let drawW = coverSize;
    let drawH = coverSize;
    if (imgAspect > 1) {
      drawW = coverSize * imgAspect;
    } else {
      drawH = coverSize / imgAspect;
    }
    ctx.drawImage(
      coverImg,
      coverX + (coverSize - drawW) / 2,
      coverY + (coverSize - drawH) / 2,
      drawW,
      drawH,
    );
  } else {
    const placeholderGrad = ctx.createLinearGradient(
      coverX,
      coverY,
      coverX + coverSize,
      coverY + coverSize,
    );
    placeholderGrad.addColorStop(0, "#1a1a2e");
    placeholderGrad.addColorStop(1, "#16213e");
    ctx.fillStyle = placeholderGrad;
    ctx.fillRect(coverX, coverY, coverSize, coverSize);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.font = "100px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\u266B", coverX + coverSize / 2, coverY + coverSize / 2 + 30);
  }
  ctx.restore();

  // Play button overlay on cover
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.arc(W / 2, coverY + coverSize / 2, 60, 0, Math.PI * 2);
  ctx.fill();
  // Triangle play icon
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.moveTo(W / 2 - 20, coverY + coverSize / 2 - 30);
  ctx.lineTo(W / 2 - 20, coverY + coverSize / 2 + 30);
  ctx.lineTo(W / 2 + 30, coverY + coverSize / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Border
  ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, radius);
  ctx.stroke();

  // Title
  const textY = coverY + coverSize + 60;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px 'Oswald', sans-serif";

  const title = beat.title.toUpperCase();
  const maxWidth = W - 120;
  const words = title.split(" ");
  let line = "";
  let lineY = textY;
  const lineHeight = 58;

  for (const word of words) {
    const testLine = line + (line ? " " : "") + word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, W / 2, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, W / 2, lineY);

  // Producer name
  let metaY = lineY + 45;
  if (beat.producerName) {
    ctx.font = "22px sans-serif";
    ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
    ctx.fillText(`Prod. ${beat.producerName}`, W / 2, metaY);
    metaY += 35;
  }

  // Metadata
  const metaParts: string[] = [];
  if (beat.bpm) metaParts.push(`${beat.bpm} BPM`);
  if (beat.key) metaParts.push(beat.key);
  if (beat.genre) metaParts.push(beat.genre);

  if (metaParts.length > 0) {
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(metaParts.join("  \u2022  "), W / 2, metaY);
    metaY += 35;
  }

  // "Escuchar Beat" CTA - bottom area
  const ctaY = H - 280;

  // Waveform above CTA
  drawWaveform(ctx, 140, ctaY - 80, W - 280, 50, 35);

  // CTA pill button
  const ctaWidth = 500;
  const ctaHeight = 70;
  const ctaX = (W - ctaWidth) / 2;

  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaWidth, ctaY);
  ctaGrad.addColorStop(0, "#a855f7");
  ctaGrad.addColorStop(1, "#ec4899");
  ctx.fillStyle = ctaGrad;
  drawRoundedRect(ctx, ctaX, ctaY, ctaWidth, ctaHeight, ctaHeight / 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px 'Oswald', sans-serif";
  ctx.fillText("\u25B6 ESCUCHAR BEAT", W / 2, ctaY + 45);

  // Free badge
  if (beat.isFree) {
    const badgeY = ctaY + ctaHeight + 30;
    const badgeW = 160;
    const badgeH = 36;
    const badgeX = (W - badgeW) / 2;
    ctx.fillStyle = "rgba(34, 197, 94, 0.8)";
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Oswald', sans-serif";
    ctx.fillText("GRATIS", W / 2, badgeY + 25);
  }

  // Reel bottom UI mock
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "18px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("\u2764\uFE0F", 40, H - 100);
  ctx.fillText("\uD83D\uDCAC", 40, H - 60);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "16px monospace";
  ctx.fillText(`sonidoliquido.com/beats/${beat.slug}`, W / 2, H - 30);
}

// ===========================================
// GENERATOR MAP
// ===========================================

const GENERATORS: Record<
  FormatTab,
  (canvas: HTMLCanvasElement, beat: BeatData) => Promise<void>
> = {
  story: generateStoryCard,
  post: generatePostCard,
  reel: generateReelCard,
};

const FORMAT_LABELS: Record<FormatTab, { label: string; aspect: string }> = {
  story: { label: "Story", aspect: "9/16" },
  post: { label: "Post", aspect: "1/1" },
  reel: { label: "Reel", aspect: "9/16" },
};

const FILE_SUFFIX: Record<FormatTab, string> = {
  story: "story",
  post: "post",
  reel: "reel",
};

// ===========================================
// BEAT STORY CARD COMPONENT
// ===========================================

// Detect if user is on a mobile device
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent,
  );
}

export function BeatStoryCard({ beat, onClose }: BeatStoryCardProps) {
  const [selectedFormat, setSelectedFormat] = useState<FormatTab>("story");
  const [generating, setGenerating] = useState(false);
  const [cardGenerated, setCardGenerated] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fullResCanvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = isMobileDevice();

  // Generate the card when format changes or on mount
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    setCardGenerated(false);
    setGenerating(true);
    GENERATORS[selectedFormat](canvas, beat)
      .then(() => {
        setCardGenerated(true);
        // Also generate on the full-res canvas for sharing
        if (fullResCanvasRef.current) {
          return GENERATORS[selectedFormat](fullResCanvasRef.current, beat);
        }
      })
      .catch((err) => {
        console.error("Failed to generate card:", err);
      })
      .finally(() => {
        setGenerating(false);
      });
  }, [beat, selectedFormat]);

  // Helper: safely get canvas blob (handles tainted canvas)
  const getCanvasBlob = useCallback(
    async (canvas: HTMLCanvasElement): Promise<Blob | null> => {
      try {
        return await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png", 1.0),
        );
      } catch (err) {
        console.error("Canvas tainted, cannot extract blob:", err);
        setShareError("No se pudo generar la imagen. Intenta descargarla.");
        return null;
      }
    },
    [],
  );

  // Download the card
  const downloadCard = useCallback(async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const blob = await getCanvasBlob(canvas);
    if (!blob) {
      setShareError(
        "No se pudo descargar. La imagen de portada tiene restricciones de seguridad.",
      );
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${beat.slug || beat.id}-${FILE_SUFFIX[selectedFormat]}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [beat.slug, beat.id, selectedFormat, getCanvasBlob]);

  // Download and open Instagram web
  const downloadAndOpenInstagram = useCallback(async () => {
    await downloadCard();
    window.open("https://www.instagram.com/", "_blank");
  }, [downloadCard]);

  // Copy image to clipboard (for pasting into Instagram web)
  const copyImageToClipboard = useCallback(async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    setShareError(null);

    try {
      const blob = await getCanvasBlob(canvas);
      if (!blob) return;

      // Try the modern Clipboard API with image support
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        try {
          const clipboardItem = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([clipboardItem]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 3000);
          return;
        } catch {
          // Clipboard API doesn't support images on this browser
        }
      }

      // Fallback: copy the link instead
      setShareError(
        "Tu navegador no soporta copiar imágenes. Descarga la imagen y súbelo manualmente.",
      );
    } catch (err) {
      console.error("Copy image failed:", err);
      setShareError("No se pudo copiar la imagen. Intenta descargarla.");
    }
  }, [getCanvasBlob]);

  // Share the card (via Web Share API — only useful on mobile)
  const shareCard = useCallback(async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    setShareError(null);

    try {
      const blob = await getCanvasBlob(canvas);
      if (!blob) return;

      const file = new File(
        [blob],
        `${beat.slug || beat.id}-${FILE_SUFFIX[selectedFormat]}.png`,
        { type: "image/png" },
      );

      const beatShareUrl = `https://sonidoliquido.com/beats/${beat.slug}`;

      // Try Web Share API with file (shows Instagram Stories, Facebook, etc. on mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: beat.title,
            text: `Escucha "${beat.title}" en Sonido Líquido Crew`,
            url: beatShareUrl,
            files: [file],
          });
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }

      // Fallback: try text-only Web Share
      if (navigator.share) {
        try {
          await navigator.share({
            title: beat.title,
            text: `Escucha "${beat.title}" en Sonido Líquido Crew`,
            url: beatShareUrl,
          });
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }

      // Desktop fallback: download the image
      downloadCard();
    } catch (err) {
      console.error("Share failed:", err);
      setShareError("No se pudo compartir. Intenta descargar la imagen.");
    }
  }, [beat, selectedFormat, downloadCard, getCanvasBlob]);

  // Share directly to Instagram Stories (mobile — Web Share API with files)
  const shareToInstagramStory = useCallback(async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    setShareError(null);

    try {
      const blob = await getCanvasBlob(canvas);
      if (!blob) return;

      const file = new File([blob], `${beat.slug || beat.id}-story.png`, {
        type: "image/png",
      });

      // On mobile: use Web Share API with file (works on iOS & Android)
      if (isMobile) {
        // Primary: Web Share API with files — shows system share sheet with Instagram option
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              text: `Escucha "${beat.title}" en Sonido Líquido Crew`,
              files: [file],
            });
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 2000);
            return;
          } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") return; // user cancelled
            // Web Share API failed, fall through to URL scheme
          }
        }

        // Fallback: try instagram-stories:// URL scheme (only works on some iOS devices)
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isIOS) {
          try {
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            const instagramUrl = `instagram-stories://share?background_image=${encodeURIComponent(dataUrl)}`;
            window.location.href = instagramUrl;

            setTimeout(() => {
              if (document.visibilityState === "visible") {
                setShareError(
                  "No se pudo abrir Instagram. Descarga la imagen y compártela manualmente.",
                );
              }
            }, 2000);
            return;
          } catch {
            // URL scheme failed, fall through
          }
        }

        // Final fallback on mobile: download the image with instructions
        await downloadCard();
        setShareError(
          "Descarga la imagen y ábrela en Instagram para subirla a tu Story.",
        );
      } else {
        // On desktop: download and open instagram.com
        await downloadCard();
        window.open("https://www.instagram.com/", "_blank");
      }
    } catch (err) {
      console.error("Instagram Story share failed:", err);
      setShareError(
        "No se pudo compartir en Instagram. Intenta descargar la imagen.",
      );
    }
  }, [getCanvasBlob, isMobile, downloadCard, beat.slug, beat.id, beat.title]);

  // Social share helpers
  const beatShareUrl = `https://sonidoliquido.com/beats/${beat.slug}`;
  const encodedUrl = encodeURIComponent(beatShareUrl);
  const encodedTitle = encodeURIComponent(
    `Escucha "${beat.title}" en Sonido Líquido Crew`,
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(beatShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  // Get aspect ratio for preview
  const aspectStyle =
    selectedFormat === "post"
      ? { aspectRatio: "1/1", maxHeight: "50vh" }
      : { aspectRatio: "9/16", maxHeight: "60vh" };

  // Format-specific labels for instructions
  const formatLabel =
    selectedFormat === "post"
      ? "publicación"
      : selectedFormat === "reel"
        ? "reel"
        : "historia";

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-3 max-h-[95vh] w-full max-w-md py-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Title */}
        <h2 className="font-oswald text-lg uppercase text-white flex items-center gap-2">
          <Share2 className="w-5 h-5 text-purple-400" />
          Compartir Beat
        </h2>

        {/* Format Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(["story", "post", "reel"] as FormatTab[]).map((format) => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format)}
              className={`px-4 py-1.5 rounded-md text-sm font-oswald uppercase transition-all ${
                selectedFormat === format
                  ? "bg-purple-600 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {FORMAT_LABELS[format].label}
            </button>
          ))}
        </div>

        {/* Preview canvas */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20 border border-white/10 mx-auto"
          style={aspectStyle}
        >
          <canvas
            ref={previewCanvasRef}
            className="w-full h-full object-contain"
            style={aspectStyle}
          />
          {generating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
          )}
        </div>

        {/* ============ PRIMARY ACTION BUTTONS ============ */}

        {isMobile ? (
          /* === MOBILE LAYOUT === */
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button
              onClick={shareCard}
              disabled={generating || !cardGenerated}
              className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white gap-2"
              size="sm"
            >
              {shareSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Compartido
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Compartir
                </>
              )}
            </Button>
            <Button
              onClick={shareToInstagramStory}
              disabled={generating || !cardGenerated}
              className="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white gap-2"
              size="sm"
            >
              <Instagram className="w-4 h-4" />
              Story
            </Button>
            <Button
              onClick={downloadCard}
              disabled={generating || !cardGenerated}
              className="bg-white/10 hover:bg-white/20 text-white gap-2"
              variant="ghost"
              size="sm"
            >
              <Download className="w-4 h-4" />
              Descargar
            </Button>
          </div>
        ) : (
          /* === DESKTOP LAYOUT === */
          <div className="w-full space-y-2">
            {/* Primary CTA: Download + Open Instagram */}
            <Button
              onClick={downloadAndOpenInstagram}
              disabled={generating || !cardGenerated}
              className="w-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white gap-2 h-11"
              size="default"
            >
              <Download className="w-4 h-4" />
              Descargar y Abrir Instagram
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Button>

            {/* Secondary: Copy image to clipboard */}
            <Button
              onClick={copyImageToClipboard}
              disabled={generating || !cardGenerated}
              className="w-full bg-white/10 hover:bg-white/20 text-white gap-2 border border-white/10"
              variant="ghost"
              size="default"
            >
              {copiedImage ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Imagen Copiada — Pega en Instagram
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-4 h-4" />
                  Copiar Imagen al Portapapeles
                </>
              )}
            </Button>

            {/* Desktop step-by-step instructions */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1.5">
              <p className="text-xs text-white/60 font-oswald uppercase tracking-wide">
                Como compartir en {formatLabel}:
              </p>
              <div className="flex items-start gap-2 text-xs text-white/50">
                <span className="bg-purple-600/30 text-purple-300 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold">
                  1
                </span>
                <span>
                  Da clic en{" "}
                  <strong className="text-white/70">
                    Descargar y Abrir Instagram
                  </strong>
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-white/50">
                <span className="bg-purple-600/30 text-purple-300 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold">
                  2
                </span>
                <span>
                  En Instagram, crea una nueva {formatLabel} (icono +)
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-white/50">
                <span className="bg-purple-600/30 text-purple-300 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold">
                  3
                </span>
                <span>Selecciona la imagen descargada y publicala</span>
              </div>
              <p className="text-[10px] text-white/30 pt-1 border-t border-white/5">
                Tip: Tambien puedes usar{" "}
                <strong className="text-white/50">Copiar Imagen</strong> y pegar
                directamente con Ctrl+V
              </p>
            </div>
          </div>
        )}

        {/* Share error message */}
        {shareError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs max-w-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {shareError}
          </div>
        )}

        {/* ============ SOCIAL SHARE BUTTONS ============ */}
        <div className="flex items-center gap-2">
          <a
            href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-[#25D366] hover:border-[#25D366] hover:text-white transition-all"
            title="WhatsApp"
          >
            <WhatsAppIcon className="w-5 h-5" />
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-black hover:border-black hover:text-white transition-all"
            title="X / Twitter"
          >
            <TwitterIcon className="w-5 h-5" />
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-[#1877F2] hover:border-[#1877F2] hover:text-white transition-all"
            title="Facebook"
          >
            <FacebookIcon className="w-5 h-5" />
          </a>
          <button
            onClick={copyLink}
            className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-purple-600 hover:border-purple-600 hover:text-white transition-all"
            title="Copiar enlace"
          >
            {copiedLink ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Hidden canvas for full-res generation */}
      <canvas ref={fullResCanvasRef} className="hidden" />
    </div>
  );
}
