import { notFound } from "next/navigation";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists, artistEpk, artistExternalProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  Music,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Download,
  ExternalLink,
  Quote,
  Play,
  Calendar,
  Disc3,
  Video,
  Users,
  Building,
  Mic,
  Award,
  TrendingUp,
  FileText,
  Palette,
  Wrench,
  Star,
  Clock,
  Globe,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function parseJson<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function getArtistEpk(slug: string) {
  if (!isDatabaseConfigured()) return null;

  try {
    // Get artist by slug
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    if (!artist) return null;

    // Get EPK data
    const [epk] = await db
      .select()
      .from(artistEpk)
      .where(eq(artistEpk.artistId, artist.id))
      .limit(1);

    // Get external profiles
    const profiles = await db
      .select()
      .from(artistExternalProfiles)
      .where(eq(artistExternalProfiles.artistId, artist.id));

    return { artist, epk, profiles };
  } catch (error) {
    console.error("Error fetching EPK:", error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const data = await getArtistEpk(slug);

  if (!data?.artist) {
    return { title: "EPK no encontrado" };
  }

  const { artist, epk } = data;

  return {
    title: `${artist.name} - EPK | Sonido Líquido Crew`,
    description: epk?.bioShort || epk?.tagline || artist.shortBio || `Electronic Press Kit de ${artist.name}`,
    openGraph: {
      images: artist.profileImageUrl ? [artist.profileImageUrl] : [],
    },
  };
}

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    mc: "MC / Rapero",
    dj: "DJ",
    producer: "Productor",
    cantante: "Cantante",
    divo: "Divo",
    lado_b: "Lado B",
  };
  return labels[role] || role;
};

const getRoleBadgeColor = (role: string) => {
  const colors: Record<string, string> = {
    mc: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    dj: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    producer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cantante: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  };
  return colors[role] || "bg-slc-card text-slc-muted border-slc-border";
};

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "spotify":
      return <Music className="w-5 h-5" />;
    case "instagram":
      return <Instagram className="w-5 h-5" />;
    case "youtube":
      return <Youtube className="w-5 h-5" />;
    default:
      return <Globe className="w-5 h-5" />;
  }
};

const getPlatformColor = (platform: string) => {
  const colors: Record<string, string> = {
    spotify: "bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20",
    instagram: "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20",
    youtube: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    tiktok: "bg-white/10 text-white hover:bg-white/20",
    twitter: "bg-blue-400/10 text-blue-400 hover:bg-blue-400/20",
    facebook: "bg-blue-600/10 text-blue-600 hover:bg-blue-600/20",
    soundcloud: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
    apple_music: "bg-red-500/10 text-red-400 hover:bg-red-500/20",
  };
  return colors[platform] || "bg-slc-card text-slc-muted hover:bg-slc-card/80";
};

function formatNumber(num: number | null | undefined): string {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}

export default async function PublicEpkPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getArtistEpk(slug);

  if (!data?.artist) {
    notFound();
  }

  const { artist, epk, profiles } = data;

  // Check if EPK is public (or show anyway if no EPK exists)
  if (epk && !epk.isPublic) {
    notFound();
  }

  // Parse JSON fields
  const brandColors = parseJson<string[]>(epk?.brandColors, []);
  const subgenres = parseJson<string[]>(epk?.subgenres, []);
  const streamingHighlights = parseJson<string[]>(epk?.streamingHighlights, []);
  const pressFeatures = parseJson<{ outlet: string; title: string; url: string; date?: string }[]>(epk?.pressFeatures, []);
  const pressQuotes = parseJson<{ quote: string; source: string; sourceUrl?: string }[]>(epk?.pressQuotes, []);
  const editorialPlaylists = parseJson<{ name: string; platform: string; followers: number; url: string }[]>(epk?.editorialPlaylists, []);
  const pastShows = parseJson<{ venue: string; city: string; date: string; type: string }[]>(epk?.pastShows, []);
  const festivalAppearances = parseJson<string[]>(epk?.festivalAppearances, []);
  const notableVenues = parseJson<string[]>(epk?.notableVenues, []);
  const collaborations = parseJson<{ artistName: string; trackName: string; year: number; type: string }[]>(epk?.collaborations, []);
  const topTracks = parseJson<{ title: string; url: string; platform: string }[]>(epk?.topTracks, []);
  const officialMusicVideos = parseJson<{ title: string; url: string; views: number }[]>(epk?.officialMusicVideos, []);
  const featuredVideo = parseJson<{ title: string; url: string; platform: string } | null>(epk?.featuredVideo, null);
  const setLengthOptions = parseJson<number[]>(epk?.setLengthOptions, []);

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        {/* Background */}
        {artist.bannerImageUrl && (
          <div className="absolute inset-0 opacity-15">
            <SafeImage
              src={artist.bannerImageUrl}
              alt=""
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slc-black/30 via-slc-black/70 to-slc-black" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          {/* Back Link */}
          <Link
            href="/prensa"
            className="inline-flex items-center gap-2 text-slc-muted hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Press Kit
          </Link>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
            {/* Profile Image */}
            <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden bg-slc-card shadow-2xl border-4 border-primary/20 flex-shrink-0 mx-auto lg:mx-0">
              {artist.profileImageUrl ? (
                <SafeImage
                  src={artist.profileImageUrl}
                  alt={artist.name}
                  width={256}
                  height={256}
                  className="w-full h-full object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slc-card to-slc-border">
                  <User className="w-24 h-24 text-slc-muted" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 mb-4">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm uppercase tracking-wider text-primary font-medium">
                  Electronic Press Kit
                </span>
              </div>

              <h1 className="font-oswald text-4xl md:text-5xl lg:text-6xl uppercase mb-4">
                {artist.name}
              </h1>

              {/* Role Badge */}
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getRoleBadgeColor(artist.role)} mb-4`}>
                {getRoleLabel(artist.role)}
              </span>

              {/* Tagline */}
              {epk?.tagline && (
                <p className="text-xl text-primary font-medium mb-4 max-w-2xl">
                  {epk.tagline}
                </p>
              )}

              {/* Genre */}
              {(epk?.genreSpecific || subgenres.length > 0) && (
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-6">
                  {epk?.genreSpecific && (
                    <span className="px-3 py-1 bg-slc-card border border-slc-border rounded-full text-sm">
                      {epk.genreSpecific}
                    </span>
                  )}
                  {subgenres.map((genre, idx) => (
                    <span key={idx} className="px-3 py-1 bg-slc-card/50 border border-slc-border/50 rounded-full text-sm text-slc-muted">
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Stats */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-8">
                {epk?.spotifyMonthlyListeners && epk.spotifyMonthlyListeners > 0 && (
                  <div className="text-center">
                    <div className="font-oswald text-3xl text-[#1DB954]">
                      {formatNumber(epk.spotifyMonthlyListeners)}
                    </div>
                    <div className="text-xs text-slc-muted uppercase tracking-wider">Oyentes/Mes</div>
                  </div>
                )}
                {epk?.youtubeSubscribers && epk.youtubeSubscribers > 0 && (
                  <div className="text-center">
                    <div className="font-oswald text-3xl text-red-500">
                      {formatNumber(epk.youtubeSubscribers)}
                    </div>
                    <div className="text-xs text-slc-muted uppercase tracking-wider">Suscriptores</div>
                  </div>
                )}
                {epk?.instagramFollowers && epk.instagramFollowers > 0 && (
                  <div className="text-center">
                    <div className="font-oswald text-3xl text-pink-500">
                      {formatNumber(epk.instagramFollowers)}
                    </div>
                    <div className="text-xs text-slc-muted uppercase tracking-wider">Seguidores</div>
                  </div>
                )}
                {epk?.totalStreams && epk.totalStreams > 0 && (
                  <div className="text-center">
                    <div className="font-oswald text-3xl text-primary">
                      {formatNumber(epk.totalStreams)}
                    </div>
                    <div className="text-xs text-slc-muted uppercase tracking-wider">Streams Totales</div>
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                {profiles.map((profile) => (
                  <a
                    key={profile.id}
                    href={profile.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${getPlatformColor(profile.platform)}`}
                  >
                    {getPlatformIcon(profile.platform)}
                    <span className="capitalize text-sm">{profile.platform.replace("_", " ")}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bio Section */}
      {(epk?.bioShort || epk?.bioLong || artist.bio) && (
        <section className="py-12 bg-slc-dark/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <User className="w-6 h-6 text-primary" />
                Biografía
              </h2>
              <div className="prose prose-invert prose-lg max-w-none">
                {(epk?.bioLong || epk?.bioShort || artist.bio || "").split("\n\n").map((p, i) => (
                  <p key={i} className="text-slc-muted mb-4 leading-relaxed">{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Streaming Highlights */}
      {streamingHighlights.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-primary" />
                Logros de Streaming
              </h2>
              <div className="grid gap-3">
                {streamingHighlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-slc-card border border-slc-border rounded-lg">
                    <Award className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Press Quotes */}
      {pressQuotes.length > 0 && (
        <section className="py-12 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-8 flex items-center gap-3">
                <Quote className="w-6 h-6 text-primary" />
                Citas de Prensa
              </h2>
              <div className="grid gap-6">
                {pressQuotes.map((quote, idx) => (
                  <blockquote
                    key={idx}
                    className="relative bg-slc-card border border-slc-border rounded-xl p-6 md:p-8"
                  >
                    <Quote className="absolute top-6 left-6 w-8 h-8 text-primary/20" />
                    <p className="text-lg md:text-xl text-white/90 italic pl-10 mb-4">
                      "{quote.quote}"
                    </p>
                    <footer className="pl-10 flex items-center gap-2">
                      <span className="text-primary font-medium">— {quote.source}</span>
                      {quote.sourceUrl && (
                        <a
                          href={quote.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slc-muted hover:text-primary"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Video */}
      {featuredVideo && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <Video className="w-6 h-6 text-primary" />
                Video Destacado
              </h2>
              <div className="aspect-video rounded-2xl overflow-hidden bg-slc-card shadow-2xl">
                {extractYouTubeId(featuredVideo.url) ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(featuredVideo.url)}`}
                    title={featuredVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <a
                      href={featuredVideo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <Play className="w-6 h-6" />
                      Ver video
                    </a>
                  </div>
                )}
              </div>
              {featuredVideo.title && (
                <p className="text-center text-slc-muted mt-4">{featuredVideo.title}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Music Videos Grid */}
      {officialMusicVideos.length > 0 && (
        <section className="py-12 bg-slc-dark/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <Video className="w-6 h-6 text-primary" />
                Videos Musicales ({officialMusicVideos.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {officialMusicVideos.slice(0, 6).map((video, idx) => {
                  const videoId = extractYouTubeId(video.url);
                  const thumbnail = videoId
                    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    : null;

                  return (
                    <a
                      key={idx}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-slc-card border border-slc-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
                    >
                      <div className="aspect-video relative bg-slc-border">
                        {thumbnail ? (
                          <SafeImage
                            src={thumbnail}
                            alt={video.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Youtube className="w-12 h-12 text-slc-muted" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {video.title}
                        </h4>
                        {video.views > 0 && (
                          <p className="text-xs text-slc-muted mt-1">
                            {formatNumber(video.views)} vistas
                          </p>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Top Tracks */}
      {topTracks.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <Music className="w-6 h-6 text-primary" />
                Tracks Destacados
              </h2>
              <div className="grid gap-3">
                {topTracks.map((track, idx) => (
                  <a
                    key={idx}
                    href={track.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-slc-card border border-slc-border rounded-lg hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Play className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                        {track.title}
                      </h4>
                      <p className="text-xs text-slc-muted capitalize">{track.platform}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slc-muted" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Editorial Playlists */}
      {editorialPlaylists.length > 0 && (
        <section className="py-12 bg-slc-dark/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <Disc3 className="w-6 h-6 text-primary" />
                Playlists Editoriales
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {editorialPlaylists.map((playlist, idx) => (
                  <a
                    key={idx}
                    href={playlist.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-slc-card border border-slc-border rounded-lg hover:border-[#1DB954]/50 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-[#1DB954]/10 flex items-center justify-center flex-shrink-0">
                      <Music className="w-6 h-6 text-[#1DB954]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate group-hover:text-[#1DB954] transition-colors">
                        {playlist.name}
                      </h4>
                      <p className="text-xs text-slc-muted">
                        {formatNumber(playlist.followers)} seguidores • {playlist.platform}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Press Features */}
      {pressFeatures.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                Apariciones en Prensa
              </h2>
              <div className="grid gap-4">
                {pressFeatures.map((feature, idx) => (
                  <a
                    key={idx}
                    href={feature.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-slc-card border border-slc-border rounded-lg hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium group-hover:text-primary transition-colors">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-slc-muted">
                        {feature.outlet}
                        {feature.date && ` • ${feature.date}`}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slc-muted flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Collaborations */}
      {collaborations.length > 0 && (
        <section className="py-12 bg-slc-dark/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                Colaboraciones Destacadas
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {collaborations.map((collab, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slc-card border border-slc-border rounded-lg"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Mic className="w-5 h-5 text-primary" />
                      <span className="font-medium">{collab.artistName}</span>
                    </div>
                    <p className="text-sm text-slc-muted">
                      "{collab.trackName}" ({collab.year})
                    </p>
                    <span className="text-xs text-primary/70 capitalize">{collab.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Shows & Festivals */}
      {(pastShows.length > 0 || festivalAppearances.length > 0 || notableVenues.length > 0) && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-primary" />
                Shows & Festivales
              </h2>

              {festivalAppearances.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm uppercase tracking-wider text-slc-muted mb-4">Festivales</h3>
                  <div className="flex flex-wrap gap-2">
                    {festivalAppearances.map((festival, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-sm"
                      >
                        {festival}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {notableVenues.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm uppercase tracking-wider text-slc-muted mb-4">Venues Notables</h3>
                  <div className="flex flex-wrap gap-2">
                    {notableVenues.map((venue, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-slc-card border border-slc-border rounded-full text-sm"
                      >
                        {venue}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {pastShows.length > 0 && (
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-slc-muted mb-4">Shows Recientes</h3>
                  <div className="grid gap-3">
                    {pastShows.slice(0, 5).map((show, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 p-3 bg-slc-card border border-slc-border rounded-lg"
                      >
                        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium">{show.venue}</span>
                          <span className="text-slc-muted"> • {show.city}</span>
                        </div>
                        <span className="text-sm text-slc-muted">{show.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Technical Rider Summary */}
      {(epk?.performanceFormat || setLengthOptions.length > 0) && (
        <section className="py-12 bg-slc-dark/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <Wrench className="w-6 h-6 text-primary" />
                Información Técnica
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {epk?.performanceFormat && (
                  <div className="p-4 bg-slc-card border border-slc-border rounded-lg">
                    <h4 className="text-sm text-slc-muted uppercase mb-2">Formato</h4>
                    <p className="font-medium capitalize">{epk.performanceFormat.replace("_", " ")}</p>
                  </div>
                )}
                {setLengthOptions.length > 0 && (
                  <div className="p-4 bg-slc-card border border-slc-border rounded-lg">
                    <h4 className="text-sm text-slc-muted uppercase mb-2">Duración del Set</h4>
                    <p className="font-medium">{setLengthOptions.join(", ")} minutos</p>
                  </div>
                )}
              </div>
              {epk?.technicalRiderPdfUrl && (
                <div className="mt-4">
                  <Button asChild variant="outline">
                    <a href={epk.technicalRiderPdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Rider Técnico (PDF)
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-oswald text-2xl uppercase mb-8 flex items-center gap-3">
              <Mail className="w-6 h-6 text-primary" />
              Contacto
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {epk?.bookingEmail && (
                <a
                  href={`mailto:${epk.bookingEmail}`}
                  className="bg-slc-card border border-slc-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
                >
                  <div className="text-xs text-slc-muted uppercase tracking-wider mb-2">Booking</div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary group-hover:underline text-sm">{epk.bookingEmail}</span>
                    <Mail className="w-4 h-4 text-slc-muted" />
                  </div>
                </a>
              )}

              {epk?.managementEmail && (
                <a
                  href={`mailto:${epk.managementEmail}`}
                  className="bg-slc-card border border-slc-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
                >
                  <div className="text-xs text-slc-muted uppercase tracking-wider mb-2">Management</div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary group-hover:underline text-sm">{epk.managementEmail}</span>
                    <Building className="w-4 h-4 text-slc-muted" />
                  </div>
                  {epk.managementName && (
                    <p className="text-xs text-slc-muted mt-1">{epk.managementName}</p>
                  )}
                </a>
              )}

              {epk?.publicistEmail && (
                <a
                  href={`mailto:${epk.publicistEmail}`}
                  className="bg-slc-card border border-slc-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
                >
                  <div className="text-xs text-slc-muted uppercase tracking-wider mb-2">Prensa / PR</div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary group-hover:underline text-sm">{epk.publicistEmail}</span>
                    <FileText className="w-4 h-4 text-slc-muted" />
                  </div>
                  {epk.publicistName && (
                    <p className="text-xs text-slc-muted mt-1">{epk.publicistName}</p>
                  )}
                </a>
              )}

              {/* General SLC Contact */}
              <a
                href="mailto:prensasonidoliquido@gmail.com"
                className="bg-slc-card border border-slc-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
              >
                <div className="text-xs text-slc-muted uppercase tracking-wider mb-2">Sonido Líquido Crew</div>
                <div className="flex items-center justify-between">
                  <span className="text-primary group-hover:underline text-sm">prensasonidoliquido@gmail.com</span>
                  <Mail className="w-4 h-4 text-slc-muted" />
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Downloads Section */}
      {(epk?.pressKitPdfUrl || epk?.hiResPhotosZipUrl || epk?.logoPackZipUrl) && (
        <section className="py-12 bg-slc-dark/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <Download className="w-6 h-6 text-primary" />
                Descargas
              </h2>
              <div className="flex flex-wrap gap-4">
                {epk?.pressKitPdfUrl && (
                  <Button asChild variant="outline" size="lg">
                    <a href={epk.pressKitPdfUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-5 h-5 mr-2" />
                      Press Kit PDF
                    </a>
                  </Button>
                )}
                {epk?.hiResPhotosZipUrl && (
                  <Button asChild variant="outline" size="lg">
                    <a href={epk.hiResPhotosZipUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-5 h-5 mr-2" />
                      Fotos Hi-Res
                    </a>
                  </Button>
                )}
                {epk?.logoPackZipUrl && (
                  <Button asChild variant="outline" size="lg">
                    <a href={epk.logoPackZipUrl} target="_blank" rel="noopener noreferrer">
                      <Palette className="w-5 h-5 mr-2" />
                      Logos
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Brand Colors */}
      {brandColors.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <Palette className="w-6 h-6 text-primary" />
                Colores de Marca
              </h2>
              <div className="flex flex-wrap gap-4">
                {brandColors.map((color, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-slc-card border border-slc-border rounded-lg"
                  >
                    <div
                      className="w-10 h-10 rounded-lg border border-slc-border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-mono text-sm">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-gradient-to-t from-primary/10 to-transparent">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slc-muted mb-4">
            Ver información completa de todo el colectivo
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/prensa">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Press Kit General
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/artistas/${artist.slug}`}>
                <User className="w-5 h-5 mr-2" />
                Perfil del Artista
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
