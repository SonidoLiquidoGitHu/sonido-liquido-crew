import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists } from "@/db/schema/curated-channels";
import { eq } from "drizzle-orm";
import CuratedPlaylistDetailClient, {
  type CuratedPlaylistDetail,
} from "./CuratedPlaylistDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Fallback list — kept in sync with /api/playlists/route.ts
// Used when the DB isn't configured or the table is empty so the page
// still renders a useful preview in dev / preview environments.
const FALLBACK_PLAYLISTS: CuratedPlaylistDetail[] = [
  {
    id: "gran-reserva",
    name: "Gran Reserva",
    description: "Los mejores tracks del roster",
    coverColor: "#f97316",
    coverImageUrl: null,
    spotifyPlaylistId: "2y0Z7WdObJY1IvCLCXwUez",
    spotifyPlaylistUrl: "https://open.spotify.com/playlist/2y0Z7WdObJY1IvCLCXwUez",
    trackCount: 0,
  },
  {
    id: "weekly-picks",
    name: "Picks de la Semana",
    description: "Selección semanal",
    coverColor: "#22c55e",
    coverImageUrl: null,
    spotifyPlaylistId: null,
    spotifyPlaylistUrl: null,
    trackCount: 0,
  },
  {
    id: "new-releases",
    name: "Nuevos Lanzamientos",
    description: "Lo más reciente",
    coverColor: "#3b82f6",
    coverImageUrl: null,
    spotifyPlaylistId: null,
    spotifyPlaylistUrl: null,
    trackCount: 0,
  },
  {
    id: "classics",
    name: "Clásicos",
    description: "Tracks clásicos del crew",
    coverColor: "#8b5cf6",
    coverImageUrl: null,
    spotifyPlaylistId: null,
    spotifyPlaylistUrl: null,
    trackCount: 0,
  },
  {
    id: "collaborations",
    name: "Colaboraciones",
    description: "Featurings y colaboraciones",
    coverColor: "#eab308",
    coverImageUrl: null,
    spotifyPlaylistId: null,
    spotifyPlaylistUrl: null,
    trackCount: 0,
  },
];

async function getPlaylist(id: string): Promise<CuratedPlaylistDetail | null> {
  // 1. Try the DB if configured.
  if (isDatabaseConfigured()) {
    try {
      const [row] = await db
        .select()
        .from(curatedPlaylists)
        .where(eq(curatedPlaylists.id, id));

      if (row && row.isPublic && row.isActive !== false) {
        return {
          id: row.id,
          name: row.name,
          description: row.description || "",
          coverColor: row.coverColor || "#1DB954",
          coverImageUrl: row.coverImageUrl || null,
          spotifyPlaylistId: row.spotifyPlaylistId || null,
          spotifyPlaylistUrl: row.spotifyPlaylistUrl || null,
          trackCount: row.trackCount || 0,
        };
      }
    } catch (error) {
      console.error("[Curated Playlist Detail] DB error:", error);
    }
  }

  // 2. Fallback to the static list (mirrors /api/playlists/route.ts)
  const fallback = FALLBACK_PLAYLISTS.find((p) => p.id === id);
  return fallback || null;
}

async function getOtherPlaylists(currentId: string): Promise<CuratedPlaylistDetail[]> {
  if (!isDatabaseConfigured()) {
    return FALLBACK_PLAYLISTS.filter((p) => p.id !== currentId).slice(0, 4);
  }

  try {
    const rows = await db
      .select()
      .from(curatedPlaylists)
      .where(eq(curatedPlaylists.isPublic, true));

    const active = rows.filter((p) => p.isActive !== false && p.id !== currentId);

    if (active.length === 0) {
      return FALLBACK_PLAYLISTS.filter((p) => p.id !== currentId).slice(0, 4);
    }

    return active
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        coverColor: p.coverColor || "#1DB954",
        coverImageUrl: p.coverImageUrl || null,
        spotifyPlaylistId: p.spotifyPlaylistId || null,
        spotifyPlaylistUrl: p.spotifyPlaylistUrl || null,
        trackCount: p.trackCount || 0,
      }));
  } catch (error) {
    console.error("[Curated Playlist Detail] DB error (other):", error);
    return FALLBACK_PLAYLISTS.filter((p) => p.id !== currentId).slice(0, 4);
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const playlist = await getPlaylist(id);

  if (!playlist) {
    return {
      title: "Playlist no encontrada | Sonido Líquido Crew",
      description: "Esta playlist no existe o no está disponible.",
    };
  }

  const title = `${playlist.name} — Playlist Curada | Sonido Líquido Crew`;
  const description =
    playlist.description ||
    `Escucha "${playlist.name}", una playlist curada por Sonido Líquido Crew.`;

  const ogImage = playlist.coverImageUrl
    ? playlist.coverImageUrl.startsWith("http")
      ? playlist.coverImageUrl
      : `https://sonidoliquido.com${playlist.coverImageUrl}`
    : "https://sonidoliquido.com/og-image.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "music.playlist",
      url: `https://sonidoliquido.com/playlists/curated/${id}`,
      siteName: "Sonido Líquido Crew",
      images: [{ url: ogImage, width: 1200, height: 1200, alt: playlist.name }],
      locale: "es_MX",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CuratedPlaylistDetailPage({ params }: PageProps) {
  const { id } = await params;
  const playlist = await getPlaylist(id);

  if (!playlist) {
    notFound();
  }

  const others = await getOtherPlaylists(id);

  return (
    <CuratedPlaylistDetailClient playlist={playlist} others={others} />
  );
}
