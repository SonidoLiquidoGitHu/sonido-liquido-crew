import { artistsService } from "@/lib/services";
import NewBeatForm from "./NewBeatForm";

export default async function NewBeatPage() {
  // Fetch artists server-side
  const allArtists = await artistsService.getAll();

  // Map to the format expected by ArtistSelector
  const artists = allArtists.map(artist => ({
    id: artist.id,
    name: artist.name,
    profileImageUrl: artist.profileImageUrl,
    role: artist.role,
  }));

  return <NewBeatForm artists={artists} />;
}
