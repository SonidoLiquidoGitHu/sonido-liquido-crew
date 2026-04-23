"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  Disc3,
  Play,
  Calendar,
  ExternalLink,
  Music2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ── Types ─────────────────────────────────────────────── */
interface ReleaseArtist {
  id: string;
  name: string;
  slug: string | null;
  image: string | null;
}

interface Release {
  id: string;
  title: string;
  slug: string | null;
  type: string;
  coverUrl: string | null;
  releaseDate: string | null;
  spotifyUrl: string | null;
  isUpcoming: boolean;
  artist: ReleaseArtist;
}

type TypeFilter = "Todos" | "Álbumes" | "Singles" | "EPs";
type SortOrder = "Reciente" | "Antiguo";

const TYPE_MAP: Record<TypeFilter, string[]> = {
  Todos: ["album", "single", "ep", "compilation"],
  Álbumes: ["album", "compilation"],
  Singles: ["single"],
  EPs: ["ep"],
};

const TYPE_LABELS: Record<string, string> = {
  album: "Álbum",
  single: "Single",
  ep: "EP",
  compilation: "Compilación",
};

/* ── Page ──────────────────────────────────────────────── */
export default function DiscografiaPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("Todos");
  const [sortOrder, setSortOrder] = useState<SortOrder>("Reciente");

  useEffect(() => {
    fetch("/api/releases")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setReleases(data);
      })
      .catch(() => setReleases([]))
      .finally(() => setLoading(false));
  }, []);

  /* Filter & sort */
  const filtered = releases
    .filter((r) => TYPE_MAP[typeFilter].includes(r.type))
    .sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return sortOrder === "Reciente" ? dateB - dateA : dateA - dateB;
    });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <Disc3 className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Discografía</h1>
        </div>
        <p className="max-w-xl text-lg text-muted-foreground">
          Toda la música del colectivo — álbumes, singles y EPs en un solo lugar.
        </p>
      </div>

      {/* Filter tabs & sort */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["Todos", "Álbumes", "Singles", "EPs"] as TypeFilter[]).map((tab) => (
            <Button
              key={tab}
              variant={typeFilter === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(tab)}
              className={
                typeFilter === tab
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border-[#2a2a2a] bg-[#1a1a1a] text-muted-foreground hover:text-foreground hover:border-primary/50"
              }
            >
              {tab}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["Reciente", "Antiguo"] as SortOrder[]).map((order) => (
            <Button
              key={order}
              variant={sortOrder === order ? "default" : "outline"}
              size="sm"
              onClick={() => setSortOrder(order)}
              className={
                sortOrder === order
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border-[#2a2a2a] bg-[#1a1a1a] text-muted-foreground hover:text-foreground hover:border-primary/50"
              }
            >
              {order}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Cargando discografía&hellip;</p>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] px-6 py-20 text-center">
          <Disc3 className="h-12 w-12 text-primary/50" />
          <h2 className="text-xl font-bold">Próximamente</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            La discografía completa próximamente. Mientras tanto, escucha lo último en Spotify.
          </p>
          <a
            href="https://open.spotify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Play className="h-4 w-4" />
            Abrir Spotify
          </a>
        </div>
      )}

      {/* Releases grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      )}
    </main>
  );
}

/* ── Release Card ──────────────────────────────────────── */
function ReleaseCard({ release }: { release: Release }) {
  const hasCover = typeof release.coverUrl === "string" && release.coverUrl.length > 0;
  const dateStr = release.releaseDate
    ? new Date(release.releaseDate).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const content = (
    <div className="group overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all hover:border-primary/30">
      {/* Cover */}
      <div className="relative aspect-square overflow-hidden bg-[#2a2a2a]">
        {hasCover ? (
          <Image
            src={release.coverUrl!}
            alt={release.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music2 className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Play className="h-5 w-5" />
          </div>
        </div>
        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <Badge className="bg-[#0a0a0a]/80 text-[10px] text-foreground">
            {TYPE_LABELS[release.type] ?? release.type}
          </Badge>
        </div>
        {release.isUpcoming && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-primary/90 text-primary-foreground text-[10px]">Próximo</Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="truncate text-sm font-bold">{release.title}</h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {release.artist.name}
        </p>
        {dateStr && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {dateStr}
          </div>
        )}
      </div>
    </div>
  );

  if (release.spotifyUrl) {
    return (
      <a href={release.spotifyUrl} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}
