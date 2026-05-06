import ArtistForm from "../_components/ArtistForm";

export const metadata = {
  title: "Editar Artista | Admin - Sonido Líquido Crew",
};

export default async function EditArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ArtistForm mode="edit" artistId={id} />;
}
