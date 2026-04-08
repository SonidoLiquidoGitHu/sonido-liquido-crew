"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Music,
  Check,
  Mail,
  ExternalLink,
  ArrowRight,
  Download,
  Loader2,
  Play,
  Pause,
  Instagram,
  Facebook,
  User,
} from "lucide-react";
import { UnlockLanding } from "@/components/public/UnlockLanding";
import { ShareButtons } from "@/components/ui/share-button";

export interface Beat {
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
  previewAudioUrl: string | null;
  fullAudioUrl: string | null;
  coverImageUrl: string | null;
  previewVideoUrl: string | null;
  youtubeVideoId: string | null;
  videoIsVertical: boolean;
  isFree: boolean;
  price: number | null;
  gateEnabled: boolean;
  requireEmail: boolean;
  requireSpotifyFollow: boolean;
  spotifyArtistUrl: string | null;
  requireSpotifyPlay: boolean;
  spotifySongUrl: string | null;
  requireHyperfollow: boolean;
  hyperfollowUrl: string | null;
  requireInstagramShare: boolean;
  instagramShareText: string | null;
  requireFacebookShare: boolean;
  facebookShareText: string | null;
  requireCustomAction: boolean;
  customActionLabel: string | null;
  customActionUrl: string | null;
  customActionInstructions: string | null;
  isActive: boolean;
}

interface BeatPageClientProps {
  initialBeat: Beat | null;
  slug: string;
}

export default function BeatPageClient({ initialBeat, slug }: BeatPageClientProps) {
  const [beat, setBeat] = useState<Beat | null>(initialBeat);
  const [loading, setLoading] = useState(!initialBeat);
  const [error, setError] = useState<string | null>(null);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  // Action states
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [spotifyFollowCompleted, setSpotifyFollowCompleted] = useState(false);
  const [spotifyPlayCompleted, setSpotifyPlayCompleted] = useState(false);
  const [hyperfollowCompleted, setHyperfollowCompleted] = useState(false);
  const [instagramShareCompleted, setInstagramShareCompleted] = useState(false);
  const [facebookShareCompleted, setFacebookShareCompleted] = useState(false);
  const [customActionCompleted, setCustomActionCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!initialBeat) {
      fetchBeat();
    }
  }, [slug, initialBeat]);

  const fetchBeat = async () => {
    try {
      const res = await fetch(`/api/beats/${slug}`);
      const data = await res.json();
      if (data.success) {
        setBeat(data.data);
      } else {
        setError(data.error || "Beat not found");
      }
    } catch (err) {
      setError("Failed to load beat");
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (!beat?.previewAudioUrl) return;

    if (!audioRef) {
      const audio = new Audio(beat.previewAudioUrl);
      audio.addEventListener("ended", () => setIsPlaying(false));
      setAudioRef(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioRef.pause();
        setIsPlaying(false);
      } else {
        audioRef.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSubmit = async () => {
    if (!beat) return;

    if (beat.requireEmail && !email) {
      alert("Por favor ingresa tu email");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/beats/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          completedSpotifyFollow: spotifyFollowCompleted,
          completedSpotifyPlay: spotifyPlayCompleted,
          completedHyperfollow: hyperfollowCompleted,
          completedInstagramShare: instagramShareCompleted,
          completedFacebookShare: facebookShareCompleted,
          completedCustomAction: customActionCompleted,
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
    if (beat?.spotifyArtistUrl) {
      window.open(beat.spotifyArtistUrl, "_blank");
      setTimeout(() => setSpotifyFollowCompleted(true), 2000);
    }
  };

  const handleSpotifyPlay = () => {
    if (beat?.spotifySongUrl) {
      window.open(beat.spotifySongUrl, "_blank");
      setTimeout(() => setSpotifyPlayCompleted(true), 3000);
    }
  };

  const handleHyperfollow = () => {
    if (beat?.hyperfollowUrl) {
      window.open(beat.hyperfollowUrl, "_blank");
      setTimeout(() => setHyperfollowCompleted(true), 2000);
    }
  };

  const handleInstagramShare = () => {
    const text = beat?.instagramShareText || `Check out this beat: ${beat?.title}`;
    navigator.clipboard.writeText(text);
    alert("Texto copiado. Pégalo en tu historia de Instagram");
    setInstagramShareCompleted(true);
  };

  const handleFacebookShare = () => {
    const text = beat?.facebookShareText || `Check out this beat: ${beat?.title}`;
    const url = window.location.href;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      "_blank",
      "width=600,height=400"
    );
    setTimeout(() => setFacebookShareCompleted(true), 2000);
  };

  const handleCustomAction = () => {
    if (beat?.customActionUrl) {
      window.open(beat.customActionUrl, "_blank");
      setTimeout(() => setCustomActionCompleted(true), 2000);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !beat) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Music className="w-16 h-16 text-slc-muted mb-4" />
        <h1 className="text-2xl font-oswald uppercase mb-2">Beat No Encontrado</h1>
        <p className="text-slc-muted mb-6">{error || "Este beat no existe"}</p>
        <Button asChild>
          <Link href="/beats">
            <ArrowRight className="w-4 h-4 mr-2" />
            Ver Todos los Beats
          </Link>
        </Button>
      </div>
    );
  }

  const allActionsCompleted =
    (!beat.requireEmail || email) &&
    (!beat.requireSpotifyFollow || spotifyFollowCompleted) &&
    (!beat.requireSpotifyPlay || spotifyPlayCompleted) &&
    (!beat.requireHyperfollow || hyperfollowCompleted) &&
    (!beat.requireInstagramShare || instagramShareCompleted) &&
    (!beat.requireFacebookShare || facebookShareCompleted) &&
    (!beat.requireCustomAction || customActionCompleted);

  // Show full-page landing when unlocked or gate disabled
  if (unlocked || !beat.gateEnabled) {
    const tags: { label: string; value: string }[] = [];
    if (beat.bpm) tags.push({ label: "BPM", value: String(beat.bpm) });
    if (beat.key) tags.push({ label: "Key", value: beat.key });
    if (beat.genre) tags.push({ label: "Género", value: beat.genre });
    if (beat.duration) tags.push({ label: "Duración", value: formatDuration(beat.duration) });

    return (
      <UnlockLanding
        title={beat.title}
        subtitle={unlocked ? "Beat desbloqueado" : "Descarga gratis"}
        coverImageUrl={beat.coverImageUrl}
        audioUrl={beat.previewAudioUrl || beat.fullAudioUrl}
        videoUrl={beat.previewVideoUrl}
        youtubeVideoId={beat.youtubeVideoId}
        videoIsVertical={beat.videoIsVertical}
        downloadUrl={beat.fullAudioUrl}
        downloadFileName={`${beat.slug}.mp3`}
        artistName={beat.producerName || undefined}
        description={beat.description}
        variant="beat"
        tags={tags}
        contentId={beat.id}
        contentType="beat"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slc-dark to-slc-black py-12">
      <div className="max-w-lg mx-auto px-4">
        {/* Cover & Player */}
        <div className="relative mb-6">
          <div className="aspect-square rounded-xl overflow-hidden shadow-2xl">
            {beat.coverImageUrl ? (
              <SafeImage
                src={beat.coverImageUrl}
                alt={beat.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slc-card flex items-center justify-center">
                <Music className="w-24 h-24 text-slc-muted" />
              </div>
            )}
          </div>

          {/* Play Button Overlay */}
          {beat.previewAudioUrl && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </div>
            </button>
          )}
        </div>

        {/* Title & Info */}
        <h1 className="text-3xl font-oswald uppercase text-center mb-2">{beat.title}</h1>
        {beat.producerName && (
          <p className="text-center text-slc-muted mb-4">
            <User className="w-4 h-4 inline mr-1" />
            {beat.producerName}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {beat.bpm && (
            <span className="text-xs px-3 py-1 bg-slc-card rounded-full">
              {beat.bpm} BPM
            </span>
          )}
          {beat.key && (
            <span className="text-xs px-3 py-1 bg-slc-card rounded-full">{beat.key}</span>
          )}
          {beat.genre && (
            <span className="text-xs px-3 py-1 bg-slc-card rounded-full">{beat.genre}</span>
          )}
          {beat.duration && (
            <span className="text-xs px-3 py-1 bg-slc-card rounded-full">
              {formatDuration(beat.duration)}
            </span>
          )}
        </div>

        {/* Share Buttons */}
        <div className="flex justify-center mb-6">
          <ShareButtons
            title={`${beat.title}${beat.producerName ? ` - ${beat.producerName}` : ""} | Sonido Líquido`}
          />
        </div>

        {/* Description */}
        {beat.description && (
          <p className="text-slc-muted text-center mb-8">{beat.description}</p>
        )}

        {/* Download Gate Actions */}
        <div className="space-y-4 mb-6">
          {/* Email */}
          {beat.requireEmail && (
            <div className="bg-slc-card border border-slc-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${email ? "bg-green-500" : "bg-slc-border"}`}>
                  {email ? <Check className="w-4 h-4 text-white" /> : <Mail className="w-4 h-4 text-slc-muted" />}
                </div>
                <span className="font-medium">Tu email</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary mb-2"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre (opcional)"
                className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {/* Spotify Follow */}
          {beat.requireSpotifyFollow && beat.spotifyArtistUrl && (
            <ActionCard
              icon={<SpotifyIcon />}
              title="Seguir en Spotify"
              completed={spotifyFollowCompleted}
              onAction={handleSpotifyFollow}
              buttonText="Seguir"
              completedText="Siguiendo"
              color="bg-spotify"
            />
          )}

          {/* Spotify Play */}
          {beat.requireSpotifyPlay && beat.spotifySongUrl && (
            <ActionCard
              icon={<Play className="w-4 h-4 text-white" />}
              title="Escuchar canción en Spotify"
              completed={spotifyPlayCompleted}
              onAction={handleSpotifyPlay}
              buttonText="Escuchar"
              completedText="Escuchado"
              color="bg-spotify"
            />
          )}

          {/* Hyperfollow */}
          {beat.requireHyperfollow && beat.hyperfollowUrl && (
            <ActionCard
              icon={<Music className="w-4 h-4 text-white" />}
              title="Hyperfollow en OneRPM"
              completed={hyperfollowCompleted}
              onAction={handleHyperfollow}
              buttonText="Hyperfollow"
              completedText="Completado"
              color="bg-primary"
            />
          )}

          {/* Instagram Share */}
          {beat.requireInstagramShare && (
            <ActionCard
              icon={<Instagram className="w-4 h-4 text-white" />}
              title="Compartir en Instagram"
              completed={instagramShareCompleted}
              onAction={handleInstagramShare}
              buttonText="Compartir"
              completedText="Compartido"
              color="bg-gradient-to-r from-purple-500 to-pink-500"
            />
          )}

          {/* Facebook Share */}
          {beat.requireFacebookShare && (
            <ActionCard
              icon={<Facebook className="w-4 h-4 text-white" />}
              title="Compartir en Facebook"
              completed={facebookShareCompleted}
              onAction={handleFacebookShare}
              buttonText="Compartir"
              completedText="Compartido"
              color="bg-blue-600"
            />
          )}

          {/* Custom Action */}
          {beat.requireCustomAction && beat.customActionUrl && (
            <ActionCard
              icon={<ExternalLink className="w-4 h-4 text-white" />}
              title={beat.customActionLabel || "Acción adicional"}
              completed={customActionCompleted}
              onAction={handleCustomAction}
              buttonText="Completar"
              completedText="Hecho"
              color="bg-orange-500"
              instructions={beat.customActionInstructions}
            />
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          className="w-full"
          size="lg"
          disabled={!allActionsCompleted || submitting}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {submitting ? "Procesando..." : "Desbloquear Descarga"}
        </Button>
      </div>
    </div>
  );
}

// Helper Components
function SpotifyIcon() {
  return (
    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

function ActionCard({
  icon,
  title,
  completed,
  onAction,
  buttonText,
  completedText,
  color,
  instructions,
}: {
  icon: React.ReactNode;
  title: string;
  completed: boolean;
  onAction: () => void;
  buttonText: string;
  completedText: string;
  color: string;
  instructions?: string | null;
}) {
  return (
    <div className="bg-slc-card border border-slc-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${completed ? "bg-green-500" : color}`}>
            {completed ? <Check className="w-4 h-4 text-white" /> : icon}
          </div>
          <div>
            <span className="font-medium">{title}</span>
            {instructions && (
              <p className="text-xs text-slc-muted">{instructions}</p>
            )}
          </div>
        </div>
        <Button
          onClick={onAction}
          variant={completed ? "outline" : "default"}
          size="sm"
          disabled={completed}
        >
          {completed ? completedText : buttonText}
        </Button>
      </div>
    </div>
  );
}
