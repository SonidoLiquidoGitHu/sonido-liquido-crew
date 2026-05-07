import { db, isDatabaseConfigured } from "@/db/client";
import { artists } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import NewMediaReleaseForm from "./NewMediaReleaseForm";

export default async function NewMediaReleasePage() {
  let artistsList: { id: string; name: string; profileImageUrl: string | null; role: string }[] = [];

  // Fetch artists directly from database
  if (isDatabaseConfigured()) {
    try {
      const dbArtists = await db
        .select({
          id: artists.id,
          name: artists.name,
          profileImageUrl: artists.profileImageUrl,
          role: artists.role,
        })
        .from(artists)
        .where(eq(artists.isActive, true))
        .orderBy(asc(artists.name));

      artistsList = dbArtists.map(a => ({
        id: a.id,
        name: a.name,
        profileImageUrl: a.profileImageUrl,
        role: a.role,
      }));

      console.log(`[MediaReleasesNew] Loaded ${artistsList.length} artists`);
    } catch (error) {
      console.error("[MediaReleasesNew] Error fetching artists:", error);
    }
  }

  return <NewMediaReleaseForm artists={artistsList} />;
}
