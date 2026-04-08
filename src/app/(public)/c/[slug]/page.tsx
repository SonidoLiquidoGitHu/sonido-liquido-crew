"use client";

import { useState, useEffect, use } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Music,
  Check,
  Mail,
  ExternalLink,
  Calendar,
  ArrowRight,
  Download,
  Loader2,
} from "lucide-react";
import { UnlockLanding } from "@/components/public/UnlockLanding";
import { ShareButtons } from "@/components/ui/share-button";
import {
  type StyleSettings,
  defaultStyleSettings,
  getStyleVariables,
  getFontClass,
  availableFonts,
} from "@/lib/style-config";

interface Campaign {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  campaignType: string;
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  smartLinkUrl: string | null;
  oneRpmUrl: string | null;
  spotifyPresaveUrl: string | null;
  appleMusicPresaveUrl: string | null;
  downloadGateEnabled: boolean;
  downloadFileUrl: string | null;
  downloadFileName: string | null;
  previewAudioUrl: string | null;
  previewVideoUrl: string | null;
  youtubeVideoId: string | null;
  videoIsVertical: boolean;
  requireSpotifyFollow: boolean;
  spotifyArtistUrl: string | null;
  requireSpotifyPresave: boolean;
  requireEmail: boolean;
  releaseDate: string | null;
  isActive: boolean;
  artistName?: string | null;
  styleSettings?: Partial<StyleSettings> | null;
}

export default function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [email, setEmail] = useState("");
  const [followCompleted, setFollowCompleted] = useState(false);
  const [presaveCompleted, setPresaveCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    fetchCampaign();
  }, [slug]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${slug}`);
      const data = await res.json();
      if (data.success) {
        setCampaign(data.data);
      } else {
        setError(data.error || "Campaign not found");
      }
    } catch (err) {
      setError("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!campaign) return;

    // Validate required actions
    if (campaign.requireEmail && !email) {
      alert("Por favor ingresa tu email");
      return;
    }
    if (campaign.requireSpotifyFollow && !followCompleted) {
      alert("Por favor sigue al artista en Spotify");
      return;
    }
    if (campaign.requireSpotifyPresave && !presaveCompleted) {
      alert("Por favor haz pre-save del lanzamiento");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns/${slug}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          completedFollow: followCompleted,
          completedPresave: presaveCompleted,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUnlocked(true);
      }
    } catch (err) {
      console.error("Error submitting:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpotifyFollow = () => {
    if (campaign?.spotifyArtistUrl) {
      window.open(campaign.spotifyArtistUrl, "_blank");
      setTimeout(() => setFollowCompleted(true), 2000);
    }
  };

  const handlePresave = () => {
    if (campaign?.spotifyPresaveUrl) {
      window.open(campaign.spotifyPresaveUrl, "_blank");
      setTimeout(() => setPresaveCompleted(true), 2000);
    } else if (campaign?.smartLinkUrl) {
      window.open(campaign.smartLinkUrl, "_blank");
      setTimeout(() => setPresaveCompleted(true), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Music className="w-16 h-16 text-slc-muted mb-4" />
        <h1 className="text-2xl font-oswald uppercase mb-2">Campaña No Encontrada</h1>
        <p className="text-slc-muted mb-6">{error || "Esta campaña no existe o ha expirado"}</p>
        <Button asChild>
          <Link href="/">
            <ArrowRight className="w-4 h-4 mr-2" />
            Ir al Inicio
          </Link>
        </Button>
      </div>
    );
  }

  if (!campaign.isActive) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Calendar className="w-16 h-16 text-slc-muted mb-4" />
        <h1 className="text-2xl font-oswald uppercase mb-2">Campaña Finalizada</h1>
        <p className="text-slc-muted mb-6">Esta campaña ya no está activa</p>
        <Button asChild>
          <Link href="/">
            <ArrowRight className="w-4 h-4 mr-2" />
            Ir al Inicio
          </Link>
        </Button>
      </div>
    );
  }

  const allActionsCompleted =
    (!campaign.requireEmail || email) &&
    (!campaign.requireSpotifyFollow || followCompleted) &&
    (!campaign.requireSpotifyPresave || presaveCompleted);

  // Get style settings
  const styles = { ...defaultStyleSettings, ...campaign.styleSettings };
  const styleVars = getStyleVariables(styles);
  const titleFontClass = getFontClass(styles.titleFont);
  const bodyFontClass = getFontClass(styles.bodyFont);

  // Show full-page landing when unlocked
  if (unlocked) {
    return (
      <UnlockLanding
        title={campaign.title}
        subtitle={campaign.campaignType === "presave" ? "Pre-save completado" : undefined}
        coverImageUrl={campaign.coverImageUrl}
        audioUrl={campaign.previewAudioUrl}
        videoUrl={campaign.previewVideoUrl}
        youtubeVideoId={campaign.youtubeVideoId}
        videoIsVertical={campaign.videoIsVertical}
        downloadUrl={campaign.downloadFileUrl}
        downloadFileName={campaign.downloadFileName}
        artistName={campaign.artistName || undefined}
        releaseDate={
          campaign.releaseDate
            ? new Date(campaign.releaseDate).toLocaleDateString("es-MX", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : undefined
        }
        description={campaign.description}
        variant="campaign"
        contentId={campaign.id}
        contentType="campaign"
        styleSettings={campaign.styleSettings || undefined}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slc-dark to-slc-black"
      style={styleVars as React.CSSProperties}
    >
      {/* Banner */}
      {campaign.bannerImageUrl && (
        <div className="w-full h-48 md:h-64 relative">
          <SafeImage
            src={campaign.bannerImageUrl}
            alt={campaign.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slc-dark" />
        </div>
      )}

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8 -mt-16 relative z-10">
        {/* Cover Image */}
        <div className="w-40 h-40 md:w-48 md:h-48 mx-auto mb-6 rounded-lg overflow-hidden shadow-2xl">
          {campaign.coverImageUrl ? (
            <SafeImage
              src={campaign.coverImageUrl}
              alt={campaign.title}
              width={192}
              height={192}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-slc-card flex items-center justify-center">
              <Music className="w-16 h-16 text-slc-muted" />
            </div>
          )}
        </div>

        {/* Title */}
        <h1
          className={`text-3xl md:text-4xl ${titleFontClass} ${styles.titleStyle === "uppercase" ? "uppercase" : ""} text-center mb-2`}
          style={{ color: styles.primaryColor }}
        >
          {campaign.title}
        </h1>

        {/* Release Date */}
        {campaign.releaseDate && (
          <div
            className="flex items-center justify-center gap-2 mb-4"
            style={{ color: styles.primaryColor }}
          >
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(campaign.releaseDate).toLocaleDateString("es-MX", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        )}

        {/* Description */}
        {campaign.description && (
          <p className={`${bodyFontClass} text-slc-muted text-center mb-4`}>{campaign.description}</p>
        )}

        {/* Share Buttons */}
        <div className="flex justify-center mb-8">
          <ShareButtons
            title={`${campaign.title}${campaign.artistName ? ` - ${campaign.artistName}` : ""} | Sonido Líquido`}
          />
        </div>

        {/* Gate Actions */}
        <>
            <div className="space-y-4 mb-6">
              {/* Email */}
              {campaign.requireEmail && (
                <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${email ? "bg-green-500" : "bg-slc-border"}`}>
                      {email ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Mail className="w-4 h-4 text-slc-muted" />
                      )}
                    </div>
                    <span className="font-medium">Ingresa tu email</span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              {/* Spotify Follow */}
              {campaign.requireSpotifyFollow && campaign.spotifyArtistUrl && (
                <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${followCompleted ? "bg-green-500" : "bg-spotify"}`}>
                        {followCompleted ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                        )}
                      </div>
                      <span className="font-medium">Seguir en Spotify</span>
                    </div>
                    <Button
                      onClick={handleSpotifyFollow}
                      variant={followCompleted ? "outline" : "default"}
                      size="sm"
                      disabled={followCompleted}
                    >
                      {followCompleted ? "Hecho" : "Seguir"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Pre-save */}
              {campaign.requireSpotifyPresave && (
                <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${presaveCompleted ? "bg-green-500" : "bg-primary"}`}>
                        {presaveCompleted ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <Music className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="font-medium">Pre-save</span>
                    </div>
                    <Button
                      onClick={handlePresave}
                      variant={presaveCompleted ? "outline" : "default"}
                      size="sm"
                      disabled={presaveCompleted}
                    >
                      {presaveCompleted ? "Guardado" : "Pre-save"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!allActionsCompleted || submitting}
              className={`w-full h-12 px-6 font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                styles.buttonRounded === "full" ? "rounded-full"
                : styles.buttonRounded === "lg" ? "rounded-lg"
                : styles.buttonRounded === "md" ? "rounded-md"
                : styles.buttonRounded === "sm" ? "rounded-sm"
                : "rounded-none"
              }`}
              style={{
                background: styles.buttonStyle === "gradient"
                  ? `linear-gradient(to right, ${styles.primaryColor}, ${styles.secondaryColor})`
                  : styles.buttonStyle === "solid"
                  ? styles.primaryColor
                  : "transparent",
                border: styles.buttonStyle === "outline"
                  ? `2px solid ${styles.primaryColor}`
                  : "none",
                color: styles.buttonStyle === "outline" ? styles.primaryColor : "white",
              }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {submitting ? "Procesando..." : "Completar"}
            </button>

            {/* Direct Smart Link */}
            {campaign.smartLinkUrl && !campaign.downloadGateEnabled && (
              <div className="mt-4">
                <Button asChild variant="outline" className="w-full">
                  <a href={campaign.smartLinkUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Escuchar Ahora
                  </a>
                </Button>
              </div>
            )}
          </>
      </div>
    </div>
  );
}
