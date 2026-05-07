import type { Metadata } from "next";
import BeatPageClient, { type Beat } from "./BeatPageClient";

// Fetch beat data on the server
async function getBeat(slug: string): Promise<Beat | null> {
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   "https://sonidoliquido.com";

    const res = await fetch(`${baseUrl}/api/beats/${slug}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("[Beat Page] Error fetching beat:", error);
    return null;
  }
}

// Generate dynamic metadata for Open Graph
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const beat = await getBeat(slug);

  if (!beat) {
    return {
      title: "Beat No Encontrado | Sonido Líquido Crew",
      description: "Este beat no existe o ha sido eliminado.",
    };
  }

  const title = `${beat.title}${beat.producerName ? ` - ${beat.producerName}` : ""} | Sonido Líquido`;
  const description = beat.description ||
    `Descarga el beat "${beat.title}"${beat.bpm ? ` - ${beat.bpm} BPM` : ""}${beat.genre ? ` - ${beat.genre}` : ""}. Sonido Líquido Crew - Hip Hop Mexicano.`;

  // Use cover image or fallback
  const imageUrl = beat.coverImageUrl || "https://sonidoliquido.com/og-image.jpg";

  // Ensure absolute URL for OG image
  const absoluteImageUrl = imageUrl.startsWith("http")
    ? imageUrl
    : `https://sonidoliquido.com${imageUrl}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "music.song",
      url: `https://sonidoliquido.com/beats/${slug}`,
      siteName: "Sonido Líquido Crew",
      images: [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 1200,
          alt: beat.title,
        },
      ],
      locale: "es_MX",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteImageUrl],
    },
  };
}

export default async function BeatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const beat = await getBeat(slug);

  return <BeatPageClient initialBeat={beat} slug={slug} />;
}
