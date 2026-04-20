import { Metadata } from "next";
import { artists } from "@/lib/data/artists";
import { ArtistCard } from "@/components/layout/artist-card";

export const metadata: Metadata = {
  title: "Artistas — Colectivo",
  description: "Discover the artists of our music collective.",
};

export default function ArtistasPage() {
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
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    </main>
  );
}
