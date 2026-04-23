import Link from "next/link";
import Image from "next/image";
import { type Artist } from "@/lib/types";
import { ExternalLink, Instagram } from "lucide-react";

interface ArtistCardProps {
  artist: Artist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const hasImage = typeof artist.image === "string" && artist.image.length > 0;

  return (
    <Link
      href={`/artistas/${artist.id}`}
      className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30"
    >
      <div className="relative aspect-square overflow-hidden bg-border">
        {hasImage ? (
          <Image
            src={artist.image}
            alt={artist.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-muted-foreground">
            {artist.name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 via-transparent to-transparent" />

        {/* Artist name overlay on image */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-bold sm:text-base">{artist.name}</h3>
          {artist.genres.length > 0 && (
            <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/80">
              {artist.genres.slice(0, 2).join(" · ")}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between p-3">
        <span className="text-xs text-muted-foreground">
          {artist.releases} lanzamientos
        </span>
        <div className="flex items-center gap-2">
          {artist.instagram && (
            <a
              href={artist.instagram}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(artist.instagram!, "_blank", "noopener,noreferrer"); }}
              className="text-pink-500/60 hover:text-pink-500"
            >
              <Instagram className="h-4 w-4" />
            </a>
          )}
          {artist.spotifyUrl && (
            <div
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(artist.spotifyUrl, "_blank", "noopener,noreferrer"); }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:border-primary hover:text-primary cursor-pointer"
            >
              <ExternalLink className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
