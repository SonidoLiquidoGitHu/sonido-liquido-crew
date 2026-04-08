import { notFound } from "next/navigation";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { artistsService } from "@/lib/services";
import { getArtistBySlug } from "@/lib/data/artists-roster";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Disc3, ExternalLink, Music2, Play } from "lucide-react";

export const dynamic = "force-dynamic";

interface DiscographyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DiscographyPageProps) {
  const { slug } = await params;
  const artist = await artistsService.getBySlug(slug);
  const rosterArtist = getArtistBySlug(slug);

  const name = artist?.name || rosterArtist?.name || "Artista";

  return {
    title: `Discografía de ${name} | Sonido Líquido Crew`,
    description: `Explora la discografía completa de ${name}. Álbumes, singles y colaboraciones en Spotify.`,
  };
}

export default async function ArtistDiscographyPage({ params }: DiscographyPageProps) {
  const { slug } = await params;
  const artist = await artistsService.getBySlug(slug);
  const rosterArtist = getArtistBySlug(slug);

  if (!artist && !rosterArtist) {
    notFound();
  }

  const artistName = artist?.name || rosterArtist?.name || "Artista";
  const spotifyId = rosterArtist?.spotifyId || artist?.externalProfiles?.find(p => p.platform === "spotify")?.externalId;
  const spotifyUrl = rosterArtist?.spotifyUrl || `https://open.spotify.com/artist/${spotifyId}`;
  const profileImage = artist?.profileImageUrl;

  if (!spotifyId) {
    return (
      <div className="min-h-screen py-12">
        <div className="section-container text-center">
          <Disc3 className="w-16 h-16 text-slc-muted mx-auto mb-4" />
          <h1 className="font-oswald text-3xl uppercase mb-4">Discografía no disponible</h1>
          <p className="text-slc-muted mb-8">
            No se encontró información de Spotify para este artista.
          </p>
          <Button asChild>
            <Link href={`/artistas/${slug}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al perfil
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="section-container">
        {/* Navigation */}
        <Button asChild variant="ghost" className="mb-8">
          <Link href={`/artistas/${slug}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al perfil de {artistName}
          </Link>
        </Button>

        {/* Hero Header */}
        <div className="relative rounded-2xl overflow-hidden mb-12">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-900/30 to-black" />

          {/* Content */}
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 p-8 md:p-12">
            {/* Artist Image */}
            <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl flex-shrink-0">
              {profileImage ? (
                <SafeImage
                  src={profileImage}
                  alt={artistName}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <span className="font-oswald text-5xl text-white">
                    {artistName.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center md:text-left flex-1">
              <p className="text-primary uppercase tracking-widest text-sm mb-2">Discografía</p>
              <h1 className="font-oswald text-4xl md:text-5xl lg:text-6xl uppercase text-white mb-4">
                {artistName}
              </h1>
              <p className="text-gray-400 mb-6 max-w-xl">
                Explora todos los álbumes, singles y colaboraciones de {artistName} disponibles en Spotify.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <Button asChild className="bg-spotify hover:bg-spotify/90">
                  <a href={spotifyUrl} target="_blank" rel="noopener noreferrer">
                    <Play className="w-4 h-4 mr-2" fill="white" />
                    Reproducir en Spotify
                  </a>
                </Button>
                <Button asChild variant="outline" className="border-white/20 hover:bg-white/10">
                  <a href={spotifyUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir perfil
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Spotify Artist Discography Embed - Full Height */}
        <div className="bg-slc-card border border-slc-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slc-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-spotify flex items-center justify-center">
                <Music2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-white">Discografía completa en Spotify</span>
            </div>
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-spotify hover:underline flex items-center gap-1"
            >
              Abrir en Spotify
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Main Spotify Embed - Artist Overview */}
          <iframe
            src={`https://open.spotify.com/embed/artist/${spotifyId}?utm_source=generator&theme=0`}
            width="100%"
            height="500"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="border-b border-slc-border"
          />

          {/* Additional Album Embeds - Top Albums */}
          <div className="p-6">
            <h3 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-primary" />
              Discografía Destacada
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Usa el reproductor de arriba para explorar todos los lanzamientos, o visita el perfil completo en Spotify.
            </p>

            {/* Grid of Spotify Follow/Save Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Tracks Embed */}
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Canciones Populares</h4>
                <iframe
                  src={`https://open.spotify.com/embed/artist/${spotifyId}/top-tracks?utm_source=generator&theme=0`}
                  width="100%"
                  height="180"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-lg"
                />
              </div>

              {/* This Month's Listeners */}
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Artista Relacionado</h4>
                <iframe
                  src={`https://open.spotify.com/embed/artist/${spotifyId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="180"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Back to Profile */}
        <div className="mt-12 text-center">
          <Button asChild variant="outline" size="lg">
            <Link href={`/artistas/${slug}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al perfil de {artistName}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
