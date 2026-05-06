import NewBeatForm from "./NewBeatForm";

// Force dynamic rendering so DB queries run at request time, not build time
export const dynamic = "force-dynamic";

export default function NewBeatPage() {
  // Artists will be fetched client-side by ArtistSelector
  // This avoids server-side DB issues during static rendering on Netlify
  return <NewBeatForm artists={[]} />;
}
