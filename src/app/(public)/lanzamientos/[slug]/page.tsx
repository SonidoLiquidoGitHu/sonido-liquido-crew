import { notFound } from "next/navigation";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { releasesService } from "@/lib/services";
import { formatDate, getReleaseTypeDisplay } from "@/lib/utils";
import { SpotifyEmbed } from "@/components/public/embeds/SpotifyEmbed";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Calendar, Disc3, User } from "lucide-react";

export const dynamic = "force-dynamic";

interface ReleasePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ReleasePageProps) {
  const { slug } = await params;
  const release = await releasesService.getBySlug(slug);

  if (!release) {
    return { title: "Lanzamiento no encontrado" };
  }

  return {
    title: `${release.title} | Sonido Líquido Crew`,
    description: release.description || `Escucha ${release.title} de Sonido Líquido Crew.`,
  };
}

export default async function ReleasePage({ params }: ReleasePageProps) {
  const { slug } = await params;
  const release = await releasesService.getBySlug(slug);

  if (!release) {
    notFound();
  }

  const primaryArtist = release.primaryArtist;

  return (
    <div className="py-12">
      <div className="section-container">
        {/* Back Button */}
        <Button asChild variant="ghost" className="mb-8">
          <Link href="/discografia">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Discografía
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Album Cover */}
          <div className="relative">
            <div className="aspect-square rounded-xl overflow-hidden bg-slc-card shadow-2xl">
              {release.coverImageUrl ? (
                <SafeImage
                  src={release.coverImageUrl}
                  alt={release.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slc-dark">
                  <Disc3 className="w-32 h-32 text-slc-border" />
                </div>
              )}
            </div>

            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-primary/10 rounded-2xl blur-2xl -z-10" />
          </div>

          {/* Release Info */}
          <div className="flex flex-col justify-center">
            {/* Release Type Badge */}
            <span className="inline-block w-fit px-3 py-1 bg-primary/20 text-primary text-xs font-medium uppercase tracking-wider rounded-full mb-4">
              {getReleaseTypeDisplay(release.releaseType)}
            </span>

            {/* Title */}
            <h1 className="font-oswald text-4xl sm:text-5xl lg:text-6xl uppercase">
              {release.title}
            </h1>

            {/* Artist */}
            {primaryArtist && (
              <Link
                href={`/artistas/${primaryArtist.slug}`}
                className="inline-flex items-center gap-2 mt-4 text-xl text-slc-muted hover:text-primary transition-colors"
              >
                <User className="w-5 h-5" />
                {primaryArtist.name}
              </Link>
            )}

            {/* Release Date */}
            <div className="flex items-center gap-2 mt-4 text-slc-muted">
              <Calendar className="w-5 h-5" />
              <span suppressHydrationWarning>
                {formatDate(release.releaseDate, {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </span>
            </div>

            {/* Description */}
            {release.description && (
              <p className="text-slc-muted mt-6 leading-relaxed">
                {release.description}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-8">
              {release.spotifyUrl && (
                <Button asChild className="bg-spotify hover:bg-spotify-dark">
                  <a href={release.spotifyUrl} target="_blank" rel="noopener noreferrer">
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                      />
                    </svg>
                    Escuchar en Spotify
                  </a>
                </Button>
              )}

              {release.appleMusicUrl && (
                <Button asChild variant="outline">
                  <a href={release.appleMusicUrl} target="_blank" rel="noopener noreferrer">
                    Apple Music
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              )}

              {release.youtubeMusicUrl && (
                <Button asChild variant="outline">
                  <a href={release.youtubeMusicUrl} target="_blank" rel="noopener noreferrer">
                    YouTube Music
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              )}
            </div>

            {/* Spotify Embed */}
            {release.spotifyId && (
              <div className="mt-8">
                <SpotifyEmbed type="album" id={release.spotifyId} height={352} />
              </div>
            )}
          </div>
        </div>

        {/* All Artists Section */}
        {release.artists && release.artists.length > 0 && (
          <section className="mt-16">
            <h2 className="font-oswald text-2xl uppercase mb-6">
              {release.artists.length === 1 ? "Artista" : "Artistas"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {release.artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artistas/${artist.slug}`}
                  className="group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-slc-card mb-2">
                    {artist.profileImageUrl ? (
                      <SafeImage
                        src={artist.profileImageUrl}
                        alt={artist.name}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-12 h-12 text-slc-border" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-oswald text-sm uppercase text-center group-hover:text-primary transition-colors">
                    {artist.name}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="mt-16 p-8 bg-slc-card border border-slc-border rounded-xl text-center">
          <h3 className="font-oswald text-xl uppercase mb-3">
            Explora más música
          </h3>
          <p className="text-slc-muted mb-6">
            Descubre más lanzamientos del colectivo Sonido Líquido Crew.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild>
              <Link href="/discografia">Ver Discografía</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/artistas">Ver Artistas</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
