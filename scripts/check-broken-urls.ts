import { db } from "../src/db/client.js";
import { upcomingReleases } from "../src/db/schema/index.js";

async function checkBrokenUrls() {
  console.log("📊 Checking for broken Dropbox URLs in upcoming_releases...\n");

  const releases = await db.select({
    id: upcomingReleases.id,
    title: upcomingReleases.title,
    coverImageUrl: upcomingReleases.coverImageUrl,
    bannerImageUrl: upcomingReleases.bannerImageUrl,
  }).from(upcomingReleases);

  console.log(`Found ${releases.length} upcoming releases\n`);

  for (const release of releases) {
    console.log(`\n📀 ${release.title} (${release.id})`);
    console.log(`   Cover: ${release.coverImageUrl || "none"}`);
    console.log(`   Banner: ${release.bannerImageUrl || "none"}`);

    // Check if URLs contain dropbox
    const coverIsDropbox = release.coverImageUrl?.includes("dropboxusercontent.com");
    const bannerIsDropbox = release.bannerImageUrl?.includes("dropboxusercontent.com");

    if (coverIsDropbox || bannerIsDropbox) {
      console.log(`   ⚠️  Uses Dropbox URLs - may be broken`);
    }
  }
}

checkBrokenUrls().catch(console.error);
