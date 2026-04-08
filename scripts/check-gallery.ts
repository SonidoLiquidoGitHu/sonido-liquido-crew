import { db, isDatabaseConfigured } from "../src/db/client.js";
import { galleryPhotos } from "../src/db/schema/index.js";

async function main() {
  if (!isDatabaseConfigured()) {
    console.log("Database not configured");
    return;
  }
  
  const photos = await db.select().from(galleryPhotos).limit(15);
  
  console.log("\n=== Gallery Photos ===\n");
  
  for (const photo of photos) {
    console.log("ID:", photo.id);
    console.log("Title:", photo.title || "(untitled)");
    console.log("imageUrl:", photo.imageUrl);
    console.log("Has rlkey:", photo.imageUrl?.includes("rlkey=") || false);
    console.log("---");
  }
  
  console.log("\nTotal:", photos.length, "photos");
}

main().catch(console.error);
