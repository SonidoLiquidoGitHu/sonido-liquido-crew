/**
 * Seed Artist Press Kits
 *
 * This script creates sample press kits for artists to populate
 * the press kit dropdown in the media release editor.
 *
 * Run with: bun run scripts/seed-artist-press-kits.ts
 */

import { db, isDatabaseConfigured } from "../src/db/client";
import { pressKits, artists } from "../src/db/schema";
import { generateUUID } from "../src/lib/utils";
import { eq } from "drizzle-orm";

async function seedArtistPressKits() {
  console.log("🎤 Seeding Artist Press Kits...\n");

  if (!isDatabaseConfigured()) {
    console.error("❌ Database not configured. Set DATABASE_URL and DATABASE_AUTH_TOKEN.");
    process.exit(1);
  }

  // Get all active artists
  const allArtists = await db
    .select()
    .from(artists)
    .where(eq(artists.isActive, true));

  console.log(`Found ${allArtists.length} active artists\n`);

  // Check existing press kits
  const existingKits = await db.select().from(pressKits);
  console.log(`Existing press kits: ${existingKits.length}\n`);

  // Sample press kit URLs (these would normally be Dropbox URLs)
  // Using placeholder URLs - you should replace with actual uploaded files
  const sampleKitsData = [
    {
      artistSlug: "zaque",
      title: "Zaque - Press Kit 2024",
      description: "Kit de prensa oficial de Zaque. Incluye bio, fotos HD, logos y rider técnico.",
      downloadUrl: "https://dl.dropboxusercontent.com/s/sample/zaque-press-kit-2024.zip",
      fileSize: 45 * 1024 * 1024, // 45 MB
    },
    {
      artistSlug: "latin-geisha",
      title: "Latin Geisha - Press Kit",
      description: "Material de prensa de Latin Geisha. Fotos promocionales, biografía y logotipo.",
      downloadUrl: "https://dl.dropboxusercontent.com/s/sample/latin-geisha-press-kit.zip",
      fileSize: 32 * 1024 * 1024, // 32 MB
    },
    {
      artistSlug: "doctor-destino",
      title: "Doctor Destino - Press Kit",
      description: "Press kit completo de Doctor Destino con material gráfico y biográfico.",
      downloadUrl: "https://dl.dropboxusercontent.com/s/sample/doctor-destino-press-kit.zip",
      fileSize: 28 * 1024 * 1024, // 28 MB
    },
    {
      artistSlug: "patto",
      title: "Patto - EPK 2024",
      description: "Electronic Press Kit de Patto. Videos, fotos y contacto de booking.",
      downloadUrl: "https://dl.dropboxusercontent.com/s/sample/patto-epk-2024.zip",
      fileSize: 55 * 1024 * 1024, // 55 MB
    },
    {
      artistSlug: "caballero-espada",
      title: "Caballero & Espada - Press Kit",
      description: "Kit de prensa del dúo Caballero & Espada. Material promocional conjunto.",
      downloadUrl: "https://dl.dropboxusercontent.com/s/sample/caballero-espada-press-kit.zip",
      fileSize: 40 * 1024 * 1024, // 40 MB
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const kitData of sampleKitsData) {
    // Find artist by slug
    const artist = allArtists.find((a) => a.slug === kitData.artistSlug);

    if (!artist) {
      console.log(`⚠️  Artist not found: ${kitData.artistSlug} - skipping`);
      skipped++;
      continue;
    }

    // Check if press kit already exists for this artist
    const existingKit = existingKits.find((k) => k.artistId === artist.id);
    if (existingKit) {
      console.log(`⏭️  Press kit already exists for ${artist.name} - skipping`);
      skipped++;
      continue;
    }

    // Create press kit
    const id = generateUUID();
    await db.insert(pressKits).values({
      id,
      artistId: artist.id,
      title: kitData.title,
      description: kitData.description,
      downloadUrl: kitData.downloadUrl,
      fileSize: kitData.fileSize,
      isActive: true,
    });

    console.log(`✅ Created press kit for ${artist.name}: ${kitData.title}`);
    created++;
  }

  // Also create a general Sonido Líquido Crew press kit
  const generalKitExists = existingKits.find((k) => k.title?.includes("Sonido Líquido Crew"));
  if (!generalKitExists) {
    const id = generateUUID();
    await db.insert(pressKits).values({
      id,
      artistId: null, // No specific artist - general crew kit
      title: "Sonido Líquido Crew - Press Kit General",
      description: "Kit de prensa completo del colectivo Sonido Líquido Crew. Historia, roster, fotos grupales y contacto.",
      downloadUrl: "https://dl.dropboxusercontent.com/s/sample/sonido-liquido-crew-press-kit.zip",
      fileSize: 80 * 1024 * 1024, // 80 MB
      isActive: true,
    });
    console.log(`✅ Created general press kit: Sonido Líquido Crew - Press Kit General`);
    created++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`\n✨ Done!`);
}

// Run the script
seedArtistPressKits()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
