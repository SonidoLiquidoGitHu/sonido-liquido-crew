import { notFound } from "next/navigation";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { artistsService, upcomingReleasesService } from "@/lib/services";
import { getArtistBySlug } from "@/lib/data/artists-roster";
import { getArtistRoleDisplay } from "@/lib/utils";
import { ReleaseCard } from "@/components/public/cards/ReleaseCard";
import { SpotifyEmbed } from "@/components/public/embeds/SpotifyEmbed";
import { InstagramEmbed } from "@/components/public/embeds/InstagramEmbed";
import { ArtistYouTubeSection } from "@/components/public/ArtistYouTubeSection";
import { ArtistUpcomingReleases } from "@/components/public/ArtistUpcomingReleases";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Disc3,
  Instagram,
  Youtube,
  Music2,
  Play
} from "lucide-react";

export const dynamic = "force-dynamic";

interface ArtistPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArtistPageProps) {
  const { slug } = await params;
  const artist = await artistsService.getBySlug(slug);
  const rosterArtist = getArtistBySlug(slug);

  const name = artist?.name || rosterArtist?.name;

  if (!name) {
    return { title: "Artista no encontrado" };
  }

  return {
    title: `${name} | Sonido Líquido Crew`,
    description: artist?.bio || rosterArtist?.bio || `Perfil de ${name}, artista de Sonido Líquido Crew.`,
  };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { slug } = await params;
  const artist = await artistsService.getBySlug(slug);
  const rosterArtist = getArtistBySlug(slug);

  if (!artist && !rosterArtist) {
    notFound();
  }

  // Merge data from both sources
  const artistName = artist?.name || rosterArtist?.name || "";

  // Fetch upcoming releases for this artist
  const upcomingReleases = await upcomingReleasesService.getByArtistName(artistName, 4);
  const artistBio = artist?.bio || rosterArtist?.bio;
  const artistRole = artist?.role || rosterArtist?.role;
  const profileImage = artist?.profileImageUrl;
  const tintColor = artist?.tintColor || "primary";

  // Get external profiles
  const spotifyProfile = artist?.externalProfiles?.find((p) => p.platform === "spotify");
  const spotifyId = spotifyProfile?.externalId || rosterArtist?.spotifyId;
  const spotifyUrl = spotifyProfile?.externalUrl || rosterArtist?.spotifyUrl;

  const instagramProfile = artist?.externalProfiles?.find((p) => p.platform === "instagram");
  const instagramHandle = instagramProfile?.handle || rosterArtist?.instagramHandle;
  const instagramUrl = instagramProfile?.externalUrl || rosterArtist?.instagramUrl;

  const youtubeProfile = artist?.externalProfiles?.find((p) => p.platform === "youtube");
  const youtubeUrl = youtubeProfile?.externalUrl || rosterArtist?.youtubeUrl;
  const youtubeHandle = youtubeProfile?.handle || rosterArtist?.youtubeHandle;

  // Secondary YouTube channel (for artists with multiple channels)
  const youtubeUrl2 = rosterArtist?.youtubeUrl2;
  const youtubeHandle2 = rosterArtist?.youtubeHandle2;

  // Combine YouTube channels into an array for easier rendering
  const youtubeChannels = [
    youtubeUrl ? { url: youtubeUrl, handle: youtubeHandle, name: artistName } : null,
    youtubeUrl2 ? { url: youtubeUrl2, handle: youtubeHandle2, name: youtubeHandle2?.replace('@', '') || "Canal Secundario" } : null,
  ].filter(Boolean) as { url: string; handle?: string; name: string }[];

  return (
    <div className="min-h-screen">
      {/* Hero Section with Gradient Background */}
      <section className="relative py-12 lg:py-20 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-purple-900/5 to-slc-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        <div className="section-container relative z-10">
          {/* Back Button */}
          <Button asChild variant="ghost" className="mb-8">
            <Link href="/artistas">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Todos los Artistas
            </Link>
          </Button>

          {/* Artist Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Profile Image */}
            <div className="lg:col-span-1">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slc-card shadow-2xl">
                {profileImage ? (
                  <SafeImage
                    src={profileImage}
                    alt={artistName}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slc-card to-slc-border">
                    <span className="font-oswald text-8xl text-slc-muted">
                      {artistName.charAt(0)}
                    </span>
                  </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            </div>

            {/* Artist Info */}
            <div className="lg:col-span-2 flex flex-col justify-center">
              {/* Role Badge */}
              <span className="inline-flex items-center gap-2 text-primary text-sm uppercase tracking-widest mb-3">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                {getArtistRoleDisplay(artistRole)}
              </span>

              {/* Name */}
              <h1 className="font-oswald text-5xl sm:text-6xl lg:text-7xl uppercase leading-none mb-6">
                {artistName}
              </h1>

              {/* Bio */}
              {artistBio && (
                <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-2xl">
                  {artistBio}
                </p>
              )}

              {/* Social Links */}
              <div className="flex flex-wrap gap-3 mb-8">
                {spotifyUrl && (
                  <a
                    href={spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-spotify hover:bg-spotify/90 text-white rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    Spotify
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 text-white rounded-full transition-opacity"
                  >
                    <Instagram className="w-5 h-5" />
                    Instagram
                  </a>
                )}
                {youtubeChannels.map((channel, index) => (
                  <a
                    key={channel.url}
                    href={channel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                  >
                    <Youtube className="w-5 h-5" />
                    {youtubeChannels.length > 1 ? (channel.handle || `YouTube ${index + 1}`) : "YouTube"}
                  </a>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href={`/artistas/${slug}/discografia`}>
                    <Disc3 className="w-5 h-5 mr-2" />
                    Ver Discografía Completa
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                {spotifyId && (
                  <Button asChild variant="outline" size="lg">
                    <a href={`https://open.spotify.com/artist/${spotifyId}`} target="_blank" rel="noopener noreferrer">
                      <Play className="w-5 h-5 mr-2" fill="currentColor" />
                      Escuchar Ahora
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-container pb-20">
        {/* Upcoming Releases Section */}
        {upcomingReleases.length > 0 && (
          <ArtistUpcomingReleases
            artistName={artistName}
            artistSlug={slug}
            initialReleases={upcomingReleases}
          />
        )}

        {/* Spotify Player Section */}
        {spotifyId && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-oswald text-2xl uppercase flex items-center gap-3">
                <Music2 className="w-6 h-6 text-spotify" />
                Escuchar en Spotify
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/artistas/${slug}/discografia`}>
                  Ver discografía completa
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="bg-slc-card border border-slc-border rounded-xl overflow-hidden">
              <SpotifyEmbed type="artist" id={spotifyId} height={352} />
            </div>
          </section>
        )}

        {/* Instagram Feed Section */}
        {instagramHandle && (
          <section className="mb-16">
            <InstagramEmbed
              username={instagramHandle}
              showHeader={true}
              showFollowButton={true}
              postsToShow={6}
            />
          </section>
        )}

        {/* YouTube Videos Section */}
        {youtubeChannels.length > 0 && (
          <ArtistYouTubeSection
            artistName={artistName}
            artistSlug={slug}
            channelUrl={youtubeChannels[0].url}
            channelHandle={youtubeChannels[0].handle}
            maxVideos={4}
          />
        )}

        {/* Releases Section */}
        {artist?.releases && artist.releases.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-oswald text-2xl uppercase flex items-center gap-3">
                <Disc3 className="w-6 h-6 text-primary" />
                Lanzamientos Recientes
              </h2>
              <Button asChild variant="outline">
                <Link href={`/artistas/${slug}/discografia`}>
                  Ver todos ({artist.releaseCount})
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {artist.releases.slice(0, 5).map((release) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  showArtist={false}
                />
              ))}
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="mt-16 text-center py-12 bg-gradient-to-r from-primary/10 via-purple-900/10 to-primary/10 rounded-2xl border border-white/5">
          <h3 className="font-oswald text-2xl uppercase mb-4">
            ¿Quieres más de {artistName}?
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Explora la discografía completa, sigue en redes sociales y no te pierdas ningún lanzamiento.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href={`/artistas/${slug}/discografia`}>
                <Disc3 className="w-5 h-5 mr-2" />
                Discografía Completa
              </Link>
            </Button>
            {spotifyUrl && (
              <Button asChild variant="outline" size="lg" className="border-spotify text-spotify hover:bg-spotify/20">
                <a href={spotifyUrl} target="_blank" rel="noopener noreferrer">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  Seguir en Spotify
                </a>
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
