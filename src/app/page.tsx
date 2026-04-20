import Link from "next/link";
import Image from "next/image";
import { artists } from "@/lib/data/artists";
import { ArrowRight, Music2, Users, Disc3 } from "lucide-react";

export default function HomePage() {
  const featured = artists.slice(0, 3);

  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-4">
        <div className="absolute inset-0 -z-10">
          <Image
            src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1920&h=1080&fit=crop"
            alt="Music collective background"
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/30 px-4 py-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase backdrop-blur-sm">
            <Music2 className="h-3.5 w-3.5" />
            Music Collective
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl">
            Where Sound
            <br />
            <span className="text-primary">Meets Soul</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground">
            A collective of artists pushing boundaries across electronic,
            ambient, and experimental music from Latin America and beyond.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/artistas"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Explore Artists
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/40 bg-muted/20">
        <div className="mx-auto grid max-w-6xl grid-cols-3 gap-4 px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold sm:text-3xl">{artists.length}</span>
            <span className="text-xs text-muted-foreground sm:text-sm">Artists</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <Disc3 className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold sm:text-3xl">24</span>
            <span className="text-xs text-muted-foreground sm:text-sm">Releases</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <Music2 className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold sm:text-3xl">8</span>
            <span className="text-xs text-muted-foreground sm:text-sm">Events</span>
          </div>
        </div>
      </section>

      {/* Featured Artists */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Featured Artists</h2>
            <p className="mt-2 text-muted-foreground">
              Discover the voices shaping our collective.
            </p>
          </div>
          <Link
            href="/artistas"
            className="hidden items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-80 sm:inline-flex"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((artist) => (
            <Link
              key={artist.id}
              href={`/artistas/${artist.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={artist.image}
                  alt={artist.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold tracking-tight">{artist.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {artist.bio}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/artistas"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            View all artists
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
