"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Youtube,
  ExternalLink,
  Headphones,
  Sparkles,
  ArrowLeft,
  Music2,
  Mail,
  Lock,
  Unlock,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
// Resources are fetched from the API (DB-backed) instead of the JSON file
// so that admin CRUD changes are immediately reflected.

type ResourceType = "video" | "channel" | "playlist";

interface SamplingResource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  category: string;
  description: string;
  tags: string[];
  videoId?: string;
  playlistId?: string;
  handle?: string;
}

const typeMeta: Record<
  ResourceType,
  { label: string; color: string; icon: typeof Youtube }
> = {
  video: {
    label: "Video",
    color: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: Youtube,
  },
  channel: {
    label: "Canal",
    color: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    icon: Youtube,
  },
  playlist: {
    label: "Playlist",
    color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: Music2,
  },
};

const STORAGE_KEY = "slc:sampling-access:v1";

function ResourceEmbed({ resource }: { resource: SamplingResource }) {
  if (resource.type === "video" && resource.videoId) {
    return (
      <div className="relative aspect-video bg-black overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${resource.videoId}?rel=0&modestbranding=1`}
          title={resource.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  if (resource.type === "playlist" && resource.playlistId) {
    return (
      <div className="relative aspect-video bg-black overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/videoseries?list=${resource.playlistId}&rel=0&modestbranding=1`}
          title={resource.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <Link
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative aspect-video bg-gradient-to-br from-youtube/20 via-slc-card to-slc-darker flex flex-col items-center justify-center gap-3 group/chan overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-20 group-hover/chan:opacity-30 transition-opacity"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 50%, rgba(255,0,0,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(249,115,22,0.25) 0%, transparent 50%)",
        }}
      />
      <div className="relative w-16 h-16 rounded-full bg-youtube flex items-center justify-center shadow-lg group-hover/chan:scale-110 transition-transform">
        <Youtube className="w-9 h-9 text-white" />
      </div>
      <div className="relative text-center px-4">
        <p className="font-oswald text-lg uppercase text-white tracking-wide">{resource.handle}</p>
        <p className="text-xs text-slc-muted uppercase tracking-widest mt-1">Abrir canal</p>
      </div>
    </Link>
  );
}

function ResourceCard({ resource }: { resource: SamplingResource }) {
  const meta = typeMeta[resource.type];
  const Icon = meta.icon;

  return (
    <article className="group bg-slc-card border border-slc-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 hover:shadow-[0_0_25px_-5px_rgba(249,115,22,0.25)] transition-all duration-300">
      <div className="relative">
        <ResourceEmbed resource={resource} />
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border backdrop-blur-sm ${meta.color}`}
          >
            <Icon className="w-3 h-3" />
            {meta.label}
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-oswald text-xl uppercase text-white leading-tight group-hover:text-primary transition-colors mb-2">
          {resource.title}
        </h3>

        <p className="text-[11px] uppercase tracking-widest text-primary/80 mb-3">
          {resource.category}
        </p>

        <p className="text-sm text-slc-muted leading-relaxed flex-1">
          {resource.description}
        </p>

        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {resource.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] uppercase tracking-wide rounded bg-slc-darker border border-slc-border text-slc-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <Link
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slc-darker border border-slc-border text-white text-sm font-medium uppercase tracking-wide hover:bg-primary hover:border-primary transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir en YouTube
        </Link>
      </div>
    </article>
  );
}

// ===========================================
// Email Gate
// ===========================================

function EmailGate({ onUnlock }: { onUnlock: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "submitting") return;

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/sampling-resources/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, website }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("error");
        setErrorMsg(data.error || "No se pudo procesar tu solicitud.");
        return;
      }

      // Persist unlock locally so we don't ask again on future visits
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            email,
            grantedAt: new Date().toISOString(),
          })
        );
      } catch {
        // localStorage may be unavailable (private mode) — non-critical
      }

      setStatus("success");
      // Brief success state before revealing content
      setTimeout(() => onUnlock(), 700);
    } catch {
      setStatus("error");
      setErrorMsg("Error de conexión. Intenta de nuevo.");
    }
  };

  return (
    <div className="min-h-screen bg-slc-black flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(249,115,22,0.25) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(168,85,247,0.18) 0%, transparent 50%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slc-black" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Lock icon */}
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div className="flex items-center justify-center gap-2 text-primary mb-2">
            <Headphones className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-medium">
              Sonido Líquido Crew
            </span>
          </div>
          <h1 className="font-oswald text-3xl md:text-4xl uppercase text-white leading-tight">
            Recursos para Sampling
          </h1>
          <p className="text-slc-muted text-sm mt-3 leading-relaxed">
            Ingresa tu email para desbloquear la curaduría de canales, videos y playlists de YouTube.
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-slc-card border border-slc-border rounded-xl p-6 space-y-4"
        >
          {/* Name (optional) */}
          <div>
            <label
              htmlFor="sr-name"
              className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
            >
              Nombre <span className="text-slc-muted/60">(opcional)</span>
            </label>
            <input
              id="sr-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre o alias"
              autoComplete="name"
              className="w-full px-3 py-2.5 bg-slc-darker border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="sr-email"
              className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
            >
              Email <span className="text-primary">*</span>
            </label>
            <input
              id="sr-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              className="w-full px-3 py-2.5 bg-slc-darker border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Honeypot — hidden from real users */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            data-lpignore="true"
            data-form-type="other"
            className="absolute -left-[9999px] w-px h-px opacity-0"
            aria-hidden="true"
          />

          {/* Error message */}
          {status === "error" && errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success message */}
          {status === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Email confirmado. Acceso concedido.</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!email || status === "submitting" || status === "success"}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-wide transition-colors"
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando…
              </>
            ) : status === "success" ? (
              <>
                <Check className="w-4 h-4" />
                Acceso concedido
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                Desbloquear recursos
              </>
            )}
          </button>

          {/* Legal note */}
          <p className="text-[11px] text-slc-muted/80 leading-relaxed text-center pt-1">
            Al continuar aceptas recibir comunicaciones de Sonido Líquido Crew. Puedes darte de baja en cualquier momento.
          </p>
        </form>
      </div>
    </div>
  );
}

// ===========================================
// Main Client Component
// ===========================================

export default function SamplingResourcesClient() {
  const [accessGranted, setAccessGranted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAccessGranted(true);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const [resources, setResources] = useState<SamplingResource[]>([]);
  const [pageMeta, setPageMeta] = useState({ title: "Recursos para Sampling", subtitle: "" });

  useEffect(() => {
    fetch("/api/admin/sampling-resources")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setResources(json.data.resources || []);
          setPageMeta({ title: json.data.title || "Recursos para Sampling", subtitle: json.data.subtitle || "" });
        }
      })
      .catch(() => {});
  }, []);

  // Group by category
  const categories = Array.from(
    new Set(resources.map((r) => r.category))
  ) as string[];

  const grouped = categories.map((cat) => ({
    category: cat,
    items: resources.filter((r) => r.category === cat),
  }));

  const counts = {
    video: resources.filter((r) => r.type === "video").length,
    channel: resources.filter((r) => r.type === "channel").length,
    playlist: resources.filter((r) => r.type === "playlist").length,
  };

  // While hydrating, render nothing to avoid a flash of the gate
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slc-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!accessGranted) {
    return <EmailGate onUnlock={() => setAccessGranted(true)} />;
  }

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slc-border">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(249,115,22,0.25) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(168,85,247,0.18) 0%, transparent 50%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slc-black" />

        <div className="relative section-container py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Headphones className="w-5 h-5" />
              <span className="text-xs uppercase tracking-widest font-medium">
                Sonido Líquido Crew
              </span>
            </div>

            <h1 className="font-oswald text-4xl md:text-5xl lg:text-6xl uppercase text-white leading-[1.05]">
              {pageMeta.title}
            </h1>

            <p className="text-slc-muted text-base md:text-lg mt-5 max-w-2xl leading-relaxed">
              {pageMeta.subtitle}
            </p>

            {/* Quick type stats */}
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slc-card border border-slc-border">
                <Youtube className="w-4 h-4 text-red-500" />
                <span className="text-sm text-white font-medium">{counts.channel}</span>
                <span className="text-xs text-slc-muted uppercase tracking-wide">Canales</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slc-card border border-slc-border">
                <Youtube className="w-4 h-4 text-red-500" />
                <span className="text-sm text-white font-medium">{counts.video}</span>
                <span className="text-xs text-slc-muted uppercase tracking-wide">Videos</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slc-card border border-slc-border">
                <Music2 className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-white font-medium">{counts.playlist}</span>
                <span className="text-xs text-slc-muted uppercase tracking-wide">Playlists</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">{resources.length}</span>
                <span className="text-xs text-primary/80 uppercase tracking-wide">Recursos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resources grouped by category */}
      <div className="section-container py-12 md:py-16 space-y-12 md:space-y-16">
        {grouped.map((group) => (
          <section key={group.category}>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
              <h2 className="font-oswald text-2xl md:text-3xl uppercase text-white tracking-wide whitespace-nowrap">
                {group.category}
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.items.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer note */}
      <section className="border-t border-slc-border bg-slc-darker">
        <div className="section-container py-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm text-slc-muted leading-relaxed">
              Para agregar nuevos recursos, edita{" "}
              <code className="px-1.5 py-0.5 rounded bg-slc-card border border-slc-border text-primary text-xs">
                src/data/sampling-resources.json
              </code>{" "}
              y vuelve a desplegar. Cada entrada puede ser de tipo{" "}
              <span className="text-orange-400">video</span>,{" "}
              <span className="text-orange-400">channel</span> o{" "}
              <span className="text-orange-400">playlist</span>, con su título, descripción, categoría y tags.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
