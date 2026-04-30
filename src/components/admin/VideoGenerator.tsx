"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Download,
  Loader2,
  Sparkles,
  Video,
  Music,
  Image as ImageIcon,
  Wand2,
  RefreshCw,
  Check,
  AlertTriangle,
  Clock,
  Smartphone,
  Monitor,
  Square,
  Settings,
  Eye,
  Palette,
  Type,
  Volume2,
  Disc,
  Waves,
  Zap,
  Star,
  X,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

type VideoTemplate =
  | "countdown"
  | "artwork-pulse"
  | "vinyl-spin"
  | "particles"
  | "waveform"
  | "text-reveal"
  | "glitch"
  | "minimal";

type VideoOrientation = "horizontal" | "vertical" | "square";

interface VideoGeneratorProps {
  coverImageUrl: string;
  audioUrl?: string;
  artistName: string;
  title: string;
  releaseDate?: Date;
  backgroundColor?: string;
  onVideoGenerated?: (videoBlob: Blob, orientation: VideoOrientation) => void;
  className?: string;
}

interface TemplateConfig {
  id: VideoTemplate;
  name: string;
  description: string;
  icon: React.ReactNode;
  duration: number; // seconds
  requiresAudio: boolean;
}

// ============================================
// TEMPLATE CONFIGS
// ============================================

const TEMPLATES: TemplateConfig[] = [
  {
    id: "countdown",
    name: "Countdown",
    description: "Cuenta regresiva animada con fecha de lanzamiento",
    icon: <Clock className="w-5 h-5" />,
    duration: 15,
    requiresAudio: false,
  },
  {
    id: "artwork-pulse",
    name: "Artwork Pulse",
    description: "Portada con efecto de pulso y zoom suave",
    icon: <Zap className="w-5 h-5" />,
    duration: 15,
    requiresAudio: true,
  },
  {
    id: "vinyl-spin",
    name: "Vinyl Spin",
    description: "Efecto de disco girando con la portada",
    icon: <Disc className="w-5 h-5" />,
    duration: 15,
    requiresAudio: true,
  },
  {
    id: "particles",
    name: "Particles",
    description: "Partículas flotantes con efecto mágico",
    icon: <Sparkles className="w-5 h-5" />,
    duration: 15,
    requiresAudio: false,
  },
  {
    id: "waveform",
    name: "Waveform",
    description: "Visualización de forma de onda del audio",
    icon: <Waves className="w-5 h-5" />,
    duration: 15,
    requiresAudio: true,
  },
  {
    id: "text-reveal",
    name: "Text Reveal",
    description: "Revelación de texto con efecto cinematográfico",
    icon: <Type className="w-5 h-5" />,
    duration: 10,
    requiresAudio: false,
  },
  {
    id: "glitch",
    name: "Glitch",
    description: "Efecto glitch moderno y llamativo",
    icon: <Zap className="w-5 h-5" />,
    duration: 10,
    requiresAudio: false,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Diseño minimalista y elegante",
    icon: <Square className="w-5 h-5" />,
    duration: 10,
    requiresAudio: false,
  },
];

const ORIENTATIONS: { id: VideoOrientation; name: string; icon: React.ReactNode; dimensions: { width: number; height: number } }[] = [
  { id: "vertical", name: "Vertical (9:16)", icon: <Smartphone className="w-4 h-4" />, dimensions: { width: 1080, height: 1920 } },
  { id: "horizontal", name: "Horizontal (16:9)", icon: <Monitor className="w-4 h-4" />, dimensions: { width: 1920, height: 1080 } },
  { id: "square", name: "Cuadrado (1:1)", icon: <Square className="w-4 h-4" />, dimensions: { width: 1080, height: 1080 } },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getDirectUrl(url: string): string {
  if (url.includes("dropbox")) {
    return url
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("?dl=0", "")
      .replace("&dl=0", "");
  }
  return url;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function formatCountdown(targetDate: Date, now: Date): { days: string; hours: string; mins: string; secs: string } {
  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  return {
    days: days.toString().padStart(2, "0"),
    hours: hours.toString().padStart(2, "0"),
    mins: mins.toString().padStart(2, "0"),
    secs: secs.toString().padStart(2, "0"),
  };
}

// ============================================
// PARTICLE SYSTEM
// ============================================

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

function createParticles(count: number, width: number, height: number, color: string): Particle[] {
  const particles: Particle[] = [];
  const rgb = hexToRgb(color);

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 4 + 1,
      speedX: (Math.random() - 0.5) * 2,
      speedY: (Math.random() - 0.5) * 2 - 1,
      opacity: Math.random() * 0.5 + 0.2,
      color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, `,
    });
  }
  return particles;
}

function updateParticles(particles: Particle[], width: number, height: number): void {
  for (const p of particles) {
    p.x += p.speedX;
    p.y += p.speedY;
    p.opacity += (Math.random() - 0.5) * 0.02;
    p.opacity = Math.max(0.1, Math.min(0.8, p.opacity));

    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `${p.color}${p.opacity})`;
    ctx.fill();
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function VideoGenerator({
  coverImageUrl,
  audioUrl,
  artistName,
  title,
  releaseDate,
  backgroundColor = "#000000",
  onVideoGenerated,
  className = "",
}: VideoGeneratorProps) {
  // State
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate>("artwork-pulse");
  const [selectedOrientation, setSelectedOrientation] = useState<VideoOrientation>("vertical");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Customization options
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [showArtistName, setShowArtistName] = useState(true);
  const [showTitle, setShowTitle] = useState(true);
  const [showCountdown, setShowCountdown] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(true);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const currentTemplate = TEMPLATES.find((t) => t.id === selectedTemplate)!;
  const currentOrientation = ORIENTATIONS.find((o) => o.id === selectedOrientation)!;

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (generatedVideoUrl) {
        URL.revokeObjectURL(generatedVideoUrl);
      }
    };
  }, [generatedVideoUrl]);

  // Load cover image
  const loadImage = useCallback(async (): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load cover image"));
      img.src = getDirectUrl(coverImageUrl);
    });
  }, [coverImageUrl]);

  // Draw frame based on template
  const drawFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement,
      frame: number,
      totalFrames: number,
      width: number,
      height: number,
      particles: Particle[],
      audioData?: Uint8Array
    ) => {
      const progress = frame / totalFrames;
      const time = progress * currentTemplate.duration;

      // Clear canvas
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Calculate cover size and position (centered)
      const coverSize = Math.min(width, height) * 0.7;
      const coverX = (width - coverSize) / 2;
      const coverY = (height - coverSize) / 2 - (selectedOrientation === "vertical" ? height * 0.1 : 0);

      // Apply template-specific effects
      ctx.save();

      switch (selectedTemplate) {
        case "countdown":
          // Draw cover with subtle zoom
          {
            const zoom = 1 + Math.sin(time * 2) * 0.02;
            const zoomOffset = (coverSize * (zoom - 1)) / 2;
            ctx.drawImage(img, coverX - zoomOffset, coverY - zoomOffset, coverSize * zoom, coverSize * zoom);

            // Draw countdown
            if (releaseDate && showCountdown) {
              const countdownY = coverY + coverSize + 60;
              const countdown = formatCountdown(releaseDate, new Date(Date.now() + (totalFrames - frame) * 33));

              ctx.textAlign = "center";
              ctx.fillStyle = textColor;

              // Countdown boxes
              const boxWidth = width * 0.18;
              const boxSpacing = width * 0.05;
              const totalWidth = boxWidth * 4 + boxSpacing * 3;
              const startX = (width - totalWidth) / 2;

              const labels = ["DÍAS", "HRS", "MIN", "SEG"];
              const values = [countdown.days, countdown.hours, countdown.mins, countdown.secs];

              values.forEach((value, i) => {
                const x = startX + i * (boxWidth + boxSpacing) + boxWidth / 2;

                // Box background
                ctx.fillStyle = `rgba(255,255,255,0.1)`;
                ctx.fillRect(startX + i * (boxWidth + boxSpacing), countdownY, boxWidth, boxWidth * 0.8);

                // Value
                ctx.fillStyle = textColor;
                ctx.font = `bold ${boxWidth * 0.5}px "Oswald", sans-serif`;
                ctx.fillText(value, x, countdownY + boxWidth * 0.55);

                // Label
                ctx.font = `${boxWidth * 0.15}px "Oswald", sans-serif`;
                ctx.fillStyle = `rgba(255,255,255,0.6)`;
                ctx.fillText(labels[i], x, countdownY + boxWidth * 0.75);
              });
            }
          }
          break;

        case "artwork-pulse":
          // Pulse effect based on audio or time
          {
            let pulseIntensity = Math.sin(time * 4) * 0.05 + 1;

            if (audioData) {
              const bass = Array.from(audioData.slice(0, 10)).reduce((a, b) => a + b, 0) / 10 / 255;
              pulseIntensity = 1 + bass * 0.15;
            }

            // Glow effect
            const glowSize = coverSize * pulseIntensity;
            const glowOffset = (glowSize - coverSize) / 2;

            ctx.shadowColor = backgroundColor;
            ctx.shadowBlur = 50 * pulseIntensity;

            ctx.drawImage(img, coverX - glowOffset, coverY - glowOffset, glowSize, glowSize);
          }
          break;

        case "vinyl-spin":
          // Spinning vinyl effect
          {
            const centerX = width / 2;
            const centerY = height / 2 - (selectedOrientation === "vertical" ? height * 0.1 : 0);
            const vinylSize = coverSize * 1.2;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(time * Math.PI * 0.5);

            // Vinyl background
            ctx.beginPath();
            ctx.arc(0, 0, vinylSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = "#111";
            ctx.fill();

            // Vinyl grooves
            for (let i = 0; i < 20; i++) {
              ctx.beginPath();
              ctx.arc(0, 0, (vinylSize / 2) * (0.3 + i * 0.035), 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(40,40,40,${0.3 + Math.random() * 0.2})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }

            // Cover in center
            ctx.beginPath();
            ctx.arc(0, 0, coverSize / 2 * 0.85, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, -coverSize / 2 * 0.85, -coverSize / 2 * 0.85, coverSize * 0.85, coverSize * 0.85);

            ctx.restore();

            // Center hole
            ctx.beginPath();
            ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
            ctx.fillStyle = backgroundColor;
            ctx.fill();
          }
          break;

        case "particles":
          // Draw cover
          ctx.drawImage(img, coverX, coverY, coverSize, coverSize);

          // Update and draw particles
          updateParticles(particles, width, height);
          drawParticles(ctx, particles);
          break;

        case "waveform":
          // Draw cover smaller
          {
            const smallerSize = coverSize * 0.8;
            const smallerX = (width - smallerSize) / 2;
            const smallerY = coverY - height * 0.05;
            ctx.drawImage(img, smallerX, smallerY, smallerSize, smallerSize);

            // Draw waveform
            if (audioData) {
              const waveY = smallerY + smallerSize + 40;
              const waveHeight = height * 0.15;
              const barWidth = width / audioData.length * 2;

              ctx.fillStyle = textColor;

              for (let i = 0; i < audioData.length / 2; i++) {
                const value = audioData[i] / 255;
                const barHeight = value * waveHeight;
                const x = i * barWidth * 2 + barWidth / 2;

                // Mirror effect
                ctx.fillRect(x, waveY + waveHeight / 2 - barHeight / 2, barWidth - 1, barHeight);
              }
            } else {
              // Fake waveform
              const waveY = smallerY + smallerSize + 40;
              const waveHeight = height * 0.15;
              const bars = 64;
              const barWidth = width / bars;

              for (let i = 0; i < bars; i++) {
                const value = Math.sin(i * 0.3 + time * 5) * 0.5 + 0.5;
                const barHeight = value * waveHeight;
                ctx.fillStyle = `rgba(255,255,255,${0.3 + value * 0.7})`;
                ctx.fillRect(i * barWidth + 2, waveY + waveHeight / 2 - barHeight / 2, barWidth - 4, barHeight);
              }
            }
          }
          break;

        case "text-reveal":
          // Draw cover
          ctx.drawImage(img, coverX, coverY, coverSize, coverSize);

          // Text reveal animation
          {
            const revealProgress = Math.min(1, progress * 3);
            const slideDistance = width * 0.2;

            if (showArtistName) {
              const artistY = coverY + coverSize + 50;
              ctx.globalAlpha = revealProgress;
              ctx.textAlign = "center";
              ctx.fillStyle = textColor;
              ctx.font = `bold ${width * 0.06}px "Oswald", sans-serif`;
              ctx.fillText(artistName.toUpperCase(), width / 2 + (1 - revealProgress) * slideDistance, artistY);
            }

            if (showTitle) {
              const titleY = coverY + coverSize + 100;
              const titleReveal = Math.max(0, Math.min(1, (progress - 0.2) * 3));
              ctx.globalAlpha = titleReveal;
              ctx.font = `${width * 0.04}px sans-serif`;
              ctx.fillStyle = `rgba(255,255,255,0.8)`;
              ctx.fillText(title, width / 2 - (1 - titleReveal) * slideDistance, titleY);
            }
            ctx.globalAlpha = 1;
          }
          break;

        case "glitch":
          // Glitch effect
          {
            const glitchIntensity = Math.random() > 0.9 ? Math.random() * 20 : 0;
            const colorShift = Math.random() > 0.95 ? 5 : 0;

            // Draw with RGB shift
            if (colorShift > 0) {
              ctx.globalCompositeOperation = "screen";
              ctx.drawImage(img, coverX - colorShift, coverY, coverSize, coverSize);
              ctx.drawImage(img, coverX + colorShift, coverY, coverSize, coverSize);
              ctx.globalCompositeOperation = "source-over";
            }

            // Main image with potential offset
            ctx.drawImage(
              img,
              coverX + (Math.random() > 0.95 ? glitchIntensity : 0),
              coverY + (Math.random() > 0.95 ? glitchIntensity : 0),
              coverSize,
              coverSize
            );

            // Scan lines
            for (let y = 0; y < height; y += 4) {
              if (Math.random() > 0.97) {
                ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
                ctx.fillRect(0, y, width, 2);
              }
            }
          }
          break;

        case "minimal":
          // Clean minimal design
          {
            // Center cover with border
            const borderWidth = 4;
            ctx.strokeStyle = textColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(coverX - borderWidth, coverY - borderWidth, coverSize + borderWidth * 2, coverSize + borderWidth * 2);
            ctx.drawImage(img, coverX, coverY, coverSize, coverSize);

            // Subtle line animation
            const lineY = coverY + coverSize + 30;
            const lineWidth = coverSize * progress;
            ctx.fillStyle = textColor;
            ctx.fillRect((width - lineWidth) / 2, lineY, lineWidth, 2);
          }
          break;
      }

      ctx.restore();

      // Draw text overlay (for most templates)
      if (selectedTemplate !== "text-reveal") {
        const textY = selectedOrientation === "vertical"
          ? coverY + coverSize + (releaseDate && showCountdown ? 200 : 80)
          : coverY + coverSize + 60;

        ctx.textAlign = "center";
        ctx.fillStyle = textColor;

        if (showArtistName) {
          ctx.font = `bold ${width * 0.05}px "Oswald", sans-serif`;
          ctx.fillText(artistName.toUpperCase(), width / 2, textY);
        }

        if (showTitle) {
          ctx.font = `${width * 0.035}px sans-serif`;
          ctx.fillStyle = `rgba(255,255,255,0.8)`;
          ctx.fillText(title, width / 2, textY + width * 0.05);
        }
      }

      // Pre-save CTA
      if (selectedOrientation === "vertical") {
        const ctaY = height - 100;
        ctx.textAlign = "center";
        ctx.font = `bold ${width * 0.04}px "Oswald", sans-serif`;
        ctx.fillStyle = textColor;
        ctx.fillText("PRE-SAVE NOW", width / 2, ctaY);

        // Arrow animation
        const arrowOffset = Math.sin(time * 6) * 5;
        ctx.font = `${width * 0.06}px sans-serif`;
        ctx.fillText("↓", width / 2, ctaY + 30 + arrowOffset);
      }
    },
    [
      selectedTemplate,
      selectedOrientation,
      backgroundColor,
      textColor,
      artistName,
      title,
      releaseDate,
      showArtistName,
      showTitle,
      showCountdown,
      currentTemplate.duration,
    ]
  );

  // Preview animation
  const startPreview = useCallback(async () => {
    if (!previewCanvasRef.current) return;

    try {
      const img = await loadImage();
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d")!;

      // Scale down for preview
      const scale = 0.5;
      canvas.width = currentOrientation.dimensions.width * scale;
      canvas.height = currentOrientation.dimensions.height * scale;

      const particles = createParticles(50, canvas.width, canvas.height, textColor);

      const fps = 30;
      const totalFrames = currentTemplate.duration * fps;
      let frame = 0;

      setIsPreviewPlaying(true);

      const animate = () => {
        if (frame >= totalFrames) {
          frame = 0;
        }

        ctx.save();
        ctx.scale(scale, scale);
        drawFrame(ctx, img, frame, totalFrames, canvas.width / scale, canvas.height / scale, particles);
        ctx.restore();

        frame++;
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();
    } catch (err) {
      setError("Error al cargar la vista previa");
    }
  }, [loadImage, drawFrame, currentOrientation, currentTemplate, textColor]);

  const stopPreview = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsPreviewPlaying(false);
  }, []);

  // Generate video
  const generateVideo = useCallback(async () => {
    if (!canvasRef.current) return;

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      const img = await loadImage();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d")!;

      canvas.width = currentOrientation.dimensions.width;
      canvas.height = currentOrientation.dimensions.height;

      const particles = createParticles(100, canvas.width, canvas.height, textColor);

      const fps = 30;
      const totalFrames = currentTemplate.duration * fps;
      const frames: Blob[] = [];

      // Setup MediaRecorder if available
      let mediaRecorder: MediaRecorder | null = null;
      let recordedChunks: Blob[] = [];

      const stream = canvas.captureStream(fps);

      // Add audio if available and requested
      if (audioUrl && includeAudio && currentTemplate.requiresAudio) {
        try {
          // Note: Adding audio to canvas stream requires more complex handling
          // For now, we'll generate video without audio and note this limitation
          console.log("Audio integration would require server-side processing");
        } catch (e) {
          console.warn("Could not add audio to stream:", e);
        }
      }

      mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000, // 8 Mbps for high quality
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder!.onstop = () => {
          const blob = new Blob(recordedChunks, { type: "video/webm" });
          resolve(blob);
        };
      });

      mediaRecorder.start();

      // Render frames
      for (let frame = 0; frame < totalFrames; frame++) {
        drawFrame(ctx, img, frame, totalFrames, canvas.width, canvas.height, particles);

        // Update progress
        setProgress(Math.round((frame / totalFrames) * 100));

        // Wait for next frame timing
        await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
      }

      mediaRecorder.stop();

      const videoBlob = await recordingPromise;

      // Create download URL
      if (generatedVideoUrl) {
        URL.revokeObjectURL(generatedVideoUrl);
      }
      const url = URL.createObjectURL(videoBlob);
      setGeneratedVideoUrl(url);

      // Callback
      onVideoGenerated?.(videoBlob, selectedOrientation);

      setProgress(100);
    } catch (err) {
      console.error("Video generation error:", err);
      setError("Error al generar el video. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  }, [
    loadImage,
    drawFrame,
    currentOrientation,
    currentTemplate,
    textColor,
    audioUrl,
    includeAudio,
    selectedOrientation,
    generatedVideoUrl,
    onVideoGenerated,
  ]);

  // Download video
  const downloadVideo = useCallback(() => {
    if (!generatedVideoUrl) return;

    const a = document.createElement("a");
    a.href = generatedVideoUrl;
    a.download = `${artistName.toLowerCase().replace(/\s+/g, "-")}-${title.toLowerCase().replace(/\s+/g, "-")}-presave-${selectedOrientation}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [generatedVideoUrl, artistName, title, selectedOrientation]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-oswald text-xl uppercase flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Generador de Video
          </h3>
          <p className="text-sm text-slc-muted mt-1">
            Crea videos promocionales automáticos para redes sociales
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
          className={showSettings ? "bg-slc-card" : ""}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="p-4 bg-slc-dark border border-slc-border rounded-xl space-y-4">
          <h4 className="font-oswald text-sm uppercase text-slc-muted">Personalización</h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm mb-2">Color de texto</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-10 rounded border border-slc-border cursor-pointer"
                />
                <span className="text-sm font-mono">{textColor}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArtistName}
                  onChange={(e) => setShowArtistName(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Mostrar nombre de artista</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTitle}
                  onChange={(e) => setShowTitle(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Mostrar título</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCountdown}
                  onChange={(e) => setShowCountdown(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Mostrar countdown</span>
              </label>
              {audioUrl && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAudio}
                    onChange={(e) => setIncludeAudio(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Incluir audio</span>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orientation selector */}
      <div>
        <label className="block text-sm text-slc-muted mb-2">Orientación</label>
        <div className="flex gap-2">
          {ORIENTATIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelectedOrientation(o.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                selectedOrientation === o.id
                  ? "bg-primary border-primary text-white"
                  : "bg-slc-card border-slc-border text-slc-muted hover:text-white"
              }`}
            >
              {o.icon}
              <span className="text-sm">{o.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Template selector */}
      <div>
        <label className="block text-sm text-slc-muted mb-2">Template</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedTemplate(template.id)}
              disabled={template.requiresAudio && !audioUrl}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedTemplate === template.id
                  ? "bg-primary/10 border-primary"
                  : template.requiresAudio && !audioUrl
                  ? "bg-slc-card/50 border-slc-border opacity-50 cursor-not-allowed"
                  : "bg-slc-card border-slc-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {template.icon}
                <span className="font-medium text-sm">{template.name}</span>
              </div>
              <p className="text-xs text-slc-muted line-clamp-2">{template.description}</p>
              {template.requiresAudio && !audioUrl && (
                <p className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
                  <Music className="w-3 h-3" />
                  Requiere audio
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview canvas */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-slc-muted">Vista previa</label>
          <Button
            variant="ghost"
            size="sm"
            onClick={isPreviewPlaying ? stopPreview : startPreview}
          >
            {isPreviewPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Pausar
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </>
            )}
          </Button>
        </div>

        <div
          className={`relative bg-slc-dark rounded-xl overflow-hidden flex items-center justify-center ${
            selectedOrientation === "vertical" ? "aspect-[9/16] max-h-[500px]" :
            selectedOrientation === "square" ? "aspect-square max-h-[400px]" :
            "aspect-video"
          }`}
          style={{ backgroundColor }}
        >
          <canvas
            ref={previewCanvasRef}
            className="max-w-full max-h-full"
          />

          {!isPreviewPlaying && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
              <Play className="w-12 h-12 text-white/80 mb-2" />
              <span className="text-sm text-white/60">Click Preview para ver animación</span>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Progress bar */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slc-muted">Generando video...</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slc-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={generateVideo}
          disabled={isGenerating || !coverImageUrl}
          className="flex-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Video className="w-4 h-4 mr-2" />
              Generar Video
            </>
          )}
        </Button>

        {generatedVideoUrl && (
          <Button variant="outline" onClick={downloadVideo}>
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
        )}
      </div>

      {/* Generated video preview */}
      {generatedVideoUrl && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-green-500" />
            <span className="font-medium text-green-500">Video generado exitosamente</span>
          </div>
          <video
            src={generatedVideoUrl}
            controls
            className={`w-full rounded-lg ${
              selectedOrientation === "vertical" ? "max-h-[400px] mx-auto" : ""
            }`}
          />
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
        <h4 className="font-oswald text-sm uppercase mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Tips
        </h4>
        <ul className="text-xs text-slc-muted space-y-1">
          <li>• <strong>Vertical:</strong> Ideal para Instagram Reels, TikTok y Stories</li>
          <li>• <strong>Horizontal:</strong> Para YouTube y embeds en web</li>
          <li>• <strong>Cuadrado:</strong> Funciona bien en Instagram Feed y Twitter</li>
          <li>• El video se genera en WebM - puedes convertirlo a MP4 si lo necesitas</li>
        </ul>
      </div>
    </div>
  );
}

export default VideoGenerator;
