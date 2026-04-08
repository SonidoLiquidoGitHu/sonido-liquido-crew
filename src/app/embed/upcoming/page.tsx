"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Rocket, Calendar, Clock, Bell, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UpcomingRelease } from "@/db/schema/upcoming";

// =============================================
// EMBED CONFIGURATION FROM URL PARAMS
// =============================================
interface EmbedConfig {
  theme: "dark" | "light";
  accentColor: string;
  limit: number;
  showCountdown: boolean;
  showPresaveButton: boolean;
  compact: boolean;
  autoRefresh: boolean;
}

function useEmbedConfig(): EmbedConfig {
  const [config, setConfig] = useState<EmbedConfig>({
    theme: "dark",
    accentColor: "#f97316",
    limit: 4,
    showCountdown: true,
    showPresaveButton: true,
    compact: false,
    autoRefresh: true,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setConfig({
      theme: (params.get("theme") as "dark" | "light") || "dark",
      accentColor: params.get("accent") || "#f97316",
      limit: parseInt(params.get("limit") || "4", 10),
      showCountdown: params.get("countdown") !== "false",
      showPresaveButton: params.get("presave") !== "false",
      compact: params.get("compact") === "true",
      autoRefresh: params.get("refresh") !== "false",
    });
  }, []);

  return config;
}

// =============================================
// COUNTDOWN HOOK
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
// EMBED CARD COMPONENT
// =============================================
function EmbedReleaseCard({
  release,
  config,
}: {
  release: UpcomingRelease;
  config: EmbedConfig;
}) {
  const timeRemaining = useCountdown(release.releaseDate);
  const hasPresave = Boolean(release.rpmPresaveUrl || release.spotifyPresaveUrl || release.appleMusicPresaveUrl);

  const formatTime = () => {
    if (timeRemaining.total <= 0) return "¡Ya disponible!";
    if (timeRemaining.days > 0) return `${timeRemaining.days}d ${timeRemaining.hours}h`;
    if (timeRemaining.hours > 0) return `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
    return `${timeRemaining.minutes}m ${timeRemaining.seconds}s`;
  };

  const bgColor = config.theme === "dark" ? "#1a1a1a" : "#ffffff";
  const textColor = config.theme === "dark" ? "#ffffff" : "#000000";
  const mutedColor = config.theme === "dark" ? "#a3a3a3" : "#666666";
  const borderColor = config.theme === "dark" ? "#2a2a2a" : "#e5e5e5";

  if (config.compact) {
    return (
      <a
        href={release.rpmPresaveUrl || `/proximos/${release.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-lg transition-all hover:opacity-80"
        style={{ backgroundColor: bgColor, borderColor, border: "1px solid" }}
      >
        {/* Cover */}
        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative">
          {release.coverImageUrl ? (
            <SafeImage
              src={release.coverImageUrl}
              alt={release.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: release.backgroundColor || config.accentColor }}
            >
              <Rocket className="w-5 h-5" style={{ color: textColor, opacity: 0.5 }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-sm truncate"
            style={{ color: textColor }}
          >
            {release.title}
          </h3>
          <p className="text-xs truncate" style={{ color: mutedColor }}>
            {release.artistName}
          </p>
        </div>

        {/* Countdown */}
        {config.showCountdown && timeRemaining.total > 0 && (
          <div
            className="px-2 py-1 rounded text-xs font-mono font-bold shrink-0"
            style={{ backgroundColor: config.accentColor, color: "#fff" }}
          >
            {formatTime()}
          </div>
        )}
      </a>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ backgroundColor: bgColor, borderColor, border: "1px solid" }}
    >
      {/* Cover */}
      <div className="aspect-square relative group">
        {release.coverImageUrl ? (
          <SafeImage
            src={release.coverImageUrl}
            alt={release.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: release.backgroundColor || config.accentColor }}
          >
            <Rocket className="w-10 h-10" style={{ color: textColor, opacity: 0.3 }} />
          </div>
        )}

        {/* Countdown badge */}
        {config.showCountdown && timeRemaining.total > 0 && (
          <div
            className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}
          >
            <Clock className="w-3 h-3" style={{ color: config.accentColor }} />
            <span className="font-mono">{formatTime()}</span>
          </div>
        )}

        {/* Presave overlay */}
        {config.showPresaveButton && hasPresave && (
          <a
            href={release.rpmPresaveUrl || release.spotifyPresaveUrl || release.appleMusicPresaveUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity"
          >
            <span
              className="px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2"
              style={{ backgroundColor: config.accentColor, color: "#fff" }}
            >
              <Bell className="w-4 h-4" />
              Pre-save
            </span>
          </a>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="font-bold text-sm truncate mb-0.5"
          style={{ color: textColor }}
        >
          {release.title}
        </h3>
        <p className="text-xs truncate mb-2" style={{ color: mutedColor }}>
          {release.artistName}
        </p>
        <div className="flex items-center gap-1 text-xs" style={{ color: mutedColor }}>
          <Calendar className="w-3 h-3" />
          <span>
            {new Date(release.releaseDate).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================
// SKELETON LOADING
// =============================================
function EmbedSkeleton({ config }: { config: EmbedConfig }) {
  const bgColor = config.theme === "dark" ? "#1a1a1a" : "#f5f5f5";
  const skeletonColor = config.theme === "dark" ? "#2a2a2a" : "#e5e5e5";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      <div
        className="aspect-square animate-pulse"
        style={{ backgroundColor: skeletonColor }}
      />
      <div className="p-3 space-y-2">
        <div
          className="h-4 rounded w-3/4 animate-pulse"
          style={{ backgroundColor: skeletonColor }}
        />
        <div
          className="h-3 rounded w-1/2 animate-pulse"
          style={{ backgroundColor: skeletonColor }}
        />
      </div>
    </div>
  );
}

// =============================================
// MAIN EMBED WIDGET
// =============================================
export default function UpcomingReleasesEmbed() {
  const config = useEmbedConfig();
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReleases() {
      try {
        const res = await fetch(`/api/upcoming-releases?limit=${config.limit}`);
        const data = await res.json();
        if (data.success) {
          setReleases(data.data.slice(0, config.limit));
        }
      } catch (error) {
        console.error("Error fetching releases:", error);
      }
      setIsLoading(false);
    }

    fetchReleases();

    // Auto-refresh every 5 minutes
    if (config.autoRefresh) {
      const interval = setInterval(fetchReleases, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [config.limit, config.autoRefresh]);

  const bgColor = config.theme === "dark" ? "#0a0a0a" : "#ffffff";
  const textColor = config.theme === "dark" ? "#ffffff" : "#000000";
  const mutedColor = config.theme === "dark" ? "#666666" : "#999999";

  return (
    <div
      className="min-h-screen p-4"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: config.accentColor }}
          >
            <Rocket className="w-3 h-3 text-white" />
          </div>
          <h2 className="font-bold text-sm uppercase tracking-wide">
            Próximos Lanzamientos
          </h2>
        </div>
        <a
          href="https://sonidoliquido.com/proximos"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs hover:underline"
          style={{ color: mutedColor }}
        >
          Ver más
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className={cn(
          "grid gap-4",
          config.compact ? "grid-cols-1" : "grid-cols-2"
        )}>
          {Array.from({ length: config.limit }).map((_, i) => (
            <EmbedSkeleton key={i} config={config} />
          ))}
        </div>
      ) : releases.length > 0 ? (
        <div className={cn(
          "grid gap-4",
          config.compact ? "grid-cols-1" : "grid-cols-2"
        )}>
          {releases.map((release) => (
            <EmbedReleaseCard key={release.id} release={release} config={config} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Rocket className="w-8 h-8 mx-auto mb-2" style={{ color: mutedColor }} />
          <p className="text-sm" style={{ color: mutedColor }}>
            No hay próximos lanzamientos
          </p>
        </div>
      )}

      {/* Powered by */}
      <div className="mt-4 text-center">
        <a
          href="https://sonidoliquido.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline"
          style={{ color: mutedColor }}
        >
          Powered by Sonido Líquido Crew
        </a>
      </div>
    </div>
  );
}
