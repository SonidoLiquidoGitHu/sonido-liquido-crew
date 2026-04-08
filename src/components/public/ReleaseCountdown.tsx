"use client";

import { useEffect, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { calculateCountdown } from "@/lib/utils";
import type { Release } from "@/types";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

interface ReleaseCountdownProps {
  release: Release;
}

export function ReleaseCountdown({ release }: ReleaseCountdownProps) {
  const [countdown, setCountdown] = useState(calculateCountdown(release.releaseDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateCountdown(release.releaseDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [release.releaseDate]);

  if (countdown.isExpired) {
    return null;
  }

  return (
    <section className="py-12 bg-gradient-to-r from-slc-card to-slc-dark">
      <div className="section-container">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Album Cover */}
          <div className="flex-shrink-0">
            <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-xl overflow-hidden shadow-2xl">
              {release.coverImageUrl ? (
                <SafeImage
                  src={release.coverImageUrl}
                  alt={release.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slc-card flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-16 h-16 text-slc-border">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                </div>
              )}
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-primary/20 animate-pulse" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block px-3 py-1 bg-primary/20 text-primary text-xs font-medium uppercase tracking-wider rounded-full mb-2">
              Próximo Lanzamiento
            </span>
            <h2 className="font-oswald text-2xl md:text-3xl lg:text-4xl uppercase text-white">
              {release.title}
            </h2>

            {/* Countdown */}
            <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
              <CountdownUnit value={countdown.days} label="Días" />
              <CountdownSeparator />
              <CountdownUnit value={countdown.hours} label="Hrs" />
              <CountdownSeparator />
              <CountdownUnit value={countdown.minutes} label="Min" />
              <CountdownSeparator />
              <CountdownUnit value={countdown.seconds} label="Seg" />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
              <Button asChild>
                <Link href={`/lanzamientos/${release.slug}`}>
                  <Bell className="w-4 h-4 mr-2" />
                  Recibir Alerta
                </Link>
              </Button>
              {release.spotifyUrl && (
                <Button variant="outline" asChild>
                  <a href={release.spotifyUrl} target="_blank" rel="noopener noreferrer">
                    Pre-guardar
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-slc-black rounded-lg flex items-center justify-center border border-slc-border">
        <span className="font-oswald text-2xl md:text-3xl text-white">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-xs text-slc-muted uppercase tracking-wider mt-2 block">
        {label}
      </span>
    </div>
  );
}

function CountdownSeparator() {
  return (
    <span className="font-oswald text-2xl text-primary animate-pulse">:</span>
  );
}
