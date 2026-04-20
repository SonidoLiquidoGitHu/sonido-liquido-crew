import { Metadata, headers } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Artistas — Colectivo",
  description: "Discover the artists of our music collective.",
};

interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string;
  image: string;
  socials: Record<string, string>;
}

async function getArtists(): Promise<Artist[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL
    ?? process.env.VERCEL_URL
    ?? process.env.NETLIFY_URL
    ?? "http://localhost:3000";
  const url = base.startsWith("http") ? base : `https://${base}`;
  const res = await fetch(`${url}/api/artists`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function ArtistasPage() {
  const artists = await getArtists();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Artistas</h1>
        <p className="mt-3 max-w-xl text-lg text-muted-foreground">
          The creative forces behind the collective. Each artist brings a unique
          voice, a distinct vision, and an unwavering commitment to pushing
          sonic boundaries.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => (
          <Link
            key={artist.id}
            href={`/artistas/${artist.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="relative aspect-square overflow-hidden">
              <Image
                src={artist.image}
                alt={artist.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-xl font-bold tracking-tight">{artist.name}</h2>
              </div>
              <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
