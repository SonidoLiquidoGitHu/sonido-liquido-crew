import { artistsService } from "@/lib/services";
import ArtistsListClient from "./_components/ArtistsListClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Artistas | Admin - Sonido Líquido Crew",
};

export default async function AdminArtistsPage() {
  const artists = await artistsService.getAll({ onlyActive: false });

  // Transform artists to match the client component interface
  const artistsData = artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    role: artist.role,
    profileImageUrl: artist.profileImageUrl,
    verificationStatus: artist.verificationStatus || "pending",
    isFeatured: artist.isFeatured || false,
    identityConflictFlag: artist.identityConflictFlag || false,
  }));

  return <ArtistsListClient artists={artistsData} />;
}
