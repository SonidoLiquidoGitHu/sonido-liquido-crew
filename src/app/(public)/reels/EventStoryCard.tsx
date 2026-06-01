"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Instagram,
  Download,
  Share2,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { proxyImageUrl } from "@/hooks/use-proxied-image";

// ===========================================
// TYPES
// ===========================================

interface VideoEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  artistId: string | null;
  eventDate: Date | string | null;
  location: string | null;
  isPublished: boolean;
  displayOrder: number;
  videoCount: number;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

interface EventStoryCardProps {
  event: VideoEvent;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  generating: boolean;
  setGenerating: (v: boolean) => void;
}

// ===========================================
// CANVAS STORY CARD GENERATOR
// ===========================================

async function generateStoryCard(
  canvas: HTMLCanvasElement,
  event: VideoEvent
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Try to load Oswald font for canvas
  try {
    await document.fonts.load("bold 52px 'Oswald'");
    await document.fonts.load("bold 28px 'Oswald'");
    await document.fonts.load("18px 'Oswald'");
  } catch {
    // Font may not be available, fallback to sans-serif
  }

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

  // --- Load cover image ---
  let coverImg: HTMLImageElement | null = null;
  if (event.coverImageUrl) {
    try {
      const proxiedUrl = proxyImageUrl(event.coverImageUrl).src;
      coverImg = new Image();
      coverImg.crossOrigin = "anonymous";
      coverImg.src = proxiedUrl;
      await new Promise<void>((resolve, reject) => {
        coverImg!.onload = () => resolve();
        coverImg!.onerror = () => reject(new Error("Image failed"));
        // Timeout after 8s
        setTimeout(() => reject(new Error("Image timeout")), 8000);
      });
    } catch {
      coverImg = null;
    }
  }

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
    ctx.drawImage(
      coverImg,
      (W - drawW) / 2,
      0,
      drawW,
      drawH
    );
    ctx.restore();
  }

  // --- Gradient overlay to darken the blurred background ---
  const overlayGrad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  overlayGrad.addColorStop(0, "rgba(10,10,10,0.5)");
  overlayGrad.addColorStop(1, "rgba(10,10,10,1)");
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, W, H * 0.6);

  // --- Top branding ---
  ctx.textAlign = "center";
  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 28px 'Oswald', sans-serif";
  // Manual letter-spacing by drawing each character
  const brandText = "SONIDO LÍQUIDO";
  let brandX = W / 2 - (ctx.measureText(brandText).width / 2) + 12;
  ctx.textAlign = "left";
  for (const char of brandText) {
    ctx.fillText(char, brandX, 120);
    brandX += ctx.measureText(char).width + 4;
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "18px 'Oswald', sans-serif";
  ctx.fillText("HIP HOP MÉXICO", W / 2, 155);

  // --- Center cover image (album-art style with rounded corners) ---
  const coverSize = 680;
  const coverX = (W - coverSize) / 2;
  const coverY = 220;
  const radius = 24;

  // Draw rounded rect clip
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(coverX + radius, coverY);
  ctx.lineTo(coverX + coverSize - radius, coverY);
  ctx.quadraticCurveTo(coverX + coverSize, coverY, coverX + coverSize, coverY + radius);
  ctx.lineTo(coverX + coverSize, coverY + coverSize - radius);
  ctx.quadraticCurveTo(coverX + coverSize, coverY + coverSize, coverX + coverSize - radius, coverY + coverSize);
  ctx.lineTo(coverX + radius, coverY + coverSize);
  ctx.quadraticCurveTo(coverX, coverY + coverSize, coverX, coverY + coverSize - radius);
  ctx.lineTo(coverX, coverY + radius);
  ctx.quadraticCurveTo(coverX, coverY, coverX + radius, coverY);
  ctx.closePath();
  ctx.clip();

  if (coverImg) {
    // Draw image cover-fit
    const imgAspect = coverImg.width / coverImg.height;
    let drawW = coverSize;
    let drawH = coverSize;
    if (imgAspect > 1) {
      drawW = coverSize * imgAspect;
      drawH = coverSize;
    } else {
      drawW = coverSize;
      drawH = coverSize / imgAspect;
    }
    ctx.drawImage(
      coverImg,
      coverX + (coverSize - drawW) / 2,
      coverY + (coverSize - drawH) / 2,
      drawW,
      drawH
    );
  } else {
    // Placeholder gradient
    const placeholderGrad = ctx.createLinearGradient(coverX, coverY, coverX + coverSize, coverY + coverSize);
    placeholderGrad.addColorStop(0, "#1a1a2e");
    placeholderGrad.addColorStop(1, "#16213e");
    ctx.fillStyle = placeholderGrad;
    ctx.fillRect(coverX, coverY, coverSize, coverSize);
    // Placeholder icon
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.font = "120px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎬", coverX + coverSize / 2, coverY + coverSize / 2 + 40);
  }
  ctx.restore();

  // --- Border around cover ---
  ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(coverX + radius, coverY);
  ctx.lineTo(coverX + coverSize - radius, coverY);
  ctx.quadraticCurveTo(coverX + coverSize, coverY, coverX + coverSize, coverY + radius);
  ctx.lineTo(coverX + coverSize, coverY + coverSize - radius);
  ctx.quadraticCurveTo(coverX + coverSize, coverY + coverSize, coverX + coverSize - radius, coverY + coverSize);
  ctx.lineTo(coverX + radius, coverY + coverSize);
  ctx.quadraticCurveTo(coverX, coverY + coverSize, coverX, coverY + coverSize - radius);
  ctx.lineTo(coverX, coverY + radius);
  ctx.quadraticCurveTo(coverX, coverY, coverX + radius, coverY);
  ctx.closePath();
  ctx.stroke();

  // --- Event title ---
  const textY = coverY + coverSize + 60;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px 'Oswald', sans-serif";

  // Word wrap title
  const title = event.title.toUpperCase();
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
  if (line) {
    ctx.fillText(line, W / 2, lineY);
  }

  // --- Event metadata ---
  let metaY = lineY + 50;
  ctx.font = "24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";

  if (event.eventDate) {
    const dateStr = new Date(event.eventDate).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    ctx.fillText(dateStr, W / 2, metaY);
    metaY += 40;
  }

  if (event.location) {
    ctx.fillText(event.location, W / 2, metaY);
    metaY += 40;
  }

  // Video count
  ctx.fillStyle = "rgba(168, 85, 247, 0.8)";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(`${event.videoCount} videos`, W / 2, metaY);
  metaY += 40;

  // Description (truncated)
  if (event.description) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "20px sans-serif";
    const descLines = wrapText(ctx, event.description, W - 160, 2);
    descLines.forEach((l, i) => {
      ctx.fillText(l, W / 2, metaY + i * 30);
    });
  }

  // --- Bottom section: branding + URL ---
  const bottomY = H - 200;

  // Gradient separator
  const sepGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
  sepGrad.addColorStop(0, "rgba(168,85,247,0)");
  sepGrad.addColorStop(0.5, "rgba(168,85,247,0.5)");
  sepGrad.addColorStop(1, "rgba(168,85,247,0)");
  ctx.fillStyle = sepGrad;
  ctx.fillRect(W * 0.2, bottomY, W * 0.6, 1);

  // URL
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "22px monospace";
  ctx.fillText("sonidoliquido.com/reels", W / 2, bottomY + 40);

  // Branding
  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 20px 'Oswald', sans-serif";
  ctx.fillText("SONIDO LÍQUIDO CREW", W / 2, bottomY + 80);

  // IG Stories indicator
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "16px sans-serif";
  ctx.fillText("Toca para ver el evento", W / 2, bottomY + 120);
}

// Word wrap helper
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
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

  // Truncate last line with ellipsis if needed
  if (lines.length === maxLines && line) {
    const lastLine = lines[maxLines - 1];
    if (ctx.measureText(lastLine + "...").width > maxWidth) {
      let truncated = lastLine;
      while (
        ctx.measureText(truncated + "...").width > maxWidth &&
        truncated.length > 0
      ) {
        truncated = truncated.slice(0, -1);
      }
      lines[maxLines - 1] = truncated + "...";
    }
  }

  return lines;
}

// ===========================================
// EVENT STORY CARD COMPONENT
// ===========================================

export function EventStoryCard({
  event,
  onClose,
  canvasRef,
  generating,
  setGenerating,
}: EventStoryCardProps) {
  const [cardGenerated, setCardGenerated] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate the story card on mount
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || cardGenerated) return;

    setGenerating(true);
    generateStoryCard(canvas, event)
      .then(() => {
        setCardGenerated(true);
        // Also generate on the shared canvas ref for sharing
        if (canvasRef.current) {
          return generateStoryCard(canvasRef.current, event);
        }
      })
      .catch((err) => {
        console.error("Failed to generate story card:", err);
      })
      .finally(() => {
        setGenerating(false);
      });
  }, [event, cardGenerated, canvasRef, setGenerating]);

  // Download the story card
  const downloadCard = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${event.slug || event.id}-story.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      "image/png",
      1.0
    );
  }, [event.slug, event.id]);

  // Share the story card (via Web Share API with file)
  const shareCard = useCallback(async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1.0)
      );
      if (!blob) return;

      const file = new File(
        [blob],
        `${event.slug || event.id}-story.png`,
        { type: "image/png" }
      );

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: event.title,
          text: `Mira "${event.title}" en Sonido Líquido Crew`,
          url: `${window.location.origin}/reels`,
          files: [file],
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } else {
        // Fallback: download
        downloadCard();
      }
    } catch {
      // User cancelled share
    }
  }, [event, downloadCard]);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-4 max-h-[95vh]"
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
          <Instagram className="w-5 h-5 text-purple-400" />
          Compartir en Stories
        </h2>

        {/* Preview canvas (9:16 aspect ratio, scaled to fit) */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20 border border-white/10" style={{ maxHeight: "60vh", aspectRatio: "9/16" }}>
          <canvas
            ref={previewCanvasRef}
            className="w-full h-full object-contain"
            style={{ maxHeight: "60vh" }}
          />
          {generating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={downloadCard}
            disabled={generating || !cardGenerated}
            className="bg-white/10 hover:bg-white/20 text-white gap-2"
            variant="ghost"
          >
            <Download className="w-4 h-4" />
            Descargar
          </Button>
          <Button
            onClick={shareCard}
            disabled={generating || !cardGenerated}
            className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white gap-2"
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
        </div>

        {/* Instructions */}
        <p className="text-xs text-white/40 text-center max-w-xs">
          Descarga la imagen y subela como historia en Instagram o Facebook.
          {" O usa el botón Compartir para enviarla directamente."}
        </p>
      </div>

      {/* Hidden canvas for full-res generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
