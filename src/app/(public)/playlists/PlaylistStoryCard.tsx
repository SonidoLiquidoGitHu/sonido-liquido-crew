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
  Loader2,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ===========================================
// TYPES
// ===========================================

interface PlaylistShareData {
  id: string;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  coverColor?: string | null;
  trackCount?: number | null;
  spotifyPlaylistId?: string | null;
  spotifyPlaylistUrl?: string | null;
}

interface PlaylistStoryCardProps {
  playlist: PlaylistShareData;
  onClose: () => void;
}

type FormatTab = "story" | "post" | "reel";

const FORMAT_LABELS: Record<
  FormatTab,
  { label: string; w: number; h: number }
> = {
  story: { label: "Story", w: 1080, h: 1920 },
  post: { label: "Post", w: 1080, h: 1080 },
  reel: { label: "Reel", w: 1080, h: 1920 },
};

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

// Spotify glyph (used on canvas + UI)
function drawSpotifyGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = size * 0.13;
  ctx.lineCap = "round";

  // Three arcs
  for (let i = 0; i < 3; i++) {
    const r = size * (0.55 - i * 0.18);
    const offset = size * (0.08 + i * 0.05);
    ctx.beginPath();
    ctx.arc(cx, cy + offset, r, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.restore();
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
  coverImageUrl: string | null | undefined,
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

// ===========================================
// CANVAS GENERATORS
// ===========================================

const SPOTIFY_GREEN = "#1DB954";
const SPOTIFY_GREEN_DARK = "#1aa34a";

function drawPlaylistCover(
  ctx: CanvasRenderingContext2D,
  coverImg: HTMLImageElement | null,
  coverX: number,
  coverY: number,
  coverSize: number,
  radius: number,
  fallbackColor: string,
) {
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
    const c = fallbackColor || "#1DB954";
    const grad = ctx.createLinearGradient(
      coverX,
      coverY,
      coverX + coverSize,
      coverY + coverSize,
    );
    grad.addColorStop(0, `${c}33`);
    grad.addColorStop(1, "#0a0a0a");
    ctx.fillStyle = grad;
    ctx.fillRect(coverX, coverY, coverSize, coverSize);

    // Music note glyph as placeholder
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = `${coverSize * 0.4}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u266B", coverX + coverSize / 2, coverY + coverSize / 2);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  // Border
  ctx.strokeStyle = "rgba(29, 185, 84, 0.4)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, radius);
  ctx.stroke();
}

// --- STORY: 1080x1920 ---
async function generateStoryCard(
  canvas: HTMLCanvasElement,
  playlist: PlaylistShareData,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  await loadOswaldFont();

  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#0a0a0a");
  bgGrad.addColorStop(0.5, "#0d1a14");
  bgGrad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const coverImg = await loadCoverImage(playlist.coverImageUrl);

  // Blurred cover as background accent
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

  // Gradient overlay
  const overlayGrad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  overlayGrad.addColorStop(0, "rgba(10,10,10,0.5)");
  overlayGrad.addColorStop(1, "rgba(10,10,10,1)");
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, W, H * 0.6);

  // Top branding
  ctx.textAlign = "center";
  ctx.fillStyle = SPOTIFY_GREEN;
  ctx.font = "bold 28px 'Oswald', sans-serif";
  ctx.fillText("SONIDO LÍQUIDO", W / 2, 120);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "18px 'Oswald', sans-serif";
  ctx.fillText("PLAYLIST CURADA", W / 2, 155);

  // "PLAYLIST" badge
  const badgeW = 220;
  const badgeH = 36;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 185;
  ctx.fillStyle = "rgba(29, 185, 84, 0.2)";
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(29, 185, 84, 0.5)";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.stroke();
  ctx.fillStyle = "#1ed760";
  ctx.font = "bold 16px 'Oswald', sans-serif";
  ctx.fillText("SPOTIFY · CREW PICK", W / 2, badgeY + 25);

  // Center cover image
  const coverSize = 560;
  const coverX = (W - coverSize) / 2;
  const coverY = 260;
  drawPlaylistCover(
    ctx,
    coverImg,
    coverX,
    coverY,
    coverSize,
    24,
    playlist.coverColor || SPOTIFY_GREEN,
  );

  // Playlist name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px 'Oswald', sans-serif";
  ctx.textAlign = "center";
  const nameLines = wrapText(ctx, playlist.name || "Playlist", W - 120, 2);
  let textY = coverY + coverSize + 80;
  for (const line of nameLines) {
    ctx.fillText(line, W / 2, textY);
    textY += 60;
  }

  // Description
  if (playlist.description) {
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "24px 'Oswald', sans-serif";
    const descLines = wrapText(ctx, playlist.description, W - 160, 3);
    let descY = textY + 10;
    for (const line of descLines) {
      ctx.fillText(line, W / 2, descY);
      descY += 32;
    }
    textY = descY;
  }

  // Track count chip
  if (playlist.trackCount && playlist.trackCount > 0) {
    const chipText = `${playlist.trackCount} tracks`;
    ctx.font = "bold 22px 'Oswald', sans-serif";
    const chipW = ctx.measureText(chipText).width + 60;
    const chipH = 44;
    const chipX = (W - chipW) / 2;
    const chipY = textY + 20;
    ctx.fillStyle = "rgba(29, 185, 84, 0.15)";
    drawRoundedRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(29, 185, 84, 0.4)";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.stroke();
    ctx.fillStyle = "#1ed760";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(chipText, W / 2, chipY + chipH / 2 + 2);
    ctx.textBaseline = "alphabetic";
    textY = chipY + chipH + 30;
  } else {
    textY += 30;
  }

  // CTA pill "ESCUCHA EN SPOTIFY"
  const ctaWidth = 540;
  const ctaHeight = 76;
  const ctaX = (W - ctaWidth) / 2;
  const ctaY = Math.max(textY + 20, 1300);

  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaWidth, ctaY);
  ctaGrad.addColorStop(0, SPOTIFY_GREEN);
  ctaGrad.addColorStop(1, SPOTIFY_GREEN_DARK);
  ctx.fillStyle = ctaGrad;
  drawRoundedRect(ctx, ctaX, ctaY, ctaWidth, ctaHeight, ctaHeight / 2);
  ctx.fill();

  // Spotify glyph on the left of the pill
  drawSpotifyGlyph(ctx, ctaX + 50, ctaY + ctaHeight / 2, 18, "#000000");

  ctx.fillStyle = "#000000";
  ctx.font = "bold 28px 'Oswald', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ESCUCHA EN SPOTIFY", W / 2 + 20, ctaY + ctaHeight / 2 + 10);

  // URL
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "20px 'Oswald', sans-serif";
  ctx.fillText(
    "sonidoliquido.com/playlists/curada",
    W / 2,
    ctaY + ctaHeight + 60,
  );

  // Bottom branding
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "16px 'Oswald', sans-serif";
  ctx.fillText("SONIDO LÍQUIDO CREW · HIP HOP MÉXICO", W / 2, H - 80);
}

// --- POST: 1080x1080 ---
async function generatePostCard(
  canvas: HTMLCanvasElement,
  playlist: PlaylistShareData,
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
  bgGrad.addColorStop(0.5, "#0d1a14");
  bgGrad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const coverImg = await loadCoverImage(playlist.coverImageUrl);

  // Blurred cover background
  if (coverImg) {
    ctx.save();
    ctx.filter = "blur(60px) brightness(0.3)";
    const imgAspect = coverImg.width / coverImg.height;
    let drawW = W + 200;
    let drawH = drawW / imgAspect;
    if (drawH < H) {
      drawH = H;
      drawW = drawH * imgAspect;
    }
    ctx.drawImage(coverImg, (W - drawW) / 2, (H - drawH) / 2, drawW, drawH);
    ctx.restore();
  }

  // Overlay
  ctx.fillStyle = "rgba(10,10,10,0.65)";
  ctx.fillRect(0, 0, W, H);

  // Top branding
  ctx.textAlign = "center";
  ctx.fillStyle = SPOTIFY_GREEN;
  ctx.font = "bold 24px 'Oswald', sans-serif";
  ctx.fillText("SONIDO LÍQUIDO", W / 2, 70);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "16px 'Oswald', sans-serif";
  ctx.fillText("PLAYLIST CURADA", W / 2, 100);

  // Layout: cover on left, info on right
  const coverSize = 480;
  const coverX = 80;
  const coverY = (H - coverSize) / 2;
  drawPlaylistCover(
    ctx,
    coverImg,
    coverX,
    coverY,
    coverSize,
    24,
    playlist.coverColor || SPOTIFY_GREEN,
  );

  // Right column
  const colX = coverX + coverSize + 60;
  const colW = W - colX - 80;

  // Playlist name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px 'Oswald', sans-serif";
  ctx.textAlign = "left";
  const nameLines = wrapText(ctx, playlist.name || "Playlist", colW, 3);
  let textY = coverY + 70;
  for (const line of nameLines) {
    ctx.fillText(line, colX, textY);
    textY += 54;
  }

  // Description
  if (playlist.description) {
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "20px 'Oswald', sans-serif";
    const descLines = wrapText(ctx, playlist.description, colW, 4);
    textY += 8;
    for (const line of descLines) {
      ctx.fillText(line, colX, textY);
      textY += 28;
    }
  }

  // Track count
  if (playlist.trackCount && playlist.trackCount > 0) {
    ctx.fillStyle = "#1ed760";
    ctx.font = "bold 22px 'Oswald', sans-serif";
    ctx.fillText(`${playlist.trackCount} tracks`, colX, textY + 30);
    textY += 30;
  }

  // CTA at bottom right
  const ctaWidth = 360;
  const ctaHeight = 60;
  const ctaX = colX;
  const ctaY = coverY + coverSize - ctaHeight;

  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaWidth, ctaY);
  ctaGrad.addColorStop(0, SPOTIFY_GREEN);
  ctaGrad.addColorStop(1, SPOTIFY_GREEN_DARK);
  ctx.fillStyle = ctaGrad;
  drawRoundedRect(ctx, ctaX, ctaY, ctaWidth, ctaHeight, ctaHeight / 2);
  ctx.fill();

  drawSpotifyGlyph(ctx, ctaX + 40, ctaY + ctaHeight / 2, 14, "#000000");

  ctx.fillStyle = "#000000";
  ctx.font = "bold 22px 'Oswald', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "ESCUCHA EN SPOTIFY",
    ctaX + ctaWidth / 2 + 15,
    ctaY + ctaHeight / 2 + 8,
  );

  // URL
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "16px 'Oswald', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("sonidoliquido.com/playlists/curada", W / 2, H - 50);
}

// --- REEL: same as story (1080x1920) ---
async function generateReelCard(
  canvas: HTMLCanvasElement,
  playlist: PlaylistShareData,
): Promise<void> {
  // Reel uses the same layout as Story for now
  return generateStoryCard(canvas, playlist);
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function PlaylistStoryCard({
  playlist,
  onClose,
}: PlaylistStoryCardProps) {
  const [selectedFormat, setSelectedFormat] = useState<FormatTab>("story");
  const [generating, setGenerating] = useState(false);
  const [cardGenerated, setCardGenerated] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fullResCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setIsMobile(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ),
    );
  }, []);

  // Prefer the on-site detail page so shared links land on a branded,
  // trackable SLC page that itself hosts the Spotify embed + share CTAs.
  // Fall back to the Spotify URL, then to the playlists index.
  const playlistShareUrl =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/playlists/curated/")
      ? window.location.href
      : `https://sonidoliquido.com/playlists/curated/${playlist.id}`;

  // Spotify direct URL — used by the "Abrir en Spotify" CTA inside the modal.
  // Falls back gracefully when the playlist has no Spotify link configured.
  const spotifyUrl =
    playlist.spotifyPlaylistUrl ||
    (playlist.spotifyPlaylistId
      ? `https://open.spotify.com/playlist/${playlist.spotifyPlaylistId}`
      : null);

  const shareText = `Escucha "${playlist.name}" — playlist curada por Sonido Líquido Crew`;

  // Generate preview whenever format changes
  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      setGenerating(true);
      setCardGenerated(false);
      try {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        const dims = FORMAT_LABELS[selectedFormat];
        // Render at half resolution for preview performance
        canvas.width = dims.w / 2;
        canvas.height = dims.h / 2;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(0.5, 0.5);
        }
        if (selectedFormat === "story")
          await generateStoryCard(canvas, playlist);
        else if (selectedFormat === "post")
          await generatePostCard(canvas, playlist);
        else await generateReelCard(canvas, playlist);
        if (!cancelled) setCardGenerated(true);
      } catch (err) {
        console.error("Preview generation failed:", err);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    };
    generate();
    return () => {
      cancelled = true;
    };
  }, [selectedFormat, playlist]);

  const getCanvasBlob = useCallback(
    async (canvas: HTMLCanvasElement): Promise<Blob | null> => {
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
      });
    },
    [],
  );

  const generateFullRes = useCallback(async (): Promise<Blob | null> => {
    const canvas = fullResCanvasRef.current;
    if (!canvas) return null;
    try {
      if (selectedFormat === "story") await generateStoryCard(canvas, playlist);
      else if (selectedFormat === "post")
        await generatePostCard(canvas, playlist);
      else await generateReelCard(canvas, playlist);
      return await getCanvasBlob(canvas);
    } catch (err) {
      console.error("Full-res generation failed:", err);
      return null;
    }
  }, [selectedFormat, playlist, getCanvasBlob]);

  const downloadCard = useCallback(async () => {
    setShareError(null);
    const blob = await generateFullRes();
    if (!blob) {
      setShareError("No se pudo generar la imagen.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (playlist.name || "playlist")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    a.download = `${safeName}-${selectedFormat}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateFullRes, playlist.name, selectedFormat]);

  const copyImageToClipboard = useCallback(async () => {
    setShareError(null);
    try {
      const blob = await generateFullRes();
      if (!blob) {
        setShareError("No se pudo generar la imagen.");
        return;
      }
      if (!navigator.clipboard || !window.ClipboardItem) {
        setShareError(
          "Tu navegador no soporta copiar imágenes. Descarga la imagen.",
        );
        return;
      }
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2500);
    } catch (err) {
      console.error("Copy image failed:", err);
      setShareError("No se pudo copiar la imagen. Descarga la imagen.");
    }
  }, [generateFullRes]);

  const shareCard = useCallback(async () => {
    setShareError(null);
    try {
      const blob = await generateFullRes();
      if (!blob) {
        setShareError("No se pudo generar la imagen.");
        return;
      }
      const file = new File(
        [blob],
        `playlist-${playlist.id}-${selectedFormat}.png`,
        {
          type: "image/png",
        },
      );

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: playlist.name,
            text: shareText,
            url: playlistShareUrl,
            files: [file],
          });
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: playlist.name,
            text: shareText,
            url: playlistShareUrl,
          });
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }

      downloadCard();
    } catch (err) {
      console.error("Share failed:", err);
      setShareError("No se pudo compartir. Intenta descargar la imagen.");
    }
  }, [
    generateFullRes,
    playlist,
    selectedFormat,
    shareText,
    playlistShareUrl,
    downloadCard,
  ]);

  const downloadAndOpenInstagram = useCallback(async () => {
    setShareError(null);
    try {
      const blob = await generateFullRes();
      if (!blob) return;

      if (isMobile) {
        if (
          navigator.share &&
          navigator.canShare?.({
            files: [new File([blob], "playlist.png", { type: "image/png" })],
          })
        ) {
          try {
            await navigator.share({
              text: shareText,
              files: [new File([blob], "playlist.png", { type: "image/png" })],
            });
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 2000);
            return;
          } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") return;
          }
        }

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

        await downloadCard();
        setShareError(
          "Descarga la imagen y ábrela en Instagram para subirla a tu Story.",
        );
      } else {
        await downloadCard();
        window.open("https://www.instagram.com/", "_blank");
      }
    } catch (err) {
      console.error("Instagram share failed:", err);
      setShareError(
        "No se pudo compartir en Instagram. Intenta descargar la imagen.",
      );
    }
  }, [generateFullRes, isMobile, downloadCard, shareText]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(playlistShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const encodedUrl = encodeURIComponent(playlistShareUrl);
  const encodedTitle = encodeURIComponent(shareText);

  const aspectStyle =
    selectedFormat === "post"
      ? { aspectRatio: "1/1", maxHeight: "50vh" }
      : { aspectRatio: "9/16", maxHeight: "60vh" };

  const formatLabel =
    selectedFormat === "post"
      ? "publicación"
      : selectedFormat === "reel"
        ? "reel"
        : "historia";

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          aria-label="Cerrar"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Title */}
        <h2 className="font-oswald text-lg uppercase text-white flex items-center gap-2">
          <Share2 className="w-5 h-5" style={{ color: SPOTIFY_GREEN }} />
          Compartir Playlist
        </h2>

        {/* Format Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(["story", "post", "reel"] as FormatTab[]).map((format) => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format)}
              className={`px-4 py-1.5 rounded-md text-sm font-oswald uppercase transition-all ${
                selectedFormat === format
                  ? "bg-[#1DB954] text-black"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {FORMAT_LABELS[format].label}
            </button>
          ))}
        </div>

        {/* Preview canvas */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 mx-auto"
          style={{
            ...aspectStyle,
            boxShadow: "0 25px 50px -12px rgba(29, 185, 84, 0.25)",
          }}
        >
          <canvas
            ref={previewCanvasRef}
            className="w-full h-full object-contain"
            style={aspectStyle}
          />
          {generating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2
                className="w-10 h-10 animate-spin"
                style={{ color: SPOTIFY_GREEN }}
              />
            </div>
          )}
        </div>

        {/* ============ PRIMARY ACTION BUTTONS ============ */}

        {isMobile ? (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button
              onClick={shareCard}
              disabled={generating || !cardGenerated}
              className="bg-gradient-to-r from-[#1DB954] to-[#1aa34a] hover:opacity-90 text-black gap-2"
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
          <div className="w-full space-y-2">
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

            <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1.5">
              <p className="text-xs text-white/60 font-oswald uppercase tracking-wide">
                Como compartir en {formatLabel}:
              </p>
              <div className="flex items-start gap-2 text-xs text-white/50">
                <span className="bg-[#1DB954]/30 text-[#1ed760] rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold">
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
                <span className="bg-[#1DB954]/30 text-[#1ed760] rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold">
                  2
                </span>
                <span>
                  En Instagram, crea una nueva {formatLabel} (icono +)
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-white/50">
                <span className="bg-[#1DB954]/30 text-[#1ed760] rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold">
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
            className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-[#1DB954] hover:border-[#1DB954] hover:text-black transition-all"
            title="Copiar enlace"
          >
            {copiedLink ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* ============ ABRIR EN SPOTIFY CTA ============ */}
        {spotifyUrl && (
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black text-sm font-bold uppercase tracking-wide transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Abrir en Spotify
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Hidden canvas for full-res generation */}
      <canvas ref={fullResCanvasRef} className="hidden" />
    </div>
  );
}

export type { PlaylistShareData };
