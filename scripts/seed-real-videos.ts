// Seed Real YouTube Videos from Sonido Líquido Crew
import { createClient } from "@libsql/client";

const DATABASE_URL = process.env.DATABASE_URL!;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

// Real videos from Sonido Líquido Crew YouTube channels
const realVideos = [
  // From Sonido Líquido Crew Official Channel
  {
    title: "Directo de la X, Freestyle Session 6 | Latin Geisha y Zaque",
    youtubeId: "w0LfCn9um4Y",
    description: "Directo de la X Freestyle Session con Latin Geisha y Zaque de Sonido Líquido Crew.",
    isFeatured: true,
    artist: "Latin Geisha",
  },
  {
    title: "Directo de la X, Freestyle Session 22 | Bruno Grasso y Zaque",
    youtubeId: "xcvoohhVAOI",
    description: "Freestyle Session 22 con Bruno Grasso y Zaque de Sonido Líquido Crew.",
    isFeatured: true,
    artist: "Bruno Grasso",
  },
  {
    title: "Directo de la X, Freestyle Session 23 | Peón MC y Zaque",
    youtubeId: "ljo8FF3Uju8",
    description: "Freestyle Session 23 con Peón MC y Zaque de Sonido Líquido Crew.",
    isFeatured: false,
    artist: "Zaque",
  },
  {
    title: "Directo de la X, Freestyle Session 24 | Dilema y Zaque",
    youtubeId: "KlcEG6ewmBM",
    description: "Freestyle Session 24 con Dilema y Zaque de Sonido Líquido Crew.",
    isFeatured: true,
    artist: "Dilema",
  },
  {
    title: "Directo de la X, Freestyle Session 21 | DDC, Bruno Grasso, Peón MC y QMW",
    youtubeId: "__fHyJCu7kk",
    description: "Mega sesión con Doctor Destino, Bruno Grasso, Peón MC y Q Master Weed. 433K+ views.",
    isFeatured: true,
    artist: "Doctor Destino",
  },
  {
    title: "Directo de la X, Freestyle Session 20 | Latin Geisha - Cavalier Latin Drive In",
    youtubeId: "GySP3NNRJKM",
    description: "Freestyle Session 20 con Latin Geisha en el Cavalier Latin Drive In.",
    isFeatured: false,
    artist: "Latin Geisha",
  },
  {
    title: "Entre una Piedra y un Lugar Duro | Beat por Zaque",
    youtubeId: "esAb-XQ4YhY",
    description: "Producción musical de Zaque, fundador de Sonido Líquido Crew.",
    isFeatured: false,
    artist: "Zaque",
  },

  // From Bruno Grasso Channel
  {
    title: "Soñé - Bruno Grasso feat. Fancy Freak (Prod. by Zaque)",
    youtubeId: "TiJfIBbXSpQ",
    description: "Videoclip oficial de Soñé, quinto tema del EP 'De la Noche y sus Efectos' (2018). 10K+ views.",
    isFeatured: true,
    artist: "Bruno Grasso",
  },
  {
    title: "Bruno Grasso - Vuelvo a creer",
    youtubeId: "dAHe4lE-TLY",
    description: "Vuelvo a creer de Bruno Grasso. 21K views.",
    isFeatured: true,
    artist: "Bruno Grasso",
  },
  {
    title: "Bruno Grasso - Otra Noche",
    youtubeId: "SJZnSb9sNew",
    description: "Otra Noche de Bruno Grasso. 17K views.",
    isFeatured: false,
    artist: "Bruno Grasso",
  },
  {
    title: "Bruno Grasso - La Luna Llena",
    youtubeId: "vH4NGObyjtg",
    description: "La Luna Llena de Bruno Grasso. 23K views.",
    isFeatured: true,
    artist: "Bruno Grasso",
  },
  {
    title: "Bruno Grasso - Super Rapero",
    youtubeId: "En6caUVIJ1E",
    description: "Super Rapero de Bruno Grasso. 16K views.",
    isFeatured: false,
    artist: "Bruno Grasso",
  },
  {
    title: "Qué wey? - Bruno Grasso, Kev Cabrone y Peón MC",
    youtubeId: "DtOVfXBHujA",
    description: "Colaboración entre Bruno Grasso, Kev Cabrone y Peón MC. 23K views.",
    isFeatured: true,
    artist: "Kev Cabrone",
  },
  {
    title: "Bruno Grasso (feat. Brez) - Consumir Cosmo Brez Remix",
    youtubeId: "c1FhZwKZCvQ",
    description: "Remix del tema Consumir con Brez. 8.7K views.",
    isFeatured: false,
    artist: "Brez",
  },
  {
    title: "Bruno Grasso - A Ella (Visualizer IA)",
    youtubeId: "PeKSuf2un3I",
    description: "A Ella de Bruno Grasso con visualizer de IA. 27K views.",
    isFeatured: true,
    artist: "Bruno Grasso",
  },
  {
    title: "Bruno Grasso - Consumir (Visualizer IA)",
    youtubeId: "xTnidl9wNz0",
    description: "Consumir de Bruno Grasso con visualizer de IA.",
    isFeatured: false,
    artist: "Bruno Grasso",
  },
  {
    title: "Bruno Grasso - Tumbao (Doctor Destino Remix)",
    youtubeId: "cZuVRKzhTLM",
    description: "Remix de Tumbao por Doctor Destino. 1.6K views.",
    isFeatured: false,
    artist: "Doctor Destino",
  },
  {
    title: "Bruno Grasso (Ft. Trafikante de Almas, X Santa-Ana y Zaque) - Tumbao",
    youtubeId: "zmW_geR6ToI",
    description: "Video oficial de Tumbao con Trafikante de Almas, X Santa-Ana y Zaque. 3K views.",
    isFeatured: true,
    artist: "X Santa-Ana",
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
  console.log("\n🎬 SEEDING REAL YOUTUBE VIDEOS\n");
  console.log("=".repeat(50));

  const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });
  console.log("✅ Database connected\n");

  // First, clear existing videos to replace with real ones
  console.log("🗑️  Clearing existing videos...");
  await client.execute("DELETE FROM videos");

  let created = 0;

  for (const video of realVideos) {
    try {
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

      console.log(`   ✅ ${video.artist}: ${video.title.substring(0, 40)}...`);
      created++;
    } catch (error) {
      console.log(`   ❌ Error: ${(error as Error).message}`);
    }
  }

  // Count total videos
  const countResult = await client.execute("SELECT COUNT(*) as count FROM videos");

  console.log("\n" + "=".repeat(50));
  console.log(`📊 RESULT: ${created} videos created`);
  console.log(`   Total videos in database: ${countResult.rows[0].count}`);
  console.log("=".repeat(50) + "\n");
}

main().catch(console.error);
