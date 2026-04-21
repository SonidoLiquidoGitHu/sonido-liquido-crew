import Link from "next/link";
import Image from "next/image";
import { type Artist, formatFollowers } from "@/lib/types";
import { Users, ExternalLink } from "lucide-react";

interface ArtistCardProps {
  artist: Artist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const hasImage = typeof artist.image === "string" && artist.image.length > 0;

  return (
    <Link
      href={`/artistas/${artist.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
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
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold tracking-tight">{artist.name}</h3>
        </div>
        {artist.spotifyUrl && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(artist.spotifyUrl, "_blank", "noopener,noreferrer");
            }}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{formatFollowers(artist.followers)} followers</span>
        </div>
      </div>
    </Link>
  );
}
