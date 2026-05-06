import { artistsService } from "@/lib/services";
import NewCampaignForm from "./NewCampaignForm";

export default async function NewCampaignPage() {
  // Fetch artists server-side
  const allArtists = await artistsService.getAll();

  // Map to the format expected by ArtistSelector
  const artists = allArtists.map(artist => ({
    id: artist.id,
    name: artist.name,
    profileImageUrl: artist.profileImageUrl,
    role: artist.role,
  }));

  return <NewCampaignForm artists={artists} />;
}
