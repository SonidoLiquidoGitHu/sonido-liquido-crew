import { getClient, initializeDatabase } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Music2,
  Download,
  ExternalLink,
  Play,
  Lock,
  CheckCircle2,
  Disc3,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Beat {
  beatId: string;
  title: string;
  producerName: string;
  slug: string | null;
  releaseDate: string | null;
  bpm: number | null;
  keySignature: string | null;
  tags: string | null;
  coverImageUrl: string | null;
  audioFileUrl: string | null;
  audioPreviewUrl: string | null;
  hypedditUrl: string | null;
  spotifyTrackId: string | null;
  youtubeVideoId: string | null;
  onerpmUrl: string | null;
  distrokidUrl: string | null;
  bandcampUrl: string | null;
  downloadGateEnabled: boolean;
  downloadCount: number;
  isAvailable: boolean;
  isFeatured: boolean;
}

interface DownloadGateAction {
  beatId: string;
  actionType: string;
  label: string;
  url: string | null;
  sortOrder: number;
}

async function getBeat(beatId: string): Promise<{ beat: Beat; actions: DownloadGateAction[] } | null> {
  try {
    await initializeDatabase();
    const client = await getClient();

    const result = await client.execute({
      sql: "SELECT * FROM beats WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const beat: Beat = {
      id: row.id as string,
      title: row.title as string,
      producerName: row.producer_name as string,
      slug: row.slug as string | null,
      releaseDate: row.release_date as string | null,
      bpm: row.bpm as number | null,
      keySignature: row.key_signature as string | null,
      tags: row.tags as string | null,
      coverImageUrl: row.cover_image_url as string | null,
      audioFileUrl: row.audio_file_url as string | null,
      audioPreviewUrl: row.audio_preview_url as string | null,
      hypedditUrl: row.hypeddit_url as string | null,
      spotifyTrackId: row.spotify_track_id as string | null,
      youtubeVideoId: row.youtube_video_id as string | null,
      onerpmUrl: row.onerpm_url as string | null,
      distrokidUrl: row.distrokid_url as string | null,
      bandcampUrl: row.bandcamp_url as string | null,
      downloadGateEnabled: Boolean(row.download_gate_enabled),
      downloadCount: row.download_count as number,
      isAvailable: Boolean(row.is_available),
      isFeatured: Boolean(row.is_featured),
    };

    // Get download gate actions
    const actionsResult = await client.execute({
      sql: "SELECT * FROM download_gate_actions WHERE beat_id = ? ORDER BY sort_order ASC",
      args: [id],
    });

    const actions: DownloadGateAction[] = actionsResult.rows.map((a) => ({
      id: a.id as string,
      actionType: a.action_type as string,
      label: a.label as string,
      url: a.url as string | null,
      sortOrder: a.sort_order as number,
    }));

    return { beat, actions };
  } catch (e) {
    console.error("Error fetching beat:", e);
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

function parseTags(tagsString: string | null): string[] {
  if (!tagsString) return [];
  return tagsString.split(",").map((t) => t.trim()).filter(Boolean);
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case "subscribe_email":
      return "📧";
    case "follow_spotify":
      return "🎵";
    case "follow_youtube":
      return "▶️";
    case "follow_instagram":
      return "📸";
    case "follow_soundcloud":
      return "☁️";
    default:
      return "🔗";
  }
}

export default async function BeatPage({
  params,
}: {
  params: Promise<{ beatId: string }>;
}) {
  const { beatId } = await params;
  const data = await getBeat(id);

  if (!data) {
    notFound();
  }

  const { beat, actions } = data;

  // Check if beat is available
  if (!beat.isAvailable) {
    notFound();
  }

  const tags = parseTags(beat.tags);
  const hasDistributionLinks = beat.onerpmUrl || beat.distrokidUrl || beat.bandcampUrl;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <Music2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold tracking-wider">SONIDO LÍQUIDO</span>
              <p className="text-[10px] text-zinc-500 tracking-widest">BEAT STORE</p>
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

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-12 bg-gradient-to-b from-zinc-900 to-zinc-950">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Cover Image */}
              <div className="relative w-full md:w-80 flex-shrink-0">
                <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-800 shadow-2xl">
                  {beat.coverImageUrl ? (
                    <img
                      src={beat.coverImageUrl}
                      alt={beat.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-zinc-800">
                      <Disc3 className="h-24 w-24 text-amber-500/50" />
                    </div>
                  )}
                </div>

                {/* Featured badge */}
                {beat.isFeatured && (
                  <div className="absolute top-4 left-4 bg-amber-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                    DESTACADO
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-6">
                {/* Title */}
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                    {beat.title}
                  </h1>
                  <p className="text-lg text-amber-500 mt-1">por {beat.producerName}</p>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-3">
                  {beat.bpm && (
                    <span className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium">
                      {beat.bpm} BPM
                    </span>
                  )}
                  {beat.keySignature && (
                    <span className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium">
                      {beat.keySignature}
                    </span>
                  )}
                  {beat.releaseDate && (
                    <span className="flex items-center gap-1 text-zinc-500 text-sm">
                      <Calendar className="h-4 w-4" />
                      {formatDate(beat.releaseDate)}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-zinc-800/50 border border-zinc-700 text-zinc-400 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Download Count */}
                <p className="text-zinc-500 text-sm flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  {beat.downloadCount} descargas
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Audio Preview Section */}
        {(beat.youtubeVideoId || beat.spotifyTrackId || beat.audioPreviewUrl) && (
          <section className="py-8 bg-zinc-900/50">
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Play className="h-5 w-5 text-amber-500" />
                Preview
              </h2>

              {/* YouTube Embed */}
              {beat.youtubeVideoId && (
                <div className="mb-6">
                  <div className="aspect-video rounded-xl overflow-hidden bg-zinc-800">
                    <iframe
                      src={`https://www.youtube.com/embed/${beat.youtubeVideoId}`}
                      title={beat.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* Spotify Embed */}
              {beat.spotifyTrackId && (
                <div className="mb-6">
                  <iframe
                    src={`https://open.spotify.com/embed/track/${beat.spotifyTrackId}`}
                    width="100%"
                    height="152"
                    allow="encrypted-media"
                    className="rounded-xl"
                  />
                </div>
              )}

              {/* Audio Preview */}
              {beat.audioPreviewUrl && !beat.youtubeVideoId && !beat.spotifyTrackId && (
                <div className="mb-6">
                  <audio controls className="w-full" preload="metadata">
                    <source src={beat.audioPreviewUrl} type="audio/mpeg" />
                    Tu navegador no soporta el elemento de audio.
                  </audio>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Download Section */}
        <section className="py-12 bg-zinc-950">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            {/* Download Gate */}
            {beat.downloadGateEnabled && actions.length > 0 ? (
              <div className="bg-gradient-to-br from-purple-900/30 to-zinc-900 rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-purple-500 rounded-xl">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Descarga Gratis</h2>
                    <p className="text-zinc-400 mt-1">
                      Completa las siguientes acciones para desbloquear la descarga
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 mb-6">
                  {actions.map((action, index) => (
                    <a
                      key={action.id}
                      href={action.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors group"
                    >
                      <span className="w-8 h-8 flex items-center justify-center bg-zinc-700 rounded-full text-lg">
                        {getActionIcon(action.actionType)}
                      </span>
                      <span className="flex-1 font-medium text-white group-hover:text-amber-500 transition-colors">
                        {action.label}
                      </span>
                      <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-amber-500 transition-colors" />
                    </a>
                  ))}
                </div>

                {/* Download Button (appears after completing actions - client-side) */}
                {beat.audioFileUrl && (
                  <a
                    href={beat.audioFileUrl}
                    download
                    className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    Descargar Beat
                  </a>
                )}

                {beat.hypedditUrl && !beat.audioFileUrl && (
                  <a
                    href={beat.hypedditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    Descargar vía Hypeddit
                  </a>
                )}
              </div>
            ) : (
              /* Direct Download */
              <div className="bg-gradient-to-br from-emerald-900/30 to-zinc-900 rounded-2xl p-6 border border-emerald-500/30">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-emerald-500 rounded-xl">
                    <Download className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Descarga Gratis</h2>
                    <p className="text-zinc-400 mt-1">
                      Beat de uso libre para tus proyectos
                    </p>
                  </div>
                </div>

                {beat.audioFileUrl && (
                  <a
                    href={beat.audioFileUrl}
                    download
                    className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    Descargar Beat
                  </a>
                )}

                {beat.hypedditUrl && !beat.audioFileUrl && (
                  <a
                    href={beat.hypedditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    Descargar vía Hypeddit
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Distribution Links */}
        {hasDistributionLinks && (
          <section className="py-8 bg-zinc-900 border-t border-zinc-800">
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
              <h2 className="text-lg font-bold text-white mb-4">Escuchar en plataformas</h2>
              <div className="flex flex-wrap gap-3">
                {beat.onerpmUrl && (
                  <a
                    href={beat.onerpmUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    <Music2 className="h-4 w-4" />
                    OneRPM
                  </a>
                )}
                {beat.distrokidUrl && (
                  <a
                    href={beat.distrokidUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    DistroKid
                  </a>
                )}
                {beat.bandcampUrl && (
                  <a
                    href={beat.bandcampUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#629aa9] hover:bg-[#4a8090] text-white rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Bandcamp
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 bg-zinc-950 border-t border-zinc-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 text-zinc-500">
            <Music2 className="h-4 w-4" />
            <span className="text-sm">Sonido Líquido Crew - Beat Store</span>
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            Todos los beats son de uso libre. Créditos: {beat.producerName}
          </p>
        </div>
      </footer>
    </div>
  );
}
