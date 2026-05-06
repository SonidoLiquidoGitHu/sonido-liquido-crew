import { db } from "../src/db/client.js";
import { galleryPhotos } from "../src/db/schema/index.js";

async function main() {
  console.log("Checking gallery photos...\n");
  
  const photos = await db.select().from(galleryPhotos);
  
  console.log(`Total gallery photos: ${photos.length}\n`);
  
  for (const p of photos) {
    console.log(`ID: ${p.id}`);
    console.log(`Title: ${p.title || "(no title)"}`);
    console.log(`URL: ${p.imageUrl}`);
    console.log(`Has rlkey: ${p.imageUrl?.includes("rlkey=") || false}`);
    console.log("---");
  }
}

main().catch(console.error);
