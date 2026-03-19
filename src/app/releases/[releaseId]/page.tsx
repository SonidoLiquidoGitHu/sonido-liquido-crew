import { getClient, initializeDatabase } from "../../../lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Disc3,
  Download,
  ExternalLink,
  Music2,
  Play,
  Share2,
  User,
  Youtube,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Release {
  releaseId: string;
  title: string;
  titleEn: string | null;
  artistName: string | null;
  featuredArtists: string | null;
  releaseType: string;
  releaseDate: string | null;
  coverImageUrl: string | null;
  spotifyUrl: string | null;
  isActive: number;
  isPublic: number;
  isPublished: number;
  descriptionEs: string | null;
  descriptionEn: string | null;
  pressReleaseEs: string | null;
  pressReleaseEn: string | null;
  creditsEs: string | null;
  creditsEn: string | null;
  quotes: string[];
  pressPhotos: string[];
  youtubeVideoId: string | null;
  soundcloudUrl: string | null;
  audioPreviewUrl: string | null;
  presaveOnerpm: string | null;
  presaveDistrokreleaseId: string | null;
  presaveBandcamp: string | null;
  presaveDirect: string | null;
}

interface Track {
  releaseId: string;
  trackNumber: number;
  title: string;
  artistName: string | null;
  duration: string | null;
  audioUrl: string | null;
  isFeatured: number;
}

async function getRelease(releaseId: string): Promise<{ release: Release; tracks: Track[] } | null> {
  try {
    await initializeDatabase();
    const client = await getClient();

    const result = await client.execute({
      sql: "SELECT * FROM releases WHERE id = ?",
      args: [releaseId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const release: Release = {
      releaseId: row.id as string,
      title: row.title as string,
      titleEn: row.title_en as string | null,
      artistName: row.artist_name as string | null,
      featuredArtists: row.featured_artists as string | null,
      releaseType: row.release_type as string,
      releaseDate: row.release_date as string | null,
      coverImageUrl: (row.cover_image_url || row.image_url) as string | null,
      spotifyUrl: row.spotify_url as string | null,
      isActive: row.is_active as number,
      isPublic: row.is_public as number,
      isPublished: row.is_published as number,
      descriptionEs: row.description_es as string | null,
      descriptionEn: row.description_en as string | null,
      pressReleaseEs: row.press_release_es as string | null,
      pressReleaseEn: row.press_release_en as string | null,
      creditsEs: row.credits_es as string | null,
      creditsEn: row.credits_en as string | null,
      quotes: row.quotes ? JSON.parse(row.quotes as string) : [],
      pressPhotos: row.press_photos ? JSON.parse(row.press_photos as string) : [],
      youtubeVideoId: row.youtube_video_id as string | null,
      soundcloudUrl: row.soundcloud_url as string | null,
      audioPreviewUrl: row.audio_preview_url as string | null,
      presaveOnerpm: row.presave_onerpm as string | null,
      presaveDistrokreleaseId: row.presave_distrokid as string | null,
      presaveBandcamp: row.presave_bandcamp as string | null,
      presaveDirect: row.presave_direct as string | null,
    };

    const tracksResult = await client.execute({
      sql: "SELECT * FROM release_tracks WHERE release_id = ? ORDER BY track_number ASC",
      args: [releaseId],
    });

    const tracks: Track[] = tracksResult.rows.map((t) => ({
      releaseId: t.id as string,
      trackNumber: t.track_number as number,
      title: t.title as string,
      artistName: t.artist_name as string | null,
      duration: t.duration as string | null,
      audioUrl: t.audio_url as string | null,
      isFeatured: t.is_featured as number,
    }));

    return { release, tracks };
  } catch (e) {
    console.error("Error fetching release:", e);
    return null;
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getReleaseTypeLabel(type: string): string {
  switch (type) {
    case "album":
      return "Álbum";
    case "single":
      return "Single";
    case "ep":
      return "EP";
    case "compilation":
      return "Compilación";
    default:
      return type;
  }
}

export default async function ReleasePage({
  params,
}: {
  params: Promise<{ releaseId: string }>;
}) {
  const { releaseId } = await params;
  const data = await getRelease(releaseId);

  if (!data) {
    notFound();
  }

  const { release, tracks } = data;

  if (!release.isActive || !release.isPublished) {
    notFound();
  }

  const hasPresaveLinks =
    release.presaveOnerpm ||
    release.presaveDistrokreleaseId ||
    release.presaveBandcamp ||
    release.presaveDirect;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <Music2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold tracking-wider">SONIDO LÍQUIDO</span>
              <p className="text-[10px] text-zinc-500 tracking-widest">MEDIA PREVIEW</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="pt-16">
        <section className="relative py-12 bg-gradient-to-b from-zinc-900 to-zinc-950">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="relative">
                <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-800 shadow-2xl">
                  {release.coverImageUrl ? (
                    <img
                      src={release.coverImageUrl}
                      alt={release.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800">
                      <Disc3 className="h-24 w-24 text-zinc-600" />
                    </div>
                  )}
                </div>
                {hasPresaveLinks && (
                  <div className="absolute top-4 left-4 bg-amber-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                    PRE-SAVE DISPONIBLE
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs font-medium uppercase">
                    {getReleaseTypeLabel(release.releaseType)}
                  </span>
                  {release.releaseDate && (
                    <span className="flex items-center gap-1 text-zinc-500 text-sm">
                      <Calendar className="h-4 w-4" />
                      {formatDate(release.releaseDate)}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                    {release.title}
                  </h1>
                  {release.titleEn && release.titleEn !== release.title && (
                    <p className="text-xl text-zinc-400 mt-1">{release.titleEn}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{release.artistName || "Sonido Líquido"}</p>
                    {release.featuredArtists && (
                      <p className="text-sm text-zinc-500">feat. {release.featuredArtists}</p>
                    )}
                  </div>
                </div>
                {release.descriptionEs && (
                  <p className="text-zinc-400 leading-relaxed">{release.descriptionEs}</p>
                )}
                {hasPresaveLinks && (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-500 uppercase tracking-wider">Pre-save / Escuchar</p>
                    <div className="flex flex-wrap gap-3">
                      {release.presaveOnerpm && (
                        <a
                          href={release.presaveOnerpm}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-medium rounded-lg transition-colors"
                        >
                          <Music2 className="h-4 w-4" />
                          Spotify Pre-save
                        </a>
                      )}
                      {release.presaveDistrokreleaseId && (
                        <a
                          href={release.presaveDistrokreleaseId}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          HyperFollow
                        </a>
                      )}
                      {release.presaveBandcamp && (
                        <a
                          href={release.presaveBandcamp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-[#629aa9] hover:bg-[#4a8090] text-white font-medium rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Bandcamp
                        </a>
                      )}
                      {release.presaveDirect && (
                        <a
                          href={release.presaveDirect}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Descarga Directa
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        {(release.youtubeVideoId || release.spotifyUrl || release.audioPreviewUrl || tracks.length > 0) && (
          <section className="py-12 bg-zinc-900">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="text-2xl font-bold text-white mb-6">Escuchar Preview</h2>
              {release.youtubeVideoId && (
                <div className="mb-8">
                  <div className="aspect-video rounded-xl overflow-hidden bg-zinc-800">
                    <iframe
                      src={`https://www.youtube.com/embed/${release.youtubeVideoId}`}
                      title={release.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}
              {release.spotifyUrl && (
                <div className="mb-8">
                  <iframe
                    src={`https://open.spotify.com/embed/track/${release.spotifyUrl}`}
                    width="100%"
                    height="152"
                    allow="encrypted-media"
                    className="rounded-xl"
                  />
                </div>
              )}
              {tracks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-zinc-300 mb-4">Tracklist</h3>
                  {tracks.map((track) => (
                    <div
                      key={track.releaseId}
                      className={`flex items-center gap-4 p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors ${
                        track.isFeatured ? "border border-amber-500/30" : ""
                      }`}
                    >
                      <span className="w-8 h-8 flex items-center justify-center bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium">
                        {track.trackNumber}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{track.title}</p>
                        {track.artistName && (
                          <p className="text-sm text-zinc-500">{track.artistName}</p>
                        )}
                      </div>
                      {track.duration && (
                        <span className="text-sm text-zinc-500">{track.duration}</span>
                      )}
                      {track.audioUrl && (
                        <a
                          href={track.audioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full hover:bg-emerald-500/30 transition-colors"
                        >
                          <Play className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
        {(release.pressReleaseEs || release.creditsEs || release.quotes.length > 0 || release.pressPhotos.length > 0) && (
          <section className="py-12 bg-zinc-950">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="text-2xl font-bold text-white mb-8">Press Kit</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {release.pressReleaseEs && (
                  <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                    <h3 className="text-lg font-medium text-amber-400 mb-4">Nota de Prensa</h3>
                    <p className="text-zinc-400 whitespace-pre-wrap">{release.pressReleaseEs}</p>
                    {release.pressReleaseEn && (
                      <div className="mt-6 pt-6 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 mb-2">English version:</p>
                        <p className="text-zinc-400 whitespace-pre-wrap">{release.pressReleaseEn}</p>
                      </div>
                    )}
                  </div>
                )}
                {release.creditsEs && (
                  <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                    <h3 className="text-lg font-medium text-amber-400 mb-4">Créditos</h3>
                    <p className="text-zinc-400 whitespace-pre-wrap">{release.creditsEs}</p>
                    {release.creditsEn && (
                      <div className="mt-6 pt-6 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 mb-2">English version:</p>
                        <p className="text-zinc-400 whitespace-pre-wrap">{release.creditsEn}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {release.quotes.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-amber-400 mb-4">Quotes</h3>
                  <div className="grid gap-4">
                    {release.quotes.map((quote, index) => (
                      <blockquote
                        key={index}
                        className="bg-zinc-900 rounded-xl p-6 border-l-4 border-amber-500"
                      >
                        <p className="text-zinc-300 italic">&ldquo;{quote}&rdquo;</p>
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}
              {release.pressPhotos.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-amber-400 mb-4">Fotos (Alta Resolución)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {release.pressPhotos.map((photo, index) => (
                      <a
                        key={index}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden bg-zinc-800 hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={photo}
                          alt={`Press photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
        <section className="py-8 bg-zinc-900 border-t border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <p className="text-zinc-400 text-sm">
                Para más información, contactar:{" "}
                <a
                  href="mailto:prensasonidoliquido@gmail.com"
                  className="text-emerald-400 hover:underline"
                >
                  prensasonidoliquido@gmail.com
                </a>
              </p>
              <a
                href={`mailto:?subject=${encodeURIComponent(release.title)}&body=${encodeURIComponent(`${release.title} - ${release.artistName}`)}`}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Compartir
              </a>
            </div>
          </div>
        </section>
      </main>
      <footer className="py-8 bg-zinc-950 border-t border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 text-zinc-500">
            <Music2 className="h-4 w-4" />
            <span className="text-sm">Sonido Líquido Crew - Media Preview</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
