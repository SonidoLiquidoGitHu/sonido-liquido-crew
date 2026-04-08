import { db } from "./client";
import {
  users,
  artists,
  artistExternalProfiles,
  releases,
  releaseArtists,
  playlists,
  videos,
  events,
  siteSettings,
} from "./schema";
import { generateUUID, slugify } from "../lib/utils";

// ===========================================
// SEED DATA WITH REAL SPOTIFY IDS
// ===========================================

const ADMIN_PASSWORD_HASH = "$2b$10$dummyhashfordevonly"; // Replace with real hash in production

// Artist roster with REAL Spotify artist IDs from sonidoliquido.com
const artistsData = [
  {
    name: "Zaque",
    role: "mc" as const,
    bio: "Fundador de Sonido Líquido Crew. MC y productor con más de 25 años en el Hip Hop mexicano.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5eb8b6d0b8ca8e8b0e7d3e7f8a9",
    tintColor: "cyan",
    isFeatured: true,
    sortOrder: 1,
    spotifyId: "4WQmw3fIx9F7iPKL5v8SCN",
    spotify: "https://open.spotify.com/artist/4WQmw3fIx9F7iPKL5v8SCN",
    youtube: "https://www.youtube.com/@zakeuno",
    instagram: "https://www.instagram.com/zakeuno",
  },
  {
    name: "Doctor Destino",
    role: "mc" as const,
    bio: "MC y productor. Uno de los artistas más prolíficos del crew con múltiples lanzamientos cada año.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5eb5f2b5e4b3c5d6a7b8c9d0e1f",
    tintColor: "green",
    isFeatured: true,
    sortOrder: 2,
    spotifyId: "5urer15JPbCELf17LVia7w",
    spotify: "https://open.spotify.com/artist/5urer15JPbCELf17LVia7w",
    youtube: "https://www.youtube.com/@doctordestinohiphop",
    instagram: "https://www.instagram.com/doctordestinohh",
  },
  {
    name: "Brez",
    role: "mc" as const,
    bio: "MC con un estilo lírico distintivo. Sus álbumes conceptuales destacan por su profundidad.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5eba1b2c3d4e5f6a7b8c9d0e1f2",
    tintColor: "pink",
    isFeatured: true,
    sortOrder: 3,
    spotifyId: "2jJmTEMkGQfH3BxoG3MQvF",
    spotify: "https://open.spotify.com/artist/2jJmTEMkGQfH3BxoG3MQvF",
    youtube: "https://www.youtube.com/@brezhiphopmexicoslc25",
    instagram: "https://www.instagram.com/brezhiphop",
  },
  {
    name: "Bruno Grasso",
    role: "mc" as const,
    bio: "MC y productor con un sonido fresco que mezcla boom bap con elementos modernos.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5ebc2d3e4f5a6b7c8d9e0f1a2b3",
    tintColor: "purple",
    isFeatured: false,
    sortOrder: 4,
    spotifyId: "4fNQqyvcM71IyF2EitEtCj",
    spotify: "https://open.spotify.com/artist/4fNQqyvcM71IyF2EitEtCj",
    youtube: "https://www.youtube.com/@BrunoGrassosl",
    instagram: "https://www.instagram.com/brunograss0",
  },
  {
    name: "Dilema",
    role: "mc" as const,
    bio: "MC con letras introspectivas y un flow característico.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5ebd3e4f5a6b7c8d9e0f1a2b3c4",
    tintColor: "orange",
    isFeatured: false,
    sortOrder: 5,
    spotifyId: "3eCEorgAoZkvnAQLdy4x38",
    spotify: "https://open.spotify.com/artist/3eCEorgAoZkvnAQLdy4x38",
    youtube: "https://www.youtube.com/@dilema999",
    instagram: "https://www.instagram.com/dilema999",
  },
  {
    name: "Codak",
    role: "mc" as const,
    bio: "Miembro fundador de Sonido Líquido Crew desde 1999.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5ebe4f5a6b7c8d9e0f1a2b3c4d5",
    tintColor: "yellow",
    isFeatured: false,
    sortOrder: 6,
    spotifyId: "2zrv1oduhIYh29vvQZwI5r",
    spotify: "https://open.spotify.com/artist/2zrv1oduhIYh29vvQZwI5r",
    youtube: null,
    instagram: null,
  },
  {
    name: "Kev Cabrone",
    role: "mc" as const,
    bio: "MC con un estilo único y presencia escénica notable.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5ebf5a6b7c8d9e0f1a2b3c4d5e6",
    tintColor: "cyan",
    isFeatured: false,
    sortOrder: 7,
    spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ",
    spotify: "https://open.spotify.com/artist/0QdRhOmiqAcV1dPCoiSIQJ",
    youtube: "https://www.youtube.com/@kevcabrone",
    instagram: "https://www.instagram.com/kevcabrone",
  },
  {
    name: "Hassyel",
    role: "mc" as const,
    bio: "MC del crew con un estilo versátil.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5eba6b7c8d9e0f1a2b3c4d5e6f7",
    tintColor: "green",
    isFeatured: false,
    sortOrder: 8,
    spotifyId: "6AN9ek9RwrLbSp9rT2lcDG",
    spotify: "https://open.spotify.com/artist/6AN9ek9RwrLbSp9rT2lcDG",
    youtube: "https://www.youtube.com/@hassyelvfreshpena9740",
    instagram: null,
  },
  {
    name: "X Santa-Ana",
    role: "lado_b" as const,
    bio: "DJ de la división Lado B de Sonido Líquido Crew.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5ebb7c8d9e0f1a2b3c4d5e6f7a8",
    tintColor: "pink",
    isFeatured: true,
    sortOrder: 9,
    spotifyId: "2Apt0MjZGqXAd1pl4LNQrR",
    spotify: "https://open.spotify.com/artist/2Apt0MjZGqXAd1pl4LNQrR",
    youtube: "https://www.youtube.com/@xsanta-ana",
    instagram: "https://www.instagram.com/xsantaana_dj",
  },
  {
    name: "Fancy Freak",
    role: "dj" as const,
    bio: "DJ y productor con un estilo que fusiona géneros.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5ebc8d9e0f1a2b3c4d5e6f7a8b9",
    tintColor: "purple",
    isFeatured: false,
    sortOrder: 10,
    spotifyId: "5TMoczTLclVyzzDY5qf3Yb",
    spotify: "https://open.spotify.com/artist/5TMoczTLclVyzzDY5qf3Yb",
    youtube: null,
    instagram: null,
  },
  {
    name: "Q Master Weed",
    role: "dj" as const,
    bio: "DJ con un sonido característico y producciones originales.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5ebd9e0f1a2b3c4d5e6f7a8b9c0",
    tintColor: "orange",
    isFeatured: false,
    sortOrder: 11,
    spotifyId: "4T4Z7jvUcMV16VsslRRuC5",
    spotify: "https://open.spotify.com/artist/4T4Z7jvUcMV16VsslRRuC5",
    youtube: "https://www.youtube.com/@qmasterw",
    instagram: null,
  },
  {
    name: "Chas7p",
    role: "dj" as const,
    bio: "DJ del crew con sets dinámicos.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5ebe0f1a2b3c4d5e6f7a8b9c0d1",
    tintColor: "yellow",
    isFeatured: false,
    sortOrder: 12,
    spotifyId: "3RAg8fPmZ8RnacJO8MhLP1",
    spotify: "https://open.spotify.com/artist/3RAg8fPmZ8RnacJO8MhLP1",
    youtube: "https://www.youtube.com/@chas7p347",
    instagram: null,
  },
  {
    name: "Reick One",
    role: "dj" as const,
    bio: "DJ y productor del crew.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5ebf1a2b3c4d5e6f7a8b9c0d1e2",
    tintColor: "cyan",
    isFeatured: false,
    sortOrder: 13,
    spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ",
    spotify: "https://open.spotify.com/artist/4UqFXhJVb9zy2SbNx4ycJQ",
    youtube: null,
    instagram: null,
  },
  {
    name: "Latin Geisha",
    role: "cantante" as const,
    bio: "Cantante con una voz única que complementa las producciones del crew.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5eba2b3c4d5e6f7a8b9c0d1e2f3",
    tintColor: "pink",
    isFeatured: false,
    sortOrder: 14,
    spotifyId: "16YScXC67nAnFDcA2LGdY0",
    spotify: "https://open.spotify.com/artist/16YScXC67nAnFDcA2LGdY0",
    youtube: "https://www.youtube.com/@latingeishamx",
    instagram: "https://www.instagram.com/latingeishamx",
  },
  {
    name: "Pepe Levine",
    role: "divo" as const,
    bio: "El Divo del crew con un estilo teatral único.",
    profileImageUrl: "https://i.scdn.co/image/ab6761610000e5ebb3c4d5e6f7a8b9c0d1e2f3a4",
    tintColor: "purple",
    isFeatured: false,
    sortOrder: 15,
    spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc",
    spotify: "https://open.spotify.com/artist/5HrBwfVDf0HXzGDrJ6Znqc",
    youtube: null,
    instagram: null,
  },
];

// NOTE: Release data will be synced from Spotify API when credentials are working
// For now, we'll create placeholder entries that point to real Spotify albums
// These will be populated by the sync functionality
const releasesData: any[] = [];

// Sample videos
const videosData = [
  {
    title: "Rapiña (Video Oficial)",
    youtubeId: "bj8GdNOkreY",
    youtubeUrl: "https://www.youtube.com/watch?v=bj8GdNOkreY",
    thumbnailUrl: "https://img.youtube.com/vi/bj8GdNOkreY/maxresdefault.jpg",
    artistName: "Dilema",
    isFeatured: true,
  },
  {
    title: "F.D.T.H. La Venganza De Pedro",
    youtubeId: "jg7E_HvQ8J4",
    youtubeUrl: "https://www.youtube.com/watch?v=jg7E_HvQ8J4",
    thumbnailUrl: "https://img.youtube.com/vi/jg7E_HvQ8J4/maxresdefault.jpg",
    artistName: "Dilema",
    isFeatured: false,
  },
  {
    title: "Olvídalo",
    youtubeId: "PeKSuf2un3I",
    youtubeUrl: "https://www.youtube.com/watch?v=PeKSuf2un3I",
    thumbnailUrl: "https://img.youtube.com/vi/PeKSuf2un3I/maxresdefault.jpg",
    artistName: "Zaque",
    isFeatured: false,
  },
];

// Site settings
const settingsData = [
  { key: "site_name", value: "Sonido Líquido Crew", type: "string" as const },
  { key: "site_tagline", value: "Hip Hop México desde 1999", type: "string" as const },
  { key: "contact_email", value: "prensasonidoliquido@gmail.com", type: "string" as const },
  { key: "contact_phone", value: "5528011881", type: "string" as const },
  { key: "location", value: "Ciudad de México, CDMX", type: "string" as const },
  { key: "founded_year", value: "1999", type: "number" as const },
  { key: "spotify_playlist_url", value: "https://open.spotify.com/playlist/5qHTKCZIwi3GM3mhPq45Ab", type: "string" as const },
  { key: "youtube_channel_url", value: "https://www.youtube.com/@sonidoliquidocrew", type: "string" as const },
  { key: "instagram_url", value: "https://www.instagram.com/sonidoliquido/", type: "string" as const },
  { key: "facebook_url", value: "https://www.facebook.com/sonidoliquidocrew/", type: "string" as const },
];

// Sample events - Past and Upcoming
const eventsData = [
  // Past events
  {
    title: "Aniversario 25 Años SLC",
    description: "Celebración del 25 aniversario de Sonido Líquido Crew con todos los artistas del roster.",
    venue: "Foro Indie Rocks!",
    city: "Ciudad de México",
    country: "México",
    eventDate: new Date("2024-11-15T21:00:00"),
    eventTime: "21:00",
    isFeatured: true,
    isCancelled: false,
  },
  {
    title: "SLC x Hip Hop al Parque",
    description: "Presentación especial en el festival Hip Hop al Parque.",
    venue: "Parque Simón Bolívar",
    city: "Bogotá",
    country: "Colombia",
    eventDate: new Date("2024-10-20T18:00:00"),
    eventTime: "18:00",
    isFeatured: false,
    isCancelled: false,
  },
  {
    title: "Noche de Freestyle",
    description: "Batalla de freestyle con participación de MCs del crew.",
    venue: "El Imperial",
    city: "Ciudad de México",
    country: "México",
    eventDate: new Date("2024-09-28T20:00:00"),
    eventTime: "20:00",
    isFeatured: false,
    isCancelled: false,
  },
  {
    title: "Lanzamiento 'Nuevo Amanecer'",
    description: "Evento de lanzamiento del nuevo álbum de Doctor Destino.",
    venue: "Caradura",
    city: "Ciudad de México",
    country: "México",
    eventDate: new Date("2024-08-15T20:30:00"),
    eventTime: "20:30",
    isFeatured: false,
    isCancelled: false,
  },
  {
    title: "Festival Vive Latino",
    description: "Participación en el escenario Hip Hop del Vive Latino.",
    venue: "Foro Sol",
    city: "Ciudad de México",
    country: "México",
    eventDate: new Date("2024-03-17T16:00:00"),
    eventTime: "16:00",
    isFeatured: true,
    isCancelled: false,
  },
  // Upcoming events
  {
    title: "SLC Tour 2026 - CDMX",
    description: "Primera fecha del tour nacional 2026. Show completo con todo el roster.",
    venue: "Teatro Metropólitan",
    city: "Ciudad de México",
    country: "México",
    eventDate: new Date("2026-04-18T20:00:00"),
    eventTime: "20:00",
    ticketUrl: "https://ticketmaster.com.mx",
    isFeatured: true,
    isCancelled: false,
  },
  {
    title: "SLC Tour 2026 - Guadalajara",
    description: "Segunda fecha del tour nacional. Hip Hop en la perla tapatía.",
    venue: "C3 Stage",
    city: "Guadalajara",
    country: "México",
    eventDate: new Date("2026-04-25T21:00:00"),
    eventTime: "21:00",
    ticketUrl: "https://ticketmaster.com.mx",
    isFeatured: false,
    isCancelled: false,
  },
  {
    title: "SLC Tour 2026 - Monterrey",
    description: "El crew llega al norte. Show imperdible.",
    venue: "Café Iguana",
    city: "Monterrey",
    country: "México",
    eventDate: new Date("2026-05-02T21:00:00"),
    eventTime: "21:00",
    ticketUrl: "https://ticketmaster.com.mx",
    isFeatured: false,
    isCancelled: false,
  },
];

// ===========================================
// SEED FUNCTION
// ===========================================

async function seed() {
  console.log("🌱 Starting database seed...\n");

  try {
    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await db.delete(releaseArtists);
    await db.delete(artistExternalProfiles);
    await db.delete(releases);
    await db.delete(videos);
    await db.delete(events);
    await db.delete(artists);
    await db.delete(users);
    await db.delete(siteSettings);

    // Seed admin user
    console.log("👤 Creating admin user...");
    const adminId = generateUUID();
    await db.insert(users).values({
      id: adminId,
      email: process.env.ADMIN_EMAIL || "admin@sonidoliquido.com",
      passwordHash: ADMIN_PASSWORD_HASH,
      name: "Administrador",
      role: "admin",
      isActive: true,
    });

    // Seed artists
    console.log("🎤 Creating artists...");
    const artistMap = new Map<string, string>();

    for (const artist of artistsData) {
      const artistId = generateUUID();
      artistMap.set(artist.name, artistId);

      await db.insert(artists).values({
        id: artistId,
        name: artist.name,
        slug: slugify(artist.name),
        bio: artist.bio,
        role: artist.role,
        profileImageUrl: artist.profileImageUrl,
        tintColor: artist.tintColor,
        isFeatured: artist.isFeatured,
        isActive: true,
        sortOrder: artist.sortOrder,
        verificationStatus: "verified",
        identityConflictFlag: false,
        adminNotes: null,
      });

      // Add external profiles
      const profiles = [];
      if (artist.spotify) {
        profiles.push({
          id: generateUUID(),
          artistId,
          platform: "spotify" as const,
          externalUrl: artist.spotify,
          externalId: artist.spotifyId,
          isVerified: true,
        });
      }
      if (artist.youtube) {
        profiles.push({
          id: generateUUID(),
          artistId,
          platform: "youtube" as const,
          externalUrl: artist.youtube,
          handle: artist.youtube.split("@").pop() || null,
          isVerified: true,
        });
      }
      if (artist.instagram) {
        profiles.push({
          id: generateUUID(),
          artistId,
          platform: "instagram" as const,
          externalUrl: artist.instagram,
          handle: artist.instagram.split("/").pop() || null,
          isVerified: true,
        });
      }

      if (profiles.length > 0) {
        await db.insert(artistExternalProfiles).values(profiles);
      }
    }

    console.log(`   ✓ Created ${artistsData.length} artists`);

    // Seed releases (if any)
    if (releasesData.length > 0) {
      console.log("💿 Creating releases...");
      for (const release of releasesData) {
        const releaseId = generateUUID();
        const artistId = artistMap.get(release.primaryArtist);

        await db.insert(releases).values({
          id: releaseId,
          title: release.title,
          slug: slugify(release.title),
          releaseType: release.releaseType,
          releaseDate: release.releaseDate,
          spotifyId: release.spotifyId,
          spotifyUrl: release.spotifyUrl,
          coverImageUrl: release.coverImageUrl,
          isFeatured: release.isFeatured || false,
          isUpcoming: release.releaseDate > new Date(),
        });

        if (artistId) {
          await db.insert(releaseArtists).values({
            id: generateUUID(),
            releaseId,
            artistId,
            isPrimary: true,
          });
        }
      }
      console.log(`   ✓ Created ${releasesData.length} releases`);
    } else {
      console.log("💿 No releases to seed (use sync to fetch from Spotify)");
    }

    // Seed videos
    console.log("🎬 Creating videos...");
    for (const video of videosData) {
      const artistId = artistMap.get(video.artistName) || null;

      await db.insert(videos).values({
        id: generateUUID(),
        title: video.title,
        youtubeId: video.youtubeId,
        youtubeUrl: video.youtubeUrl,
        thumbnailUrl: video.thumbnailUrl,
        artistId,
        isFeatured: video.isFeatured,
      });
    }

    console.log(`   ✓ Created ${videosData.length} videos`);

    // Seed events
    console.log("📅 Creating events...");
    for (const event of eventsData) {
      await db.insert(events).values({
        id: generateUUID(),
        title: event.title,
        description: event.description || null,
        venue: event.venue,
        city: event.city,
        country: event.country,
        eventDate: event.eventDate,
        eventTime: event.eventTime || null,
        ticketUrl: event.ticketUrl || null,
        imageUrl: null,
        isFeatured: event.isFeatured,
        isCancelled: event.isCancelled,
      });
    }

    console.log(`   ✓ Created ${eventsData.length} events`);

    // Seed site settings
    console.log("⚙️  Creating site settings...");
    for (const setting of settingsData) {
      await db.insert(siteSettings).values({
        id: generateUUID(),
        key: setting.key,
        value: setting.value,
        type: setting.type,
      });
    }

    console.log(`   ✓ Created ${settingsData.length} settings`);

    console.log("\n✅ Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`   • 1 admin user`);
    console.log(`   • ${artistsData.length} artists with real Spotify IDs`);
    console.log(`   • ${releasesData.length} releases (sync from Spotify to add more)`);
    console.log(`   • ${videosData.length} videos`);
    console.log(`   • ${eventsData.length} events (past and upcoming)`);
    console.log(`   • ${settingsData.length} site settings`);
    console.log("\n💡 Tip: Use the admin sync page to fetch releases from Spotify!");

  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

// Run seed
seed();
