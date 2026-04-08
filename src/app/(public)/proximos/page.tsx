"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Rocket, Calendar, Clock, ArrowRight, Star, Bell, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UpcomingRelease } from "@/db/schema/upcoming";

// =============================================
// SKELETON LOADING COMPONENT
// =============================================
function ReleaseCardSkeleton() {
  return (
    <div className="bg-slc-card border border-slc-border rounded-xl overflow-hidden">
      <div className="aspect-square relative bg-slc-dark animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      </div>
      <div className="p-3 space-y-2">
        <div className="h-4 bg-slc-dark rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-slc-dark rounded w-1/2 animate-pulse" />
        <div className="h-3 bg-slc-dark rounded w-1/3 animate-pulse" />
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 blur-[80px] rounded-full" />

        <div className="section-container relative z-10">
          <div className="text-center max-w-2xl mx-auto">
            <div className="h-7 w-32 bg-slc-card rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-12 w-80 bg-slc-card rounded mx-auto mb-4 animate-pulse" />
            <div className="h-5 w-64 bg-slc-card rounded mx-auto animate-pulse" />
          </div>
        </div>
      </section>

      {/* Grid Skeleton */}
      <section className="section-container pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <ReleaseCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

// =============================================
// REAL-TIME COUNTDOWN HOOK
// =============================================
interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function useCountdown(releaseDate: Date | string): TimeRemaining {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => {
    const now = new Date();
    const release = new Date(releaseDate);
    const total = release.getTime() - now.getTime();

    if (total <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
      days: Math.floor(total / (1000 * 60 * 60 * 24)),
      hours: Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((total % (1000 * 60)) / 1000),
      total,
    };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const release = new Date(releaseDate);
      const total = release.getTime() - now.getTime();

      if (total <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        clearInterval(interval);
        return;
      }

      setTimeRemaining({
        days: Math.floor(total / (1000 * 60 * 60 * 24)),
        hours: Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((total % (1000 * 60)) / 1000),
        total,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [releaseDate]);

  return timeRemaining;
}

// =============================================
// RELEASE CARD WITH HOVER & COUNTDOWN
// =============================================
const releaseTypeLabels: Record<string, string> = {
  album: "Álbum",
  ep: "EP",
  single: "Single",
  "maxi-single": "Maxi-Single",
  compilation: "Compilación",
  mixtape: "Mixtape",
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ReleaseCard({ release }: { release: UpcomingRelease }) {
  const [isHovered, setIsHovered] = useState(false);
  const timeRemaining = useCountdown(release.releaseDate);
  const hasPresave = Boolean(release.rpmPresaveUrl || release.spotifyPresaveUrl || release.appleMusicPresaveUrl);

  const formatTimeShort = () => {
    if (timeRemaining.total <= 0) return "¡Ya disponible!";
    if (timeRemaining.days > 30) {
      const months = Math.floor(timeRemaining.days / 30);
      return `${months}m`;
    }
    if (timeRemaining.days > 0) return `${timeRemaining.days}d ${timeRemaining.hours}h`;
    if (timeRemaining.hours > 0) return `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
    return `${timeRemaining.minutes}m ${timeRemaining.seconds}s`;
  };

  // Track presave click
  const trackPresaveClick = (platform: string) => {
    fetch("/api/presave/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        releaseId: release.id,
        platform,
        source: "website",
      }),
    }).catch(() => {}); // Silently fail
  };

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        "bg-slc-card border border-slc-border rounded-xl overflow-hidden transition-all duration-300",
        "hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10",
        isHovered && "transform scale-[1.02]"
      )}>
        {/* Cover */}
        <div className="aspect-square relative overflow-hidden">
          {release.coverImageUrl ? (
            <SafeImage
              src={release.coverImageUrl}
              alt={release.title}
              fill
              className={cn(
                "object-cover transition-all duration-500",
                isHovered ? "scale-110 brightness-50" : "scale-100"
              )}
              unoptimized
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center transition-all duration-300",
                isHovered && "brightness-50"
              )}
              style={{ backgroundColor: release.backgroundColor || "#1a1a1a" }}
            >
              <Rocket className="w-10 h-10 text-slc-muted" />
            </div>
          )}

          {/* Featured badge */}
          {release.isFeatured && (
            <div className={cn(
              "absolute top-2 left-2 px-2 py-0.5 bg-yellow-500/90 rounded-full flex items-center gap-1 transition-opacity",
              isHovered && "opacity-0"
            )}>
              <Star className="w-3 h-3 text-black fill-black" />
              <span className="text-[10px] font-bold text-black uppercase">Destacado</span>
            </div>
          )}

          {/* Countdown Badge */}
          {timeRemaining.total > 0 && (
            <div className={cn(
              "absolute top-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded-full flex items-center gap-1 text-xs transition-all",
              isHovered && "opacity-0"
            )}>
              <Clock className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-white font-medium font-mono">{formatTimeShort()}</span>
            </div>
          )}

          {/* Type badge */}
          <div className={cn(
            "absolute bottom-2 left-2 transition-all",
            isHovered && "opacity-0"
          )}>
            <span className="px-2 py-0.5 bg-primary/90 text-white text-[10px] font-bold uppercase tracking-wider rounded">
              {releaseTypeLabels[release.releaseType] || release.releaseType}
            </span>
          </div>

          {/* Presave indicator */}
          {hasPresave && (
            <div className={cn(
              "absolute bottom-2 right-2 transition-all",
              isHovered && "opacity-0"
            )}>
              <div className="w-6 h-6 rounded-full bg-primary/90 flex items-center justify-center">
                <Bell className="w-3 h-3 text-white" />
              </div>
            </div>
          )}

          {/* HOVER OVERLAY */}
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-3 transition-all duration-300",
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            {/* Live countdown */}
            {timeRemaining.total > 0 && (
              <div className="text-center mb-2">
                <div className="flex items-center gap-1 text-white/80 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  <span>Disponible en</span>
                </div>
                <div className="flex gap-1.5 text-center">
                  {timeRemaining.days > 0 && (
                    <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                      <div className="font-oswald text-lg text-white leading-none">{timeRemaining.days}</div>
                      <div className="text-[8px] text-white/60 uppercase">días</div>
                    </div>
                  )}
                  <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                    <div className="font-oswald text-lg text-white leading-none">{String(timeRemaining.hours).padStart(2, '0')}</div>
                    <div className="text-[8px] text-white/60 uppercase">hrs</div>
                  </div>
                  <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                    <div className="font-oswald text-lg text-white leading-none">{String(timeRemaining.minutes).padStart(2, '0')}</div>
                    <div className="text-[8px] text-white/60 uppercase">min</div>
                  </div>
                  <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                    <div className="font-oswald text-lg text-primary leading-none">{String(timeRemaining.seconds).padStart(2, '0')}</div>
                    <div className="text-[8px] text-white/60 uppercase">seg</div>
                  </div>
                </div>
              </div>
            )}

            {/* Presave Button */}
            {hasPresave ? (
              <Link
                href={release.rpmPresaveUrl || release.spotifyPresaveUrl || release.appleMusicPresaveUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="transform hover:scale-105 transition-transform"
                onClick={() => trackPresaveClick(release.rpmPresaveUrl ? "rpm" : release.spotifyPresaveUrl ? "spotify" : "apple_music")}
              >
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wide shadow-lg shadow-primary/30 gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Pre-save
                </Button>
              </Link>
            ) : (
              <Link href={`/proximos/${release.slug}`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/50 text-white hover:bg-white/10 font-bold uppercase tracking-wide"
                >
                  Ver detalles
                </Button>
              </Link>
            )}

            {/* Platform icons */}
            {hasPresave && (
              <div className="flex gap-2 mt-1">
                {release.spotifyPresaveUrl && (
                  <Link
                    href={release.spotifyPresaveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/40 flex items-center justify-center transition-colors"
                    onClick={() => trackPresaveClick("spotify")}
                  >
                    <svg className="w-4 h-4 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </Link>
                )}
                {release.appleMusicPresaveUrl && (
                  <Link
                    href={release.appleMusicPresaveUrl}
                    target="_blank"
                    onClick={() => trackPresaveClick("apple_music")}
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-[#FC3C44]/20 hover:bg-[#FC3C44]/40 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#FC3C44]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.802.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.8-.335-2.22-1.078-.263-.467-.323-.974-.238-1.498.12-.753.507-1.332 1.172-1.72.322-.188.673-.306 1.032-.396.51-.127 1.026-.234 1.538-.36.29-.07.564-.164.79-.347.263-.212.39-.5.396-.84.005-.268.002-.535.002-.804V7.593c0-.238-.047-.328-.28-.29-.623.1-1.244.203-1.866.306-.997.163-1.994.325-2.99.49-.14.024-.232.1-.26.24-.013.064-.02.13-.02.196v7.645c0 .347-.03.69-.14 1.025-.193.586-.55 1.043-1.092 1.362-.424.25-.89.372-1.378.41-.53.04-1.05-.005-1.544-.217-.773-.33-1.22-.912-1.34-1.74-.093-.64.02-1.25.386-1.8.365-.55.883-.87 1.503-1.032.393-.1.793-.166 1.19-.24.377-.07.755-.136 1.127-.222.252-.06.49-.16.686-.332.22-.194.328-.44.335-.727.002-.054.002-.11.002-.163V5.606c0-.12.013-.24.043-.357.062-.236.195-.402.436-.46.138-.035.28-.057.42-.08.93-.152 1.86-.306 2.79-.457l2.067-.34c.618-.1 1.235-.203 1.853-.302.2-.033.4-.06.603-.07.14-.007.27.038.368.15.085.097.12.216.12.34v5.084z"/>
                    </svg>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <Link href={`/proximos/${release.slug}`}>
            <h3 className="font-oswald text-sm uppercase mb-0.5 group-hover:text-primary transition-colors line-clamp-1">
              {release.title}
            </h3>
          </Link>

          <p className="text-xs text-slc-muted mb-2 line-clamp-1">
            {release.artistName}
            {release.featuredArtists && (
              <span className="text-slc-muted/70"> ft. {release.featuredArtists}</span>
            )}
          </p>

          <div className="flex items-center gap-1.5 text-[10px] text-slc-muted">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(release.releaseDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// NOTIFICATION SUBSCRIPTION SECTION
// =============================================
function NotificationSection() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported and already granted
    if ("Notification" in window) {
      setIsSubscribed(Notification.permission === "granted");
    }
    // Load saved email from localStorage
    const savedEmail = localStorage.getItem("slc_notification_email");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      setError("Tu navegador no soporta notificaciones push");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setIsSubscribed(true);

        // Register with service worker for push notifications
        if ("serviceWorker" in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            });

            // Send subscription to server
            await fetch("/api/notifications/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscription,
                type: "upcoming_releases",
              }),
            });
          } catch (swError) {
            console.warn("Service worker subscription failed:", swError);
            // Still mark as subscribed since browser permission was granted
          }
        }

        // Send welcome email if email provided
        if (email) {
          localStorage.setItem("slc_notification_email", email);
          try {
            await fetch("/api/notifications/welcome", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
          } catch (emailError) {
            console.warn("Welcome email failed:", emailError);
          }
        }

        setShowEmailInput(false);
      } else {
        setError("Permiso denegado para notificaciones");
      }
    } catch (err) {
      setError("Error al activar notificaciones");
      console.error(err);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <BellRing className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-oswald text-xl uppercase mb-2">
            No te pierdas ningún lanzamiento
          </h3>
          <p className="text-sm text-slc-muted mb-4">
            Activa las notificaciones y te avisaremos cuando se acerque la fecha de lanzamiento
          </p>
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          {isSubscribed ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-500 rounded-full text-sm">
              <Bell className="w-4 h-4" />
              Notificaciones activadas
            </div>
          ) : showEmailInput ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com (opcional)"
                  className="flex-1 px-4 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
                <Button
                  onClick={requestNotifications}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4 mr-2" />
                  )}
                  Activar
                </Button>
              </div>
              <p className="text-xs text-slc-muted">
                Te enviaremos un email de confirmación (opcional)
              </p>
            </div>
          ) : (
            <Button
              onClick={() => setShowEmailInput(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Bell className="w-4 h-4 mr-2" />
              Activar notificaciones
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================
// MAIN PAGE COMPONENT
// =============================================
export default function ProximosLanzamientosPage() {
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReleases() {
      try {
        const res = await fetch("/api/upcoming-releases");
        const data = await res.json();
        if (data.success) {
          setReleases(data.data);
        }
      } catch (error) {
        console.error("Error fetching releases:", error);
      }
      setIsLoading(false);
    }
    fetchReleases();
  }, []);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 blur-[80px] rounded-full" />

        <div className="section-container relative z-10">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/30 rounded-full mb-4">
              <Rocket className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Próximamente</span>
            </div>
            <h1 className="font-oswald text-4xl md:text-5xl uppercase mb-4">
              Próximos{" "}
              <span className="text-primary">Lanzamientos</span>
            </h1>
            <p className="text-base text-slc-muted">
              Haz presave y sé el primero en escuchar la nueva música
            </p>
          </div>
        </div>
      </section>

      {/* Notification Section */}
      <section className="section-container pb-8">
        <NotificationSection />
      </section>

      {/* Releases Grid */}
      {releases.length > 0 && (
        <section className="section-container pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {releases.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>

          {/* View All Link */}
          <div className="text-center mt-8">
            <Button asChild variant="outline" size="sm">
              <Link href="/discografia">
                Ver Discografía Completa
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Empty State */}
      {releases.length === 0 && !isLoading && (
        <section className="section-container pb-20">
          <div className="text-center py-16 px-6 bg-slc-card border border-slc-border rounded-2xl">
            <Rocket className="w-12 h-12 text-slc-muted mx-auto mb-4" />
            <h2 className="font-oswald text-xl uppercase mb-3">
              No hay próximos lanzamientos
            </h2>
            <p className="text-slc-muted text-sm mb-6">
              Pronto anunciaremos nueva música. ¡Mantente al tanto!
            </p>
            <Button asChild size="sm">
              <Link href="/discografia">Ver Discografía</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
