import { getClient, initializeDatabase } from "@/lib/db";
import {
  Calendar,
  Disc3,
  ExternalLink,
  Instagram,
  Mail,
  MapPin,
  Music2,
  Phone,
  Play,
  Settings,
  Youtube,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Artist {
  id: string;
  slug: string;
  displayName: string;
  role: string | null;
  profileImageUrl: string | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  instagramUrl: string | null;
}

interface Release {
  id: string;
  slug: string;
  title: string;
  releaseType: string;
  releaseDate: string | null;
  coverImageUrl: string | null;
  spotifyUrl: string | null;
  artistName: string | null;
}

interface Video {
  id: string;
  title: string;
  youtubeId: string;
  thumbnailUrl: string | null;
  artistName: string | null;
  durationSeconds: number | null;
}

interface Event {
  id: string;
  title: string;
  venue: string | null;
  city: string | null;
  eventDate: string | null;
  eventTime: string | null;
  ticketUrl: string | null;
}

interface UpcomingRelease {
  id: string;
  title: string;
  artistName: string;
  releaseType: string;
  releaseDate: string;
  coverImageUrl: string | null;
  description: string | null;
  status: string;
  isFeatured: boolean;
  presaveUrl: string | null;
}

async function getArtists(): Promise<Artist[]> {
  try {
    await initializeDatabase();
    const sqlite = await getClient();
    const result = await sqlite.execute(
      "SELECT id, slug, display_name, name, role, profile_image_url, image_url, spotify_url, youtube_url, instagram_url FROM artists WHERE is_active = 1 ORDER BY sort_order ASC"
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      slug: (row.slug || "") as string,
      displayName: (row.display_name || row.name || "Unknown") as string,
      role: row.role as string | null,
      profileImageUrl: (row.profile_image_url || row.image_url) as string | null,
      spotifyUrl: row.spotify_url as string | null,
      youtubeUrl: row.youtube_url as string | null,
      instagramUrl: row.instagram_url as string | null,
    }));
  } catch (e) {
    console.error("Error fetching artists:", e);
    return [];
  }
}

async function getReleases(): Promise<Release[]> {
  try {
    await initializeDatabase();
    const sqlite = await getClient();
    const result = await sqlite.execute(
      "SELECT id, slug, title, release_type, release_date, cover_image_url, image_url, spotify_url, artist_name FROM releases WHERE is_published = 1 ORDER BY release_date DESC LIMIT 12"
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      slug: (row.slug || "") as string,
      title: (row.title || "Untitled") as string,
      releaseType: (row.release_type || "album") as string,
      releaseDate: row.release_date as string | null,
      coverImageUrl: (row.cover_image_url || row.image_url) as string | null,
      spotifyUrl: row.spotify_url as string | null,
      artistName: row.artist_name as string | null,
    }));
  } catch (e) {
    console.error("Error fetching releases:", e);
    return [];
  }
}

async function getVideos(): Promise<Video[]> {
  try {
    await initializeDatabase();
    const sqlite = await getClient();
    const result = await sqlite.execute(
      "SELECT id, title, youtube_id, thumbnail_url, artist_name, duration_seconds FROM videos WHERE is_published = 1 ORDER BY published_at DESC LIMIT 6"
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      title: (row.title || "Video") as string,
      youtubeId: (row.youtube_id || "") as string,
      thumbnailUrl: row.thumbnail_url as string | null,
      artistName: row.artist_name as string | null,
      durationSeconds: row.duration_seconds as number | null,
    }));
  } catch (e) {
    console.error("Error fetching videos:", e);
    return [];
  }
}

async function getUpcomingEvents(): Promise<Event[]> {
  try {
    await initializeDatabase();
    const sqlite = await getClient();
    const today = new Date().toISOString().split("T")[0];
    const result = await sqlite.execute({
      sql: "SELECT id, title, venue, city, event_date, event_time, ticket_url FROM events WHERE is_published = 1 AND event_date >= ? ORDER BY event_date ASC LIMIT 5",
      args: [today],
    });
    return result.rows.map((row) => ({
      id: row.id as string,
      title: (row.title || "Event") as string,
      venue: row.venue as string | null,
      city: row.city as string | null,
      eventDate: row.event_date as string | null,
      eventTime: row.event_time as string | null,
      ticketUrl: row.ticket_url as string | null,
    }));
  } catch (e) {
    console.error("Error fetching events:", e);
    return [];
  }
}

async function getUpcomingReleases(): Promise<UpcomingRelease[]> {
  try {
    await initializeDatabase();
    const sqlite = await getClient();
    const today = new Date().toISOString().split("T")[0];
    const result = await sqlite.execute({
      sql: "SELECT * FROM upcoming_releases WHERE is_active = 1 AND release_date >= ? ORDER BY release_date ASC, sort_order ASC LIMIT 6",
      args: [today],
    });
    return result.rows.map((row) => ({
      id: row.id as string,
      title: (row.title || "Release") as string,
      artistName: (row.artist_name || "Artist") as string,
      releaseType: (row.release_type || "single") as string,
      releaseDate: (row.release_date || today) as string,
      coverImageUrl: row.cover_image_url as string | null,
      description: row.description as string | null,
      status: (row.status || "listo") as string,
      isFeatured: Boolean(row.is_featured),
      presaveUrl: row.presave_url as string | null,
    }));
  } catch (e) {
    console.error("Error fetching upcoming releases:", e);
    return [];
  }
}

async function getStats() {
  try {
    await initializeDatabase();
    const sqlite = await getClient();
    const artistCount = await sqlite.execute("SELECT COUNT(*) as count FROM artists WHERE is_active = 1");
    const releaseCount = await sqlite.execute("SELECT COUNT(*) as count FROM releases WHERE is_published = 1");
    const followersSum = await sqlite.execute("SELECT SUM(followers) as total FROM artists WHERE is_active = 1");

    return {
      totalArtists: Number(artistCount.rows[0]?.count || 0),
      totalReleases: Number(releaseCount.rows[0]?.count || 0),
      totalFollowers: Number(followersSum.rows[0]?.total || 0),
    };
  } catch (e) {
    console.error("Error fetching stats:", e);
    return { totalArtists: 0, totalReleases: 0, totalFollowers: 0 };
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getDaysUntilRelease(dateStr: string): number {
  const releaseDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  releaseDate.setHours(0, 0, 0, 0);
  const diffTime = releaseDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatReleaseDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function HomePage() {
  const [artists, releases, videos, events, upcomingReleases, stats] = await Promise.all([
    getArtists(),
    getReleases(),
    getVideos(),
    getUpcomingEvents(),
    getUpcomingReleases(),
    getStats(),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <Music2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold tracking-wider">SONIDO LÍQUIDO</span>
              <p className="text-[10px] text-zinc-500 tracking-widest">HIP HOP MÉXICO</p>
            </div>
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            <a href="#proximos" className="text-sm text-zinc-400 transition-colors hover:text-white">Próximos</a>
            <a href="#roster" className="text-sm text-zinc-400 transition-colors hover:text-white">Artistas</a>
            <a href="#releases" className="text-sm text-zinc-400 transition-colors hover:text-white">Lanzamientos</a>
            <a href="#videos" className="text-sm text-zinc-400 transition-colors hover:text-white">Videos</a>
            <a href="#events" className="text-sm text-zinc-400 transition-colors hover:text-white">Eventos</a>
            <a href="#about" className="text-sm text-zinc-400 transition-colors hover:text-white">Nosotros</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition-all hover:border-zinc-500 hover:text-white">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
            <a href="https://open.spotify.com/playlist/2YqHiwxhbYazjcBy62sMAb" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 rounded-full bg-[#1DB954] px-4 py-2 text-sm font-medium text-black transition-all hover:bg-[#1ed760]">
              <Music2 className="h-4 w-4" />
              <span className="hidden sm:inline">Escuchar</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Video Section */}
      <section className="relative pt-16 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {videos.length > 0 && videos[0].youtubeId ? (
            <div className="relative aspect-video max-w-4xl mx-auto overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800">
              <a href={`https://www.youtube.com/watch?v=${videos[0].youtubeId}`} target="_blank" rel="noopener noreferrer" className="block relative w-full h-full group">
                <img
                  src={videos[0].thumbnailUrl || `https://i.ytimg.com/vi/${videos[0].youtubeId}/maxresdefault.jpg`}
                  alt={videos[0].title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-red-600 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Play className="h-8 w-8 text-white ml-1" fill="white" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                  <p className="text-lg font-bold text-white">{videos[0].title}</p>
                  <p className="text-sm text-zinc-400">{videos[0].artistName} {videos[0].durationSeconds ? `• ${formatDuration(videos[0].durationSeconds)}` : ""}</p>
                </div>
              </a>
            </div>
          ) : (
            <div className="relative aspect-video max-w-4xl mx-auto overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <div className="text-center">
                <div className="h-20 w-20 mx-auto rounded-full bg-red-600 flex items-center justify-center">
                  <Play className="h-8 w-8 text-white ml-1" fill="white" />
                </div>
                <h3 className="mt-4 text-xl font-bold">HIP HOP MEXICANO</h3>
              </div>
            </div>
          )}

          {/* Video Thumbnails */}
          {videos.length > 1 && (
            <div className="mt-6 flex justify-center gap-4 overflow-x-auto pb-4">
              {videos.slice(1, 4).map((video) => (
                <a key={video.id} href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-40 cursor-pointer group">
                  <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden relative">
                    <img
                      src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Play className="h-6 w-6 text-white opacity-80 group-hover:opacity-100" />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 truncate">{video.title}</p>
                </a>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <a href="https://www.youtube.com/@sonidoliquidocrew" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 rounded-full border border-red-600 px-6 py-2.5 text-sm font-medium text-red-500 transition-all hover:bg-red-600 hover:text-white">
              <Youtube className="h-4 w-4" />
              Watch on YouTube
            </a>
          </div>
        </div>
      </section>

      {/* Próximos Lanzamientos Section */}
      {upcomingReleases.length > 0 && (
        <section id="proximos" className="py-16 bg-zinc-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                PRÓXIMOS LANZAMIENTOS
              </h2>
              <p className="mt-3 text-zinc-400">Mantente al día con los próximos proyectos de Sonido Líquido Crew y sus artistas.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingReleases.map((release) => {
                const days = getDaysUntilRelease(release.releaseDate);
                const typeLabel = release.releaseType === "single" ? "Single" : release.releaseType === "album" ? "Album" : "EP";
                const typeColor = release.releaseType === "single" ? "bg-orange-500" : release.releaseType === "album" ? "bg-blue-500" : "bg-purple-500";
                const statusLabel = release.status === "listo" ? "Listo" : release.status === "promocion" ? "Promoción" : "Pendiente";
                const statusColor = release.status === "listo" ? "bg-emerald-500" : release.status === "promocion" ? "bg-amber-500" : "bg-zinc-500";

                return (
                  <div key={release.id} className="group bg-zinc-800 rounded-2xl border border-zinc-700 overflow-hidden hover:border-zinc-600 transition-colors">
                    <div className="relative aspect-square overflow-hidden">
                      {release.coverImageUrl ? (
                        <img
                          src={release.coverImageUrl}
                          alt={release.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                          <Disc3 className="h-20 w-20 text-zinc-600" />
                        </div>
                      )}
                      <span className={`absolute top-3 left-3 px-3 py-1 ${typeColor} text-white text-xs font-bold rounded-full`}>
                        {typeLabel}
                      </span>
                      {release.isFeatured && (
                        <span className="absolute top-3 right-3 px-3 py-1 bg-amber-400 text-black text-xs font-bold rounded-full">
                          DESTACADO
                        </span>
                      )}
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg text-center min-w-[60px]">
                        <span className="text-2xl font-bold text-white block leading-none">{days}</span>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">días</span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-white uppercase tracking-wide">{release.title}</h3>
                      <p className="text-orange-400 font-medium mt-1">{release.artistName}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className={`px-2 py-0.5 ${statusColor} text-white text-xs font-medium rounded`}>
                          {statusLabel}
                        </span>
                        <span className="text-zinc-400 text-sm">{formatReleaseDate(release.releaseDate)}</span>
                      </div>
                      {release.description && (
                        <p className="text-zinc-400 text-sm mt-3 line-clamp-2">{release.description}</p>
                      )}
                      {release.presaveUrl && (
                        <div className="mt-4">
                          <a
                            href={release.presaveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
                          >
                            <Calendar className="h-4 w-4" />
                            PRE-SAVE AHORA
                          </a>
                          <p className="text-center text-xs text-zinc-500 mt-2 truncate">
                            {release.presaveUrl.replace("https://", "").substring(0, 30)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Complete Roster Section */}
      <section id="roster" className="relative py-16 bg-[#FDF6E3]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              COMPLETE ROSTER
            </h2>
            <p className="mt-3 text-zinc-600">Meet all the members of Sonido Líquido Crew</p>
          </div>

          {artists.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {artists.map((artist) => (
                <div key={artist.id} className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 aspect-[3/4]">
                  {artist.profileImageUrl ? (
                    <img
                      src={artist.profileImageUrl}
                      alt={artist.displayName}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-900">
                      <span className="text-6xl font-bold text-white/30">{artist.displayName.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  {artist.youtubeUrl && (
                    <a href={artist.youtubeUrl} target="_blank" rel="noopener noreferrer"
                       className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 z-10">
                      <Youtube className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">{artist.displayName}</h3>
                    {artist.role && <p className="text-xs text-zinc-400">{artist.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-500">No artists found. <Link href="/admin" className="text-emerald-600 hover:underline">Sync from Spotify</Link></p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-zinc-900 py-8 border-y border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
            <div className="text-center">
              <span className="text-3xl sm:text-4xl font-bold text-white">{stats.totalArtists} ARTISTS</span>
              <p className="text-xs text-zinc-500 mt-1">The most representative collective of Mexican Hip Hop</p>
            </div>
            <div className="hidden sm:block h-12 w-px bg-zinc-700" />
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-[#1DB954]">{stats.totalFollowers.toLocaleString()}</span>
              <span className="text-sm text-zinc-500">Spotify Followers</span>
            </div>
            <div className="hidden sm:block h-12 w-px bg-zinc-700" />
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-emerald-400">{stats.totalReleases}</span>
              <span className="text-sm text-zinc-500">Releases</span>
            </div>
          </div>
        </div>
      </section>

      {/* Discography Section */}
      <section id="releases" className="py-16 bg-[#FDF6E3]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              DISCOGRAFÍA COMPLETA
            </h2>
            <p className="mt-3 text-zinc-600">Todos los lanzamientos de Sonido Líquido Crew y sus artistas.</p>
          </div>

          {releases.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {releases.map((release) => (
                <a key={release.id} href={release.spotifyUrl || "#"} target={release.spotifyUrl ? "_blank" : undefined} rel="noopener noreferrer" className="group block">
                  <div className="aspect-square overflow-hidden rounded-lg bg-zinc-200 relative">
                    {release.coverImageUrl ? (
                      <img
                        src={release.coverImageUrl}
                        alt={release.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-300 to-zinc-400">
                        <Disc3 className="h-12 w-12 text-zinc-500" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">NUEVO</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">{release.artistName || "SLC"}</p>
                    <h3 className="text-sm font-medium text-zinc-900 truncate">{release.title}</h3>
                    <p className="text-xs text-zinc-400">{release.releaseDate?.slice(0, 4)} {release.releaseType}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Disc3 className="mx-auto h-16 w-16 text-zinc-300" />
              <p className="mt-4 text-zinc-500">No releases found</p>
            </div>
          )}

          <div className="mt-10 flex justify-center gap-4">
            <a href="https://open.spotify.com/playlist/2YqHiwxhbYazjcBy62sMAb" target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-8 py-3 text-sm font-medium text-black transition-all hover:bg-[#1ed760]">
              <Music2 className="h-4 w-4" />
              Escuchar Playlist Oficial
            </a>
          </div>
        </div>
      </section>

      {/* Videos Section */}
      <section id="videos" className="py-16 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>VIDEOS</h2>
            <div className="mx-auto mt-2 h-1 w-16 bg-red-500 rounded" />
          </div>

          {videos.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <a key={video.id} href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="group block">
                  <div className="aspect-video overflow-hidden rounded-lg bg-zinc-800 relative">
                    <img
                      src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                      alt={video.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-red-600/90 flex items-center justify-center">
                        <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                    {video.durationSeconds && (
                      <span className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-xs text-white rounded">
                        {formatDuration(video.durationSeconds)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <h3 className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">{video.title}</h3>
                    <p className="text-xs text-zinc-500">{video.artistName}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Youtube className="mx-auto h-16 w-16 text-zinc-700" />
              <p className="mt-4 text-zinc-500">No videos available</p>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <a href="https://www.youtube.com/@sonidoliquidocrew" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 text-red-500 hover:text-red-400">
              Ver más en YouTube <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section id="events" className="py-16 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>UPCOMING EVENTS</h2>
            <div className="mx-auto mt-2 h-1 w-16 bg-red-500 rounded" />
          </div>

          {events.length > 0 ? (
            <div className="grid gap-4 max-w-3xl mx-auto">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-4 bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <div className="flex-shrink-0 text-center bg-zinc-900 rounded-lg p-3 min-w-[60px]">
                    {event.eventDate && (
                      <>
                        <p className="text-xs text-zinc-500">{new Date(event.eventDate).toLocaleDateString("es-MX", { month: "short" }).toUpperCase()}</p>
                        <p className="text-2xl font-bold text-white">{new Date(event.eventDate).getDate()}</p>
                      </>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-white">{event.title}</h3>
                    <p className="text-sm text-zinc-400">{event.venue} {event.city}</p>
                    {event.eventTime && <p className="text-xs text-zinc-500">{event.eventTime}</p>}
                  </div>
                  {event.ticketUrl && (
                    <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
                       className="flex-shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 transition-colors">
                      Tickets
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-16 w-16 text-zinc-700" />
              <p className="mt-4 text-zinc-500">No upcoming events scheduled</p>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-end p-6">
                <div className="bg-zinc-900/80 backdrop-blur-sm rounded-lg px-4 py-3">
                  <p className="text-lg font-bold text-white">Hip Hop Mexicano</p>
                  <p className="text-sm text-zinc-400">From CDMX 1999</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-zinc-500 uppercase tracking-widest">Who We Are</p>
              <h2 className="mt-2 text-4xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                SONIDO LIQUIDO CREW
              </h2>
              <div className="mt-6 space-y-4 text-zinc-400">
                <p>This is not the tropicalization of the American trend. This is the true evolution of a sound that started in Mexico over 25 years ago.</p>
                <p>Our roster features the best beatmakers in Mexico. We are the only crew in the country with more DJs than MCs.</p>
                <blockquote className="border-l-4 border-amber-500 pl-4 italic text-zinc-300">
                  &quot;I could keep telling you but you can listen for yourself and judge&quot;
                </blockquote>
              </div>
              <div className="mt-8 flex gap-8">
                <div>
                  <span className="text-3xl font-bold text-[#1DB954]">{stats.totalFollowers.toLocaleString()}</span>
                  <p className="text-xs text-zinc-500">Spotify Followers</p>
                </div>
                <div>
                  <span className="text-3xl font-bold text-emerald-400">{stats.totalReleases}</span>
                  <p className="text-xs text-zinc-500">Releases</p>
                </div>
                <div>
                  <span className="text-3xl font-bold text-emerald-400">{stats.totalArtists}</span>
                  <p className="text-xs text-zinc-500">Artists</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-12 bg-zinc-900 border-y border-zinc-800">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap justify-center gap-12 text-center">
            <div>
              <Phone className="mx-auto h-6 w-6 text-zinc-500 mb-2" />
              <h4 className="font-bold text-white">BOOKINGS</h4>
              <p className="text-sm text-zinc-400">Phone: 5528011881</p>
            </div>
            <div>
              <Mail className="mx-auto h-6 w-6 text-zinc-500 mb-2" />
              <h4 className="font-bold text-white">EMAIL</h4>
              <p className="text-sm text-zinc-400">prensasonidoliquido@gmail.com</p>
            </div>
            <div>
              <MapPin className="mx-auto h-6 w-6 text-zinc-500 mb-2" />
              <h4 className="font-bold text-white">LOCATION</h4>
              <p className="text-sm text-zinc-400">Mexico City, CDMX</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                <Music2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-sm font-bold">SONIDO LIQUIDO</span>
                <p className="text-xs text-zinc-500">HIP HOP MÉXICO</p>
              </div>
            </div>
            <div className="flex gap-4">
              <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-[#1DB954] hover:bg-zinc-700">
                <Music2 className="h-5 w-5" />
              </a>
              <a href="https://youtube.com/@sonidoliquidocrew" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-zinc-700">
                <Youtube className="h-5 w-5" />
              </a>
              <a href="https://instagram.com/sonidoliquido" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-pink-500 hover:bg-zinc-700">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
            <p className="text-xs text-zinc-600">© 2025 Sonido Liquido Crew - Hip Hop México</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
