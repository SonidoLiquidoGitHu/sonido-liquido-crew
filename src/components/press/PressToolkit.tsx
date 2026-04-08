"use client";

import { useState, useCallback } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import {
  Copy,
  Check,
  Share2,
  Code,
  Instagram,
  Twitter,
  Facebook,
  CheckCircle,
  XCircle,
  Mail,
  MessageSquare,
  Image as ImageIcon,
  Music,
  Video,
  FileText,
  Package,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Linkedin,
  QrCode,
  Loader2,
  Sparkles,
  Calendar,
  Clock,
  Users,
  Disc3,
  Link2,
  Eye,
  Zap,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaRelease {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  category: string;
  summary: string | null;
  content: string | null;
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  galleryImages: string | null;
  audioPreviewUrl: string | null;
  audioTracks: string | null;
  spotifyEmbedUrl: string | null;
  youtubeVideoId: string | null;
  pressKitUrl: string | null;
  highResImagesUrl: string | null;
  credits: string | null;
  tags: string | null;
  releaseDate?: string | null;
  artistName?: string | null;
}

interface PressToolkitProps {
  release: MediaRelease;
  pageUrl: string;
  artistName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// Copy button component
function CopyBtn({ text, label, variant = "default" }: { text: string; label: string; variant?: "default" | "primary" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const baseClasses = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all";
  const variantClasses = variant === "primary"
    ? copied
      ? "bg-green-500 text-white"
      : "bg-primary text-white hover:bg-primary/90"
    : copied
      ? "bg-green-500/20 text-green-500 border border-green-500/30"
      : "bg-slc-dark text-slc-muted hover:text-white hover:bg-slc-card border border-slc-border";

  return (
    <button onClick={handleCopy} className={`${baseClasses} ${variantClasses}`}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copiado!" : label}
    </button>
  );
}

// Section wrapper component
function Section({
  title,
  icon: Icon,
  badge,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ElementType;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slc-card border border-slc-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slc-dark/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-oswald text-sm uppercase">{title}</h3>
          {badge && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slc-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slc-muted" />
        )}
      </button>

      {expanded && (
        <div className="p-4 pt-0 border-t border-slc-border/50">
          {children}
        </div>
      )}
    </div>
  );
}

// Social platform card
function SocialCard({
  platform,
  icon: Icon,
  color,
  caption,
  charLimit,
  children,
}: {
  platform: string;
  icon: React.ElementType;
  color: string;
  caption: string;
  charLimit?: number;
  children?: React.ReactNode;
}) {
  const isOverLimit = charLimit && caption.length > charLimit;

  return (
    <div className="p-4 bg-slc-dark/50 rounded-xl border border-slc-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-sm">{platform}</span>
          {charLimit && (
            <span className={`text-xs px-2 py-0.5 rounded ${isOverLimit ? "bg-red-500/20 text-red-500" : "bg-slc-card text-slc-muted"}`}>
              {caption.length}/{charLimit}
            </span>
          )}
        </div>
        <CopyBtn text={caption} label="Copiar" />
      </div>
      <textarea
        readOnly
        value={caption}
        rows={4}
        className="w-full px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-xs resize-none focus:outline-none"
      />
      {children}
    </div>
  );
}

// TikTok icon SVG
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  );
}

// WhatsApp icon SVG
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export function PressToolkit({
  release,
  pageUrl,
  artistName = "Sonido Líquido Crew",
  contactEmail = "prensasonidoliquido@gmail.com",
  contactPhone = "+52 55 2801 1881",
}: PressToolkitProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["social"]));
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Parse tags
  const tags = release.tags ? JSON.parse(release.tags) : [];
  const hashtags = tags.map((t: string) => `#${t.replace(/\s+/g, "")}`).join(" ");
  const baseHashtags = "#SonidoLiquido #HipHopMexicano #RapMexicano #MusicaMexicana";

  // Format release date
  const releaseDate = release.releaseDate ? new Date(release.releaseDate) : null;
  const formattedDate = releaseDate
    ? releaseDate.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
    : null;

  // ============================================
  // SOCIAL MEDIA CAPTIONS
  // ============================================

  const instagramCaption = `🎵 ${release.title}${release.subtitle ? ` - ${release.subtitle}` : ""}

${release.summary || "Nueva música disponible ahora."}

🔗 Link en bio
${formattedDate ? `📅 ${formattedDate}` : ""}

${hashtags}
${baseHashtags}`;

  const twitterCaption = `🎵 ${release.title}${release.subtitle ? ` - ${release.subtitle}` : ""}

${(release.summary || "").slice(0, 120)}${(release.summary || "").length > 120 ? "..." : ""}

🔗 ${pageUrl}

${hashtags.split(" ").slice(0, 3).join(" ")} #HipHop`;

  const facebookCaption = `🎵 NUEVO: ${release.title}

${release.summary || ""}

👉 Escúchalo ahora: ${pageUrl}

${hashtags}
${baseHashtags}`;

  const linkedInCaption = `🎵 Nueva producción musical: ${release.title}

${release.summary || ""}

Como parte de Sonido Líquido Crew, seguimos comprometidos con el desarrollo del Hip Hop mexicano y la escena independiente.

🔗 Más información: ${pageUrl}

${hashtags.split(" ").slice(0, 5).join(" ")}`;

  const tiktokCaption = `${release.title} 🔥

${(release.summary || "").slice(0, 100)}

${hashtags.split(" ").slice(0, 5).join(" ")} #HipHop #RapEnEspañol #MusicaNueva #fyp #parati`;

  const whatsappMessage = `🎵 *${release.title}*${release.subtitle ? ` - ${release.subtitle}` : ""}

${release.summary || "Nueva música disponible!"}

🔗 ${pageUrl}

¡Escúchalo y compártelo! 🙌`;

  const telegramMessage = `🎵 *${release.title}*

${release.summary || ""}

👉 [Escuchar ahora](${pageUrl})

${hashtags}`;

  // ============================================
  // EMBED CODES
  // ============================================

  const iframeEmbed = `<iframe
  src="${pageUrl}"
  width="100%"
  height="600"
  frameborder="0"
  loading="lazy"
  title="${release.title}"
></iframe>`;

  const spotifyEmbed = release.spotifyEmbedUrl
    ? `<iframe
  src="https://open.spotify.com/embed/track/${release.spotifyEmbedUrl.split("/").pop()?.split("?")[0]}"
  width="100%"
  height="152"
  frameBorder="0"
  allowfullscreen
  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
  loading="lazy"
></iframe>`
    : null;

  const youtubeEmbed = release.youtubeVideoId
    ? `<iframe
  width="560"
  height="315"
  src="https://www.youtube.com/embed/${release.youtubeVideoId}"
  title="${release.title}"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
></iframe>`
    : null;

  // ============================================
  // ASSET CHECKLIST
  // ============================================

  const assets = [
    { name: "Portada HD", available: !!release.coverImageUrl, icon: ImageIcon, url: release.coverImageUrl },
    { name: "Banner", available: !!release.bannerImageUrl, icon: ImageIcon, url: release.bannerImageUrl },
    { name: "Galería", available: !!release.galleryImages && JSON.parse(release.galleryImages).length > 0, icon: ImageIcon },
    { name: "Audio Preview", available: !!release.audioPreviewUrl, icon: Music, url: release.audioPreviewUrl },
    { name: "Video", available: !!release.youtubeVideoId, icon: Video },
    { name: "Spotify", available: !!release.spotifyEmbedUrl, icon: Music },
    { name: "Press Kit PDF", available: !!release.pressKitUrl, icon: Package, url: release.pressKitUrl },
    { name: "Fotos Hi-Res", available: !!release.highResImagesUrl, icon: ImageIcon, url: release.highResImagesUrl },
    { name: "Créditos", available: !!release.credits, icon: FileText },
  ];

  const availableCount = assets.filter((a) => a.available).length;

  // ============================================
  // QUICK FACTS
  // ============================================

  const quickFacts = [
    { label: "Título", value: release.title, icon: Disc3 },
    { label: "Artista", value: release.artistName || artistName, icon: Users },
    { label: "Categoría", value: release.category, icon: FileText },
    ...(formattedDate ? [{ label: "Fecha", value: formattedDate, icon: Calendar }] : []),
  ];

  // ============================================
  // PRESS BOILERPLATE
  // ============================================

  const pressBoilerplate = `**Sobre ${artistName}**

Sonido Líquido Crew es un colectivo de Hip Hop mexicano fundado en 1999 en la Ciudad de México. Con más de 25 años de trayectoria, el crew ha sido fundamental en el desarrollo y profesionalización del Hip Hop en México.

**Contacto de Prensa:**
Email: ${contactEmail}
Teléfono: ${contactPhone}
Web: https://sonidoliquido.com/prensa

**Redes Sociales:**
Instagram: @sonidoliquido
YouTube: @sonidoliquidocrew
Spotify: Sonido Líquido Crew`;

  // ============================================
  // EMAIL TEMPLATES
  // ============================================

  const emailSubject = `Press Release: ${release.title} - ${artistName}`;

  const emailBody = `Estimado equipo editorial,

Me pongo en contacto para compartir información sobre nuestro más reciente lanzamiento:

**${release.title}**${release.subtitle ? `\n${release.subtitle}` : ""}

${release.summary || ""}

**Información del lanzamiento:**
- Artista: ${release.artistName || artistName}
- Categoría: ${release.category}${formattedDate ? `\n- Fecha: ${formattedDate}` : ""}

**Enlaces:**
- Página del lanzamiento: ${pageUrl}${release.spotifyEmbedUrl ? `\n- Spotify: ${release.spotifyEmbedUrl}` : ""}${release.youtubeVideoId ? `\n- YouTube: https://youtube.com/watch?v=${release.youtubeVideoId}` : ""}

Quedo a su disposición para entrevistas, material adicional o cualquier información que requieran.

Saludos cordiales,

${artistName}
${contactEmail}
${contactPhone}`;

  const mediaAlertEmail = `MEDIA ALERT

${release.title.toUpperCase()}
${artistName}
${formattedDate || "Disponible ahora"}

${release.summary || ""}

MATERIAL DISPONIBLE:
${assets.filter(a => a.available).map(a => `✓ ${a.name}`).join("\n")}

CONTACTO:
${contactEmail}
${contactPhone}

---
Para darse de baja de esta lista, responda a este correo.`;

  // ============================================
  // GENERATE SHARE IMAGE
  // ============================================

  const generateShareImage = useCallback(async (): Promise<string | null> => {
    setGeneratingImage(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Instagram story size (9:16)
      canvas.width = 1080;
      canvas.height = 1920;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#1a1a1a");
      gradient.addColorStop(0.5, "#0d0d0d");
      gradient.addColorStop(1, "#000000");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Orange accent at top
      const accentGradient = ctx.createLinearGradient(0, 0, canvas.width, 400);
      accentGradient.addColorStop(0, "rgba(249, 115, 22, 0.4)");
      accentGradient.addColorStop(1, "rgba(249, 115, 22, 0)");
      ctx.fillStyle = accentGradient;
      ctx.fillRect(0, 0, canvas.width, 500);

      // Category badge
      ctx.font = "bold 28px sans-serif";
      ctx.fillStyle = "#f97316";
      ctx.textAlign = "center";
      ctx.fillText(release.category.toUpperCase(), canvas.width / 2, 150);

      // Title
      ctx.font = "bold 72px sans-serif";
      ctx.fillStyle = "#ffffff";
      const titleLines = wrapText(ctx, release.title.toUpperCase(), canvas.width - 100);
      let titleY = 280;
      for (const line of titleLines.slice(0, 3)) {
        ctx.fillText(line, canvas.width / 2, titleY);
        titleY += 85;
      }

      // Subtitle
      if (release.subtitle) {
        ctx.font = "36px sans-serif";
        ctx.fillStyle = "#999999";
        ctx.fillText(release.subtitle, canvas.width / 2, titleY + 20);
      }

      // Cover image area
      const coverSize = 500;
      const coverX = (canvas.width - coverSize) / 2;
      const coverY = 550;

      if (release.coverImageUrl) {
        try {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = release.coverImageUrl!;
          });

          // Draw rounded rectangle clip
          ctx.save();
          roundRect(ctx, coverX, coverY, coverSize, coverSize, 24);
          ctx.clip();
          ctx.drawImage(img, coverX, coverY, coverSize, coverSize);
          ctx.restore();

          // Border
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 4;
          roundRect(ctx, coverX, coverY, coverSize, coverSize, 24);
          ctx.stroke();
        } catch {
          // Fallback
          ctx.fillStyle = "#222222";
          roundRect(ctx, coverX, coverY, coverSize, coverSize, 24);
          ctx.fill();
          ctx.font = "120px sans-serif";
          ctx.fillStyle = "#f97316";
          ctx.fillText("🎵", canvas.width / 2, coverY + coverSize / 2 + 40);
        }
      }

      // Summary
      if (release.summary) {
        ctx.font = "32px sans-serif";
        ctx.fillStyle = "#cccccc";
        ctx.textAlign = "center";
        const summaryLines = wrapText(ctx, release.summary, canvas.width - 120);
        let summaryY = coverY + coverSize + 80;
        for (const line of summaryLines.slice(0, 3)) {
          ctx.fillText(line, canvas.width / 2, summaryY);
          summaryY += 45;
        }
      }

      // Artist name
      ctx.font = "bold 36px sans-serif";
      ctx.fillStyle = "#f97316";
      ctx.fillText(release.artistName || artistName, canvas.width / 2, canvas.height - 280);

      // CTA
      ctx.font = "bold 42px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("ESCÚCHALO AHORA", canvas.width / 2, canvas.height - 180);

      ctx.font = "32px sans-serif";
      ctx.fillStyle = "#999999";
      ctx.fillText("sonidoliquido.com", canvas.width / 2, canvas.height - 120);

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Error generating image:", err);
      return null;
    } finally {
      setGeneratingImage(false);
    }
  }, [release, artistName]);

  // Helper function to wrap text
  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Helper function for rounded rectangles
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

  const downloadShareImage = async () => {
    const imageUrl = await generateShareImage();
    if (imageUrl) {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${release.slug}-share-image.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // ============================================
  // GENERATE QR CODE
  // ============================================

  const generateQRCode = useCallback(async () => {
    setGeneratingQR(true);
    try {
      // Use QR Code API
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(pageUrl)}&bgcolor=0d0d0d&color=f97316`;
      setQrCodeUrl(qrUrl);
    } finally {
      setGeneratingQR(false);
    }
  }, [pageUrl]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4">
      {/* Quick Facts Card */}
      <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-oswald text-sm uppercase">Quick Facts</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickFacts.map((fact, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <fact.icon className="w-4 h-4 text-slc-muted" />
              <div>
                <span className="text-xs text-slc-muted">{fact.label}:</span>
                <span className="text-sm ml-1 font-medium">{fact.value}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slc-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slc-muted">Link de prensa:</span>
            <CopyBtn text={pageUrl} label="Copiar URL" variant="primary" />
          </div>
        </div>
      </div>

      {/* Social Media Kit */}
      <Section
        title="Social Media Kit"
        icon={Share2}
        badge={`6 plataformas`}
        expanded={expandedSections.has("social")}
        onToggle={() => toggleSection("social")}
      >
        <div className="space-y-4 mt-4">
          {/* Instagram */}
          <SocialCard
            platform="Instagram"
            icon={Instagram}
            color="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400"
            caption={instagramCaption}
            charLimit={2200}
          />

          {/* TikTok */}
          <SocialCard
            platform="TikTok"
            icon={TikTokIcon}
            color="bg-black"
            caption={tiktokCaption}
            charLimit={2200}
          />

          {/* Twitter/X */}
          <SocialCard
            platform="Twitter / X"
            icon={Twitter}
            color="bg-black"
            caption={twitterCaption}
            charLimit={280}
          />

          {/* Facebook */}
          <SocialCard
            platform="Facebook"
            icon={Facebook}
            color="bg-blue-600"
            caption={facebookCaption}
          />

          {/* LinkedIn */}
          <SocialCard
            platform="LinkedIn"
            icon={Linkedin}
            color="bg-[#0A66C2]"
            caption={linkedInCaption}
            charLimit={3000}
          />

          {/* WhatsApp */}
          <SocialCard
            platform="WhatsApp"
            icon={WhatsAppIcon}
            color="bg-[#25D366]"
            caption={whatsappMessage}
          >
            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-3 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#20BD5A] transition-colors"
            >
              <Send className="w-4 h-4" />
              Abrir en WhatsApp
            </a>
          </SocialCard>

          {/* Hashtags Section */}
          {tags.length > 0 && (
            <div className="p-4 bg-slc-dark/50 rounded-xl border border-slc-border/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slc-muted uppercase tracking-wider">Hashtags Recomendados</span>
                <CopyBtn text={`${hashtags} ${baseHashtags}`} label="Copiar todos" />
              </div>
              <div className="flex flex-wrap gap-2">
                {[...tags, "SonidoLiquido", "HipHopMexicano", "RapMexicano"].map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-slc-card rounded-full text-xs text-slc-muted hover:text-white hover:bg-primary/20 cursor-pointer transition-colors"
                    onClick={() => navigator.clipboard.writeText(`#${tag.replace(/\s+/g, "")}`)}
                  >
                    #{tag.replace(/\s+/g, "")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Share Image Generator */}
      <Section
        title="Imagen para Compartir"
        icon={ImageIcon}
        expanded={expandedSections.has("image")}
        onToggle={() => toggleSection("image")}
      >
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slc-muted">
            Genera una imagen optimizada para Stories de Instagram/TikTok (1080x1920).
          </p>
          <Button
            onClick={downloadShareImage}
            disabled={generatingImage}
            className="w-full"
          >
            {generatingImage ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Descargar Imagen para Stories
              </>
            )}
          </Button>
          {release.coverImageUrl && (
            <div className="aspect-[9/16] max-w-[200px] mx-auto rounded-xl overflow-hidden border border-slc-border bg-slc-dark">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center p-4">
                  <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-xs text-slc-muted">Preview de la imagen</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* QR Code */}
      <Section
        title="Código QR"
        icon={QrCode}
        expanded={expandedSections.has("qr")}
        onToggle={() => toggleSection("qr")}
      >
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slc-muted">
            Genera un código QR para acceso rápido desde dispositivos móviles.
          </p>
          {!qrCodeUrl ? (
            <Button
              onClick={generateQRCode}
              disabled={generatingQR}
              variant="outline"
              className="w-full"
            >
              {generatingQR ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Generar Código QR
                </>
              )}
            </Button>
          ) : (
            <div className="text-center space-y-4">
              <div className="inline-block p-4 bg-white rounded-xl">
                <SafeImage
                  src={qrCodeUrl}
                  alt="QR Code"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              </div>
              <div className="flex gap-2 justify-center">
                <a
                  href={qrCodeUrl}
                  download={`${release.slug}-qr.png`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </a>
                <CopyBtn text={qrCodeUrl} label="Copiar URL" />
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Embed Codes */}
      <Section
        title="Códigos de Embed"
        icon={Code}
        badge={`${[iframeEmbed, spotifyEmbed, youtubeEmbed].filter(Boolean).length} disponibles`}
        expanded={expandedSections.has("embed")}
        onToggle={() => toggleSection("embed")}
      >
        <div className="space-y-4 mt-4">
          {/* Page iFrame */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Página completa</span>
              <CopyBtn text={iframeEmbed} label="Copiar" />
            </div>
            <pre className="px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
              {iframeEmbed}
            </pre>
          </div>

          {/* Spotify */}
          {spotifyEmbed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#1DB954]" />
                  Spotify
                </span>
                <CopyBtn text={spotifyEmbed} label="Copiar" />
              </div>
              <pre className="px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                {spotifyEmbed}
              </pre>
            </div>
          )}

          {/* YouTube */}
          {youtubeEmbed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Video className="w-4 h-4 text-red-500" />
                  YouTube
                </span>
                <CopyBtn text={youtubeEmbed} label="Copiar" />
              </div>
              <pre className="px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                {youtubeEmbed}
              </pre>
            </div>
          )}
        </div>
      </Section>

      {/* Asset Checklist & Downloads */}
      <Section
        title="Assets Disponibles"
        icon={Package}
        badge={`${availableCount}/${assets.length}`}
        expanded={expandedSections.has("assets")}
        onToggle={() => toggleSection("assets")}
      >
        <div className="mt-4 space-y-4">
          {/* Checklist */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {assets.map((asset, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  asset.available
                    ? "bg-green-500/10 text-green-500"
                    : "bg-slc-dark/50 text-slc-muted/50"
                }`}
              >
                {asset.available ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">{asset.name}</span>
              </div>
            ))}
          </div>

          {/* Download Links */}
          {assets.filter((a) => a.available && a.url).length > 0 && (
            <div className="pt-4 border-t border-slc-border/50">
              <h4 className="text-xs text-slc-muted uppercase mb-3">Descargas Directas</h4>
              <div className="flex flex-wrap gap-2">
                {assets
                  .filter((a) => a.available && a.url)
                  .map((asset, idx) => (
                    <a
                      key={idx}
                      href={asset.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-xs hover:border-primary hover:text-primary transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      {asset.name}
                    </a>
                  ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Email Templates */}
      <Section
        title="Plantillas de Email"
        icon={Mail}
        badge="2 plantillas"
        expanded={expandedSections.has("email")}
        onToggle={() => toggleSection("email")}
      >
        <div className="space-y-4 mt-4">
          {/* Press Release Email */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Correo de Prensa</span>
              <div className="flex gap-2">
                <CopyBtn text={emailBody} label="Copiar cuerpo" />
                <a
                  href={`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Abrir en Mail
                </a>
              </div>
            </div>
            <textarea
              readOnly
              value={emailBody}
              rows={10}
              className="w-full px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-xs resize-none focus:outline-none"
            />
          </div>

          {/* Media Alert */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Media Alert (Breve)</span>
              <CopyBtn text={mediaAlertEmail} label="Copiar" />
            </div>
            <textarea
              readOnly
              value={mediaAlertEmail}
              rows={8}
              className="w-full px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-xs resize-none focus:outline-none"
            />
          </div>
        </div>
      </Section>

      {/* Press Boilerplate */}
      <Section
        title="Información de Contacto"
        icon={FileText}
        expanded={expandedSections.has("boilerplate")}
        onToggle={() => toggleSection("boilerplate")}
      >
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Boilerplate de Prensa</span>
            <CopyBtn text={pressBoilerplate} label="Copiar todo" />
          </div>
          <textarea
            readOnly
            value={pressBoilerplate}
            rows={12}
            className="w-full px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-xs resize-none focus:outline-none font-mono"
          />

          {/* Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slc-border/50">
            <a
              href={`mailto:${contactEmail}`}
              className="flex items-center gap-3 p-3 bg-slc-dark rounded-lg hover:bg-slc-card transition-colors"
            >
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-slc-muted">Email</p>
                <p className="text-sm font-medium">{contactEmail}</p>
              </div>
            </a>
            <a
              href={`tel:${contactPhone.replace(/\s/g, "")}`}
              className="flex items-center gap-3 p-3 bg-slc-dark rounded-lg hover:bg-slc-card transition-colors"
            >
              <MessageSquare className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-slc-muted">Teléfono</p>
                <p className="text-sm font-medium">{contactPhone}</p>
              </div>
            </a>
          </div>
        </div>
      </Section>

      {/* Quick Actions Footer */}
      <div className="flex flex-wrap gap-2 pt-4">
        <a
          href={`mailto:${contactEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 p-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Mail className="w-4 h-4" />
          Enviar por Email
        </a>
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 p-3 bg-slc-dark border border-slc-border rounded-xl text-sm text-slc-muted hover:text-white hover:border-primary transition-colors"
        >
          <Eye className="w-4 h-4" />
          Ver Página
        </a>
        <button
          onClick={() => navigator.clipboard.writeText(pageUrl)}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 p-3 bg-slc-dark border border-slc-border rounded-xl text-sm text-slc-muted hover:text-white hover:border-primary transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Copiar Link
        </button>
      </div>
    </div>
  );
}
