import { db } from "@/db/client";
import { artistEpk } from "@/db/schema";
import { sql } from "drizzle-orm";

async function fixEpkPublic() {
  try {
    const result = await db
      .update(artistEpk)
      .set({ isPublic: true })
      .where(sql`${artistEpk.isPublic} IS NULL OR ${artistEpk.isPublic} = 0`);
    
    console.log("Updated EPK records to isPublic=true");
    
    const epks = await db.select({ id: artistEpk.id, isPublic: artistEpk.isPublic }).from(artistEpk);
    console.log(`Total EPKs: ${epks.length}`);
    console.log(`Public: ${epks.filter(e => e.isPublic).length}`);
    console.log(`Not public: ${epks.filter(e => !e.isPublic).length}`);
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

fixEpkPublic();
