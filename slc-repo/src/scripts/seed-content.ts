/**
 * Content Seeding Script
 *
 * Seeds sample beats, videos, and gallery photos for the Sonido Líquido Crew website.
 *
 * Run with: bun run src/scripts/seed-content.ts
 */

import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import { generateUUID, slugify } from "../lib/utils";

// Database connection
const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle(client);

// ===========================================
// SAMPLE BEATS DATA
// ===========================================

const sampleBeats = [
  {
    title: "Barrio Underground",
    description: "Beat de boom bap clásico con samples de vinilo. Perfecto para flows callejeros y letras con contenido.",
    producerName: "Codak",
    bpm: 90,
    key: "A minor",
    genre: "Boom Bap",
    tags: ["boom bap", "classic", "vinyl", "underground"],
    duration: 180,
    previewAudioUrl: "https://cdn.pixabay.com/audio/2024/02/14/audio_8e2e1c12a8.mp3",
    coverImageUrl: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    isFree: true,
    gateEnabled: true,
    requireEmail: true,
    requireSpotifyFollow: true,
    spotifyArtistUrl: "https://open.spotify.com/artist/2zrv1oduhIYh29vvQZwI5r",
  },
  {
    title: "Noche de Freestyle",
    description: "Instrumental para sesiones de freestyle. Tempo medio con espacio para improvisar.",
    producerName: "Fancy Freak",
    bpm: 95,
    key: "D minor",
    genre: "Hip Hop",
    tags: ["freestyle", "cyphers", "practice"],
    duration: 240,
    previewAudioUrl: "https://cdn.pixabay.com/audio/2024/03/12/audio_b35a86e84f.mp3",
    coverImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    isFree: true,
    gateEnabled: true,
    requireEmail: true,
  },
  {
    title: "Trap Mexicano",
    description: "Beat de trap con influencias mexicanas. 808s pesados y hi-hats rápidos.",
    producerName: "Codak",
    bpm: 140,
    key: "F minor",
    genre: "Trap",
    tags: ["trap", "mexican", "808", "hard"],
    duration: 195,
    previewAudioUrl: "https://cdn.pixabay.com/audio/2024/01/17/audio_ef85f92d31.mp3",
    coverImageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop",
    isFree: false,
    price: 29.99,
    currency: "USD",
    gateEnabled: false,
  },
  {
    title: "Jazz en la Calle",
    description: "Instrumental jazzy con samples de piano y saxofón. Vibes relajadas para el atardecer.",
    producerName: "Fancy Freak",
    bpm: 85,
    key: "G major",
    genre: "Jazz Rap",
    tags: ["jazz", "chill", "piano", "sax"],
    duration: 210,
    previewAudioUrl: "https://cdn.pixabay.com/audio/2024/02/28/audio_a8f6b4c3f1.mp3",
    coverImageUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    isFree: true,
    gateEnabled: true,
    requireEmail: true,
    requireSpotifyPlay: true,
    spotifySongUrl: "https://open.spotify.com/track/example",
  },
  {
    title: "Revolución",
    description: "Beat épico con cuerdas orquestales y drums agresivos. Para temas de protesta y consciencia social.",
    producerName: "Codak",
    bpm: 100,
    key: "C minor",
    genre: "Conscious Hip Hop",
    tags: ["epic", "orchestral", "protest", "conscious"],
    duration: 225,
    previewAudioUrl: "https://cdn.pixabay.com/audio/2024/03/05/audio_c2b9e4d8a1.mp3",
    coverImageUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=400&fit=crop",
    isFree: true,
    gateEnabled: true,
    requireEmail: true,
  },
];

// ===========================================
// SAMPLE VIDEOS DATA
// ===========================================

const sampleVideos = [
  {
    title: "Zaque - He Estado (con el Matapuercos en la cocina)",
    youtubeId: "dQw4w9WgXcQ", // Replace with actual video IDs
    description: "Video oficial de Zaque con el Matapuercos.",
    isFeatured: true,
  },
  {
    title: "Doctor Destino - Freestyle Session 2024",
    youtubeId: "9bZkp7q19f0",
    description: "Sesión de freestyle en vivo con Doctor Destino.",
    isFeatured: true,
  },
  {
    title: "Bruno Grasso ft. Dilema - Calles de México",
    youtubeId: "JGwWNGJdvx8",
    description: "Colaboración entre Bruno Grasso y Dilema.",
    isFeatured: true,
  },
  {
    title: "Kev Cabrone - En la Esquina",
    youtubeId: "kJQP7kiw5Fk",
    description: "Nuevo single de Kev Cabrone.",
    isFeatured: false,
  },
  {
    title: "Latin Geisha - Sueños",
    youtubeId: "RgKAFK5djSk",
    description: "Video musical de Latin Geisha.",
    isFeatured: true,
  },
  {
    title: "Q Master Weed - Cypher SLC 2024",
    youtubeId: "fJ9rUzIMcZQ",
    description: "Cypher oficial del crew.",
    isFeatured: false,
  },
  {
    title: "Brez - Desde Abajo",
    youtubeId: "60ItHLz5WEA",
    description: "Video de Brez sobre sus inicios.",
    isFeatured: false,
  },
  {
    title: "Sonido Líquido Crew - 25 Años (Documental)",
    youtubeId: "hTWKbfoikeg",
    description: "Documental celebrando 25 años del crew.",
    isFeatured: true,
  },
];

// ===========================================
// SAMPLE GALLERY PHOTOS
// ===========================================

const samplePhotos = [
  {
    title: "Concierto Vive Latino 2024",
    imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400",
    photographer: "Carlos Mendoza",
    location: "Foro Sol, CDMX",
    isFeatured: true,
    tags: ["concierto", "vive latino", "2024"],
  },
  {
    title: "Sesión de Grabación - Zaque",
    imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400",
    photographer: "Studio SLC",
    location: "Estudio Sonido Líquido",
    isFeatured: true,
    tags: ["estudio", "grabación", "zaque"],
  },
  {
    title: "Freestyle en la Plaza",
    imageUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400",
    photographer: "Crew SLC",
    location: "Plaza de la Constitución",
    isFeatured: false,
    tags: ["freestyle", "plaza", "urbano"],
  },
  {
    title: "Backstage - Tour 2023",
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400",
    photographer: "Ana García",
    location: "Monterrey",
    isFeatured: true,
    tags: ["backstage", "tour", "2023"],
  },
  {
    title: "Cypher Nocturno",
    imageUrl: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400",
    photographer: "DJ Fancy",
    location: "CDMX",
    isFeatured: false,
    tags: ["cypher", "noche", "freestyle"],
  },
  {
    title: "Equipo de Producción",
    imageUrl: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=400",
    photographer: "Codak",
    location: "Estudio",
    isFeatured: true,
    tags: ["producción", "estudio", "equipo"],
  },
  {
    title: "Graffiti Mural SLC",
    imageUrl: "https://images.unsplash.com/photo-1561059488-916d69792237?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1561059488-916d69792237?w=400",
    photographer: "Street Artist",
    location: "Tepito, CDMX",
    isFeatured: false,
    tags: ["graffiti", "arte urbano", "mural"],
  },
  {
    title: "Firma de Autógrafos",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
    photographer: "Prensa SLC",
    location: "Mixup Insurgentes",
    isFeatured: false,
    tags: ["fans", "firma", "evento"],
  },
  {
    title: "Rehearsal - Doctor Destino",
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
    photographer: "Crew",
    location: "Sala de Ensayo",
    isFeatured: true,
    tags: ["ensayo", "doctor destino", "música"],
  },
  {
    title: "Hip Hop al Parque 2023",
    imageUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400",
    photographer: "Festival",
    location: "Bogotá, Colombia",
    isFeatured: true,
    tags: ["festival", "colombia", "internacional"],
  },
];

// ===========================================
// SEED FUNCTIONS
// ===========================================

async function seedBeats() {
  console.log("🎵 Seeding beats...");

  for (const beat of sampleBeats) {
    const id = generateUUID();
    const slug = slugify(beat.title);

    await client.execute({
      sql: `INSERT OR REPLACE INTO beats (
        id, title, slug, description, producer_name, bpm, key, genre, tags, duration,
        preview_audio_url, cover_image_url, is_free, price, currency,
        gate_enabled, require_email, require_spotify_follow, spotify_artist_url,
        require_spotify_play, spotify_song_url, is_active, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        beat.title,
        slug,
        beat.description,
        beat.producerName,
        beat.bpm,
        beat.key,
        beat.genre,
        JSON.stringify(beat.tags),
        beat.duration,
        beat.previewAudioUrl,
        beat.coverImageUrl,
        beat.isFree ? 1 : 0,
        beat.price || null,
        beat.currency || "USD",
        beat.gateEnabled ? 1 : 0,
        beat.requireEmail ? 1 : 0,
        beat.requireSpotifyFollow ? 1 : 0,
        beat.spotifyArtistUrl || null,
        beat.requireSpotifyPlay ? 1 : 0,
        beat.spotifySongUrl || null,
        1, // is_active
        1, // is_featured
      ],
    });

    console.log(`  ✓ Added beat: ${beat.title}`);
  }

  console.log(`✅ Seeded ${sampleBeats.length} beats`);
}

async function seedVideos() {
  console.log("🎬 Seeding videos...");

  for (const video of sampleVideos) {
    const id = generateUUID();

    await client.execute({
      sql: `INSERT OR REPLACE INTO videos (
        id, title, description, youtube_id, youtube_url, thumbnail_url, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

    console.log(`  ✓ Added video: ${video.title}`);
  }

  console.log(`✅ Seeded ${sampleVideos.length} videos`);
}

async function seedGalleryPhotos() {
  console.log("📸 Seeding gallery photos...");

  // First, create some tags
  const tagIds: Record<string, string> = {};
  const allTags = new Set<string>();
  samplePhotos.forEach(photo => photo.tags.forEach(tag => allTags.add(tag)));

  for (const tagName of allTags) {
    const tagId = generateUUID();
    tagIds[tagName] = tagId;

    await client.execute({
      sql: `INSERT OR IGNORE INTO tags (id, name, slug, category) VALUES (?, ?, ?, ?)`,
      args: [tagId, tagName, slugify(tagName), "gallery"],
    });
  }

  // Then add photos
  for (const photo of samplePhotos) {
    const photoId = generateUUID();

    await client.execute({
      sql: `INSERT OR REPLACE INTO gallery_photos (
        id, title, image_url, thumbnail_url, photographer, location,
        is_featured, is_published, alt_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        photoId,
        photo.title,
        photo.imageUrl,
        photo.thumbnailUrl,
        photo.photographer,
        photo.location,
        photo.isFeatured ? 1 : 0,
        1, // is_published
        photo.title,
      ],
    });

    // Add photo tags
    for (const tag of photo.tags) {
      const tagId = tagIds[tag];
      if (tagId) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO photo_tags (id, photo_id, tag_id) VALUES (?, ?, ?)`,
          args: [generateUUID(), photoId, tagId],
        });
      }
    }

    console.log(`  ✓ Added photo: ${photo.title}`);
  }

  console.log(`✅ Seeded ${samplePhotos.length} gallery photos`);
}

// ===========================================
// MAIN
// ===========================================

async function main() {
  console.log("🚀 Starting content seeding...\n");

  try {
    await seedBeats();
    console.log("");
    await seedVideos();
    console.log("");
    await seedGalleryPhotos();
    console.log("\n✅ All content seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding content:", error);
    process.exit(1);
  }
}

main();
