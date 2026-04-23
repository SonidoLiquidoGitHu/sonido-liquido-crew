"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  Loader2,
  Clock,
  Music2,
  Bell,
  Calendar,
  ExternalLink,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ── Types ─────────────────────────────────────────────── */
interface UpcomingArtist {
  id: string;
  name: string;
  slug: string | null;
  image: string | null;
}

interface UpcomingSubscriber {
  id: string;
  email: string;
}

interface UpcomingRelease {
  id: string;
  title: string;
  slug: string | null;
  type: string;
  coverUrl: string | null;
  releaseDate: string | null;
  spotifyUrl: string | null;
  presaveUrl: string | null;
  isUpcoming: boolean;
  artist: UpcomingArtist;
  upcomingSubscribers: UpcomingSubscriber[];
}

/* ── Countdown Component ───────────────────────────────── */
function Countdown({ targetDate }: { targetDate: string }) {
  const [diff, setDiff] = useState(getDiff(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setDiff(getDiff(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (diff.total <= 0) {
    return <span className="text-primary font-bold">¡Ya disponible!</span>;
  }

  return (
    <div className="flex gap-3">
      {[
        { value: diff.days, label: "Días" },
        { value: diff.hours, label: "Hrs" },
        { value: diff.minutes, label: "Min" },
        { value: diff.seconds, label: "Seg" },
      ].map((unit) => (
        <div key={unit.label} className="flex flex-col items-center">
          <span className="text-2xl font-black sm:text-3xl">{String(unit.value).padStart(2, "0")}</span>
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}

function getDiff(targetDate: string) {
  const total = new Date(targetDate).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

/* ── Page ──────────────────────────────────────────────── */
export default function ProximosPage() {
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<Record<string, string>>({});
  const [subscribeStatus, setSubscribeStatus] = useState<Record<string, "idle" | "loading" | "success" | "error">>({});

  useEffect(() => {
    fetch("/api/upcoming-releases")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setReleases(data);
      })
      .catch(() => setReleases([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubscribe(releaseId: string, e: FormEvent) {
    e.preventDefault();
    const email = subscribing[releaseId]?.trim();
    if (!email) return;

    setSubscribeStatus((prev) => ({ ...prev, [releaseId]: "loading" }));

    try {
      const res = await fetch(`/api/upcoming-releases/${releaseId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubscribeStatus((prev) => ({ ...prev, [releaseId]: "success" }));
        setSubscribing((prev) => ({ ...prev, [releaseId]: "" }));
      } else {
        setSubscribeStatus((prev) => ({ ...prev, [releaseId]: "error" }));
      }
    } catch {
      setSubscribeStatus((prev) => ({ ...prev, [releaseId]: "error" }));
    }
  }

  const featured = releases[0];
  const others = releases.slice(1);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <Clock className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Próximos Lanzamientos</h1>
        </div>
        <p className="max-w-xl text-lg text-muted-foreground">
          Lo que viene del crew. Suscríbete para ser el primero en escuchar.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Cargando próximos lanzamientos&hellip;</p>
        </div>
      )}

      {/* Empty */}
      {!loading && releases.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] px-6 py-20 text-center">
          <Music2 className="h-12 w-12 text-primary/50" />
          <h2 className="text-xl font-bold">Sin lanzamientos próximos</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            No hay lanzamientos próximos por ahora. Vuelve pronto para enterarte de lo nuevo.
          </p>
        </div>
      )}

      {/* Featured upcoming release */}
      {!loading && featured && (
        <div className="mb-12 overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a]">
          <div className="flex flex-col lg:flex-row">
            {/* Cover art */}
            <div className="relative aspect-square w-full lg:w-1/2 overflow-hidden bg-[#2a2a2a]">
              {featured.coverUrl ? (
                <Image
                  src={featured.coverUrl}
                  alt={featured.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Music2 className="h-20 w-20 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#1a1a1a]/80" />
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col justify-center gap-6 p-6 sm:p-8 lg:p-12">
              <div>
                <Badge className="mb-4 bg-primary/20 text-primary text-[10px]">
                  Próximo Lanzamiento
                </Badge>
                <h2 className="text-2xl font-black sm:text-3xl lg:text-4xl">{featured.title}</h2>
                <p className="mt-2 text-lg text-muted-foreground">{featured.artist.name}</p>
              </div>

              {/* Countdown */}
              {featured.releaseDate && (
                <div>
                  <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Falta
                  </p>
                  <Countdown targetDate={featured.releaseDate} />
                </div>
              )}

              {/* Presave / Spotify */}
              <div className="flex flex-wrap gap-3">
                {featured.presaveUrl && (
                  <a
                    href={featured.presaveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Bell className="h-4 w-4" />
                    Pre-guardar
                  </a>
                )}
                {featured.spotifyUrl && (
                  <a
                    href={featured.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#0a0a0a] px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Spotify
                  </a>
                )}
              </div>

              {/* Subscribe form */}
              {subscribeStatus[featured.id] === "success" ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    ¡Suscrito! Te notificaremos cuando esté disponible.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => handleSubscribe(featured.id, e)}
                  className="flex gap-2 max-w-md"
                >
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                    <Input
                      type="email"
                      required
                      placeholder="tu@email.com"
                      value={subscribing[featured.id] ?? ""}
                      onChange={(e) =>
                        setSubscribing((prev) => ({
                          ...prev,
                          [featured.id]: e.target.value,
                        }))
                      }
                      disabled={subscribeStatus[featured.id] === "loading"}
                      className="pl-10 border-[#2a2a2a] bg-[#0a0a0a] placeholder:text-muted-foreground/50 focus:border-primary"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={
                      subscribeStatus[featured.id] === "loading" ||
                      !subscribing[featured.id]?.trim()
                    }
                    className="bg-primary text-primary-foreground hover:opacity-90"
                  >
                    {subscribeStatus[featured.id] === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Notificarme"
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Other upcoming releases */}
      {!loading && others.length > 0 && (
        <div>
          <h2 className="mb-6 text-2xl font-bold">Más Próximos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((release) => (
              <div
                key={release.id}
                className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all hover:border-primary/30"
              >
                <div className="relative aspect-square overflow-hidden bg-[#2a2a2a]">
                  {release.coverUrl ? (
                    <Image
                      src={release.coverUrl}
                      alt={release.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music2 className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-primary/90 text-primary-foreground text-[10px]">Próximo</Badge>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="truncate text-sm font-bold">{release.title}</h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {release.artist.name}
                  </p>
                  {release.releaseDate && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(release.releaseDate).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  )}

                  {/* Subscribe mini-form */}
                  {subscribeStatus[release.id] === "success" ? (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      ¡Suscrito!
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => handleSubscribe(release.id, e)}
                      className="mt-3 flex gap-2"
                    >
                      <Input
                        type="email"
                        required
                        placeholder="tu@email.com"
                        value={subscribing[release.id] ?? ""}
                        onChange={(e) =>
                          setSubscribing((prev) => ({
                            ...prev,
                            [release.id]: e.target.value,
                          }))
                        }
                        disabled={subscribeStatus[release.id] === "loading"}
                        className="h-8 text-xs border-[#2a2a2a] bg-[#0a0a0a] placeholder:text-muted-foreground/50 focus:border-primary"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={subscribeStatus[release.id] === "loading"}
                        className="h-8 bg-primary text-primary-foreground hover:opacity-90 text-xs"
                      >
                        {subscribeStatus[release.id] === "loading" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Bell className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
