import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { artists, getArtistBySlug } from "@/lib/data/artists";
import { ArrowLeft, Instagram, Music, ExternalLink } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return artists.map((artist) => ({ slug: artist.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);
  if (!artist) return { title: "Not Found — Colectivo" };

  return {
    title: `${artist.name} — Colectivo`,
    description: artist.bio,
  };
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);

  if (!artist) notFound();

  const socialLinks = [
    artist.socials.instagram
      ? { label: "Instagram", href: artist.socials.instagram, icon: Instagram }
      : null,
    artist.socials.spotify
      ? { label: "Spotify", href: artist.socials.spotify, icon: Music }
      : null,
    artist.socials.soundcloud
      ? { label: "SoundCloud", href: artist.socials.soundcloud, icon: ExternalLink }
      : null,
    artist.socials.youtube
      ? { label: "YouTube", href: artist.socials.youtube, icon: ExternalLink }
      : null,
    artist.socials.twitter
      ? { label: "Twitter / X", href: artist.socials.twitter, icon: ExternalLink }
      : null,
  ].filter(Boolean) as { label: string; href: string; icon: typeof ExternalLink }[];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/artistas"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Artists
      </Link>

      <div className="grid gap-10 lg:grid-cols-[400px_1fr] lg:gap-16">
        <div className="relative aspect-square overflow-hidden rounded-2xl">
          <Image
            src={artist.image}
            alt={artist.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 400px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
        </div>

        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {artist.name}
          </h1>
          <div className="mt-6 h-px w-16 bg-primary" />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {artist.bio}
          </p>

          {socialLinks.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Follow
              </h3>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/50 hover:text-foreground"
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
