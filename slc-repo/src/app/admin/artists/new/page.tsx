import ArtistForm from "../_components/ArtistForm";

export const metadata = {
  title: "Nuevo Artista | Admin - Sonido Líquido Crew",
};

export default function NewArtistPage() {
  return <ArtistForm mode="create" />;
}
