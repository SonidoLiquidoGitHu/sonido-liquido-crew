import { notFound } from "next/navigation";
import { db, isDatabaseConfigured } from "@/db/client";
import { upcomingReleases } from "@/db/schema";
import { eq } from "drizzle-orm";
import ProximosDetailClient from "./ProximosDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getUpcomingRelease(slug: string) {
  if (!isDatabaseConfigured()) return null;

  try {
    const [release] = await db
      .select()
      .from(upcomingReleases)
      .where(eq(upcomingReleases.slug, slug));

    return release || null;
  } catch (error) {
    console.error("Error fetching upcoming release:", error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const release = await getUpcomingRelease(slug);

  if (!release) {
    return { title: "Lanzamiento no encontrado" };
  }

  return {
    title: `${release.title} - Presave | Sonido Líquido Crew`,
    description: release.description || `Haz presave de ${release.title} por ${release.artistName}. Próximamente en todas las plataformas.`,
    openGraph: {
      images: release.coverImageUrl ? [release.coverImageUrl] : [],
    },
  };
}

export default async function UpcomingReleasePage({ params }: PageProps) {
  const { slug } = await params;
  const release = await getUpcomingRelease(slug);

  if (!release || !release.isActive) {
    notFound();
  }

  // Server component fetches data + metadata; client component handles
  // the share-button state (purple "Compartir en Stories" + StoryCard modal).
  return <ProximosDetailClient release={release} />;
}
