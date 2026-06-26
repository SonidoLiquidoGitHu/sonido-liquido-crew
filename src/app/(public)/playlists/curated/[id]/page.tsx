import type { Metadata } from "next";
import CuratedPlaylistDetailClient from "./CuratedPlaylistDetailClient";

export const dynamic = "force-dynamic";

// Static metadata — no DB calls at build time.
// The client component handles dynamic title/SEO after hydration.
export const metadata: Metadata = {
  title: "Playlist Curada | Sonido Líquido Crew",
  description:
    "Escucha una playlist curada por Sonido Líquido Crew. Disponible en Spotify.",
  robots: { index: true, follow: true },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CuratedPlaylistDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CuratedPlaylistDetailClient playlistId={id} />;
}
