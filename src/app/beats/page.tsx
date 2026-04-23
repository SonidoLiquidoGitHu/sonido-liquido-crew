"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  Search,
  Play,
  Music2,
  Headphones,
  Tag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ── Types ─────────────────────────────────────────────── */
interface BeatArtist {
  id: string;
  name: string;
  slug: string | null;
  image: string | null;
}

interface Beat {
  id: string;
  title: string;
  slug: string | null;
  bpm: number | null;
  key: string | null;
  coverUrl: string | null;
  audioUrl: string | null;
  previewUrl: string | null;
  price: number | null;
  isFree: boolean;
  tags: string | null;
  playCount: number;
  artist: BeatArtist;
}

const TAG_FILTERS = ["Todos", "Trap", "Boom Bap", "Lo-Fi", "Drill", "R&B", "Experimental"];

/* ── Page ──────────────────────────────────────────────── */
export default function BeatsPage() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("Todos");

  useEffect(() => {
    fetch("/api/beats")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBeats(data);
      })
      .catch(() => setBeats([]))
      .finally(() => setLoading(false));
  }, []);

  /* Filter logic */
  const filtered = beats.filter((b) => {
    const matchSearch =
      !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.artist.name.toLowerCase().includes(search.toLowerCase());
    const matchTag =
      activeTag === "Todos" ||
      (b.tags && b.tags.toLowerCase().includes(activeTag.toLowerCase()));
    return matchSearch && matchTag;
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <Headphones className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Beats</h1>
        </div>
        <p className="max-w-xl text-lg text-muted-foreground">
          Beats del crew disponibles para descargar y producir. Libres y exclusivos.
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            type="text"
            placeholder="Buscar beats o artistas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-[#2a2a2a] bg-[#1a1a1a] placeholder:text-muted-foreground/50 focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TAG_FILTERS.map((tag) => (
            <Button
              key={tag}
              variant={activeTag === tag ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTag(tag)}
              className={
                activeTag === tag
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border-[#2a2a2a] bg-[#1a1a1a] text-muted-foreground hover:text-foreground hover:border-primary/50"
              }
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Cargando beats&hellip;</p>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] px-6 py-20 text-center">
          <Music2 className="h-12 w-12 text-primary/50" />
          <h2 className="text-xl font-bold">Próximamente</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Beats nuevos en camino. Mientras tanto, suscríbete al newsletter para enterarte primero.
          </p>
        </div>
      )}

      {/* Beats grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((beat) => (
            <BeatCard key={beat.id} beat={beat} />
          ))}
        </div>
      )}
    </main>
  );
}

/* ── Beat Card ─────────────────────────────────────────── */
function BeatCard({ beat }: { beat: Beat }) {
  const hasCover = typeof beat.coverUrl === "string" && beat.coverUrl.length > 0;
  const hasArtistImage = typeof beat.artist.image === "string" && beat.artist.image.length > 0;

  return (
    <div className="group overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all hover:border-primary/30">
      {/* Cover */}
      <div className="relative aspect-square overflow-hidden bg-[#2a2a2a]">
        {hasCover ? (
          <Image
            src={beat.coverUrl!}
            alt={beat.title}
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
        {/* Price badge */}
        <div className="absolute top-3 right-3">
          {beat.isFree ? (
            <Badge className="bg-primary/90 text-primary-foreground text-[10px]">Gratis</Badge>
          ) : beat.price != null ? (
            <Badge className="bg-[#0a0a0a]/80 text-foreground text-[10px]">${beat.price}</Badge>
          ) : null}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="truncate text-sm font-bold">{beat.title}</h3>
        <div className="mt-1 flex items-center gap-2">
          {hasArtistImage && (
            <div className="relative h-5 w-5 overflow-hidden rounded-full bg-[#2a2a2a]">
              <Image
                src={beat.artist.image!}
                alt={beat.artist.name}
                fill
                className="object-cover"
                sizes="20px"
              />
            </div>
          )}
          <span className="truncate text-xs text-muted-foreground">
            {beat.artist.name}
          </span>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
          {beat.bpm && (
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {beat.bpm} BPM
            </span>
          )}
          {beat.key && <span>{beat.key}</span>}
          {beat.playCount > 0 && (
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {beat.playCount}
            </span>
          )}
        </div>

        {/* Tags */}
        {beat.tags && (
          <div className="mt-2 flex flex-wrap gap-1">
            {beat.tags.split(",").slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
