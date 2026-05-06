// Seed sample videos
import { createClient } from "@libsql/client";

const DATABASE_URL = process.env.DATABASE_URL!;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

// Sample videos from SLC artists
const sampleVideos = [
  {
    title: "Zaque - He Estado (con el Matapuercos en la cocina)",
    youtubeId: "cQf1kLsB3gQ",
    description: "Video oficial de Zaque con el Matapuercos.",
    isFeatured: true,
  },
  {
    title: "Doctor Destino - Vida Real",
    youtubeId: "YZ3j1qNmPqI",
    description: "Video oficial de Doctor Destino.",
    isFeatured: true,
  },
  {
    title: "Bruno Grasso - A Ella",
    youtubeId: "Lj5Yh8rCFvU",
    description: "Single de Bruno Grasso.",
    isFeatured: true,
  },
  {
    title: "Kev Cabrone - En la Esquina",
    youtubeId: "tJqgNHvz3T8",
    description: "Nuevo single de Kev Cabrone.",
    isFeatured: false,
  },
  {
    title: "Latin Geisha - Sueños",
    youtubeId: "P_8lz-5E8MA",
    description: "Video musical de Latin Geisha.",
    isFeatured: true,
  },
  {
    title: "Q Master Weed - Cypher SLC",
    youtubeId: "f2zK2RKg84A",
    description: "Cypher oficial del crew.",
    isFeatured: false,
  },
  {
    title: "Brez - Desde Abajo",
    youtubeId: "b8oWYzslH5M",
    description: "Video de Brez sobre sus inicios.",
    isFeatured: false,
  },
  {
    title: "Dilema - No Te Creas",
    youtubeId: "ZG7m0t9Y-Vc",
    description: "Single de Dilema.",
    isFeatured: true,
  },
  {
    title: "Hassyel - Zen (Video Oficial)",
    youtubeId: "dQw4w9WgXcQ",
    description: "Video oficial del álbum Zen.",
    isFeatured: true,
  },
  {
    title: "Sonido Líquido Crew - Gran Reserva Cypher",
    youtubeId: "abc123xyz",
    description: "Cypher colectivo de todo el crew.",
    isFeatured: true,
  },
];

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function main() {
  console.log("\n🎬 SEEDING VIDEOS\n");
  console.log("=".repeat(50));

  const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });
  console.log("✅ Database connected\n");

  let created = 0;
  let skipped = 0;

  for (const video of sampleVideos) {
    // Check if exists
    const existing = await client.execute({
      sql: "SELECT id FROM videos WHERE youtube_id = ?",
      args: [video.youtubeId],
    });

    if (existing.rows.length > 0) {
      console.log(`   ⏭️  ${video.title} (exists)`);
      skipped++;
      continue;
    }

    const id = generateUUID();
    await client.execute({
      sql: `INSERT INTO videos (id, title, description, youtube_id, youtube_url, thumbnail_url, is_featured, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      args: [
        id,
        video.title,
        video.description,
        video.youtubeId,
        `https://www.youtube.com/watch?v=${video.youtubeId}`,
        `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`,
        video.isFeatured ? 1 : 0,
      ],
    });

    console.log(`   ✅ ${video.title}`);
    created++;
  }

  // Count total videos
  const countResult = await client.execute("SELECT COUNT(*) as count FROM videos");

  console.log("\n" + "=".repeat(50));
  console.log(`📊 RESULT: ${created} created, ${skipped} skipped`);
  console.log(`   Total videos in database: ${countResult.rows[0].count}`);
  console.log("=".repeat(50) + "\n");
}

main().catch(console.error);
