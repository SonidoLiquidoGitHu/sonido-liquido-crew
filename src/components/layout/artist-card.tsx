import Link from "next/link";
import Image from "next/image";
import { type Artist, formatFollowers } from "@/lib/types";
import { Users, Disc3, ExternalLink } from "lucide-react";

interface ArtistCardProps {
  artist: Artist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const hasImage = typeof artist.image === "string" && artist.image.length > 0;

  return (
    <Link
      href={`/artistas/${artist.id}`}
      className="group overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all hover:border-primary/30"
    >
      <div className="relative aspect-square overflow-hidden bg-[#2a2a2a]">
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
      </div>
      <div className="flex items-center justify-between p-4">
        <div>
          <h3 className="text-base font-bold">{artist.name}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{formatFollowers(artist.followers)}</span>
            <span className="flex items-center gap-1"><Disc3 className="h-3 w-3" />{artist.releases} releases</span>
          </div>
        </div>
        {artist.spotifyUrl && (
          <div
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(artist.spotifyUrl, "_blank", "noopener,noreferrer"); }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a2a] text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:border-primary hover:text-primary cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </Link>
  );
}
