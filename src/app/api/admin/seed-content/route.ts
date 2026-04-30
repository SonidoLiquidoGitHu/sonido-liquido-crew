import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { beats, videos, galleryPhotos, tags, photoTags, campaigns, mediaReleases, events } from "@/db/schema";
import { generateUUID, slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";

// ===========================================
// SAMPLE DATA
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
    previewAudioUrl: "https://cdn.pixabay.com/audio/2024/11/14/audio_8ce7e32988.mp3",
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
    previewAudioUrl: "https://cdn.pixabay.com/audio/2024/09/03/audio_6e5d7c6bcc.mp3",
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
    previewAudioUrl: "https://cdn.pixabay.com/audio/2024/08/27/audio_79e0c50d86.mp3",
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
    previewAudioUrl: "https://cdn.pixabay.com/audio/2024/06/27/audio_d2c87b23b4.mp3",
    coverImageUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    isFree: true,
    gateEnabled: true,
    requireEmail: true,
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
    previewAudioUrl: "https://cdn.pixabay.com/audio/2024/05/15/audio_e1c8b0d2a1.mp3",
    coverImageUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=400&fit=crop",
    isFree: true,
    gateEnabled: true,
    requireEmail: true,
  },
];

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
];

// ===========================================
// SAMPLE CAMPAIGNS
// ===========================================

const sampleCampaigns = [
  {
    title: "Pre-Save: Nuevo Álbum Zaque 2026",
    description: "Pre-guarda el nuevo álbum de Zaque y sé el primero en escucharlo. Incluye 12 tracks inéditos.",
    campaignType: "presave" as const,
    coverImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600",
    bannerImageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200",
    spotifyPresaveUrl: "https://open.spotify.com/artist/4WQmw3fIx9F7iPKL5v8SCN",
    requireSpotifyPresave: true,
    requireEmail: true,
    isActive: true,
    isFeatured: true,
  },
  {
    title: "Hyperfollow: Doctor Destino",
    description: "Sigue a Doctor Destino en todas las plataformas y recibe notificaciones de nuevos lanzamientos.",
    campaignType: "hyperfollow" as const,
    coverImageUrl: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600",
    smartLinkUrl: "https://onerpm.link/doctordestino",
    requireSpotifyFollow: true,
    spotifyArtistUrl: "https://open.spotify.com/artist/5urer15JPbCELf17LVia7w",
    requireEmail: true,
    isActive: true,
    isFeatured: false,
  },
  {
    title: "Smart Link: SLC Gran Reserva",
    description: "Escucha la playlist Gran Reserva de Sonido Líquido en tu plataforma favorita.",
    campaignType: "smartlink" as const,
    coverImageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600",
    smartLinkUrl: "https://onerpm.link/slcgranreserva",
    oneRpmUrl: "https://onerpm.link/slcgranreserva",
    isActive: true,
    isFeatured: true,
  },
  {
    title: "Descarga: Beat Pack Vol. 1",
    description: "Descarga 5 beats exclusivos de Codak y Fancy Freak. Perfecto para freestylers y MCs emergentes.",
    campaignType: "download" as const,
    coverImageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600",
    downloadGateEnabled: true,
    requireEmail: true,
    requireSpotifyFollow: true,
    spotifyArtistUrl: "https://open.spotify.com/artist/2zrv1oduhIYh29vvQZwI5r",
    isActive: true,
    isFeatured: false,
  },
  {
    title: "Concurso: Remix Challenge 2026",
    description: "Participa en el concurso de remixes. El ganador será incluido en el próximo EP oficial.",
    campaignType: "contest" as const,
    coverImageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600",
    requireEmail: true,
    isActive: true,
    isFeatured: true,
  },
];

// ===========================================
// SAMPLE MEDIA RELEASES
// ===========================================

const sampleMediaReleases = [
  {
    title: "Sonido Líquido Crew Celebra 25 Años de Hip Hop Mexicano",
    subtitle: "Aniversario Histórico",
    category: "announcement" as const,
    summary: "El colectivo más representativo del Hip Hop mexicano celebra un cuarto de siglo con gira nacional y nuevo material.",
    content: `# 25 Años de Historia

Sonido Líquido Crew, el colectivo de Hip Hop más influyente de México, celebra 25 años de trayectoria ininterrumpida con una serie de eventos especiales y nuevo material discográfico.

## Una Historia de Perseverancia

Fundado en 1999 en la Ciudad de México por Zaque, el crew ha sido testigo y protagonista de la evolución del Hip Hop en Latinoamérica. Con más de 160 lanzamientos y 15 artistas activos, SLC representa la esencia del movimiento.

## Gira Nacional 2026

Para celebrar este hito, el crew realizará una gira por las principales ciudades de México:
- **CDMX** - Foro Sol (Mayo 2026)
- **Guadalajara** - Auditorio Telmex (Junio 2026)
- **Monterrey** - Arena Monterrey (Julio 2026)

## Nuevo Material

Además de la gira, se prepara un álbum compilatorio con colaboraciones entre todos los miembros del roster actual y leyendas invitadas.`,
    pullQuote: "25 años haciendo historia. Esto es más que música, es un movimiento cultural que trasciende generaciones.",
    pullQuoteAttribution: "Zaque, fundador de Sonido Líquido Crew",
    coverImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
    bannerImageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600",
    prContactName: "Prensa Sonido Líquido",
    prContactEmail: "prensasonidoliquido@gmail.com",
    prContactPhone: "+52 55 2801 1881",
    isPublished: true,
    isFeatured: true,
    tags: ["25 aniversario", "gira", "hip hop mexicano"],
  },
  {
    title: "Zaque Lanza Nuevo Sencillo 'El Límite'",
    subtitle: "Nuevo Single",
    category: "single" as const,
    summary: "El fundador de SLC presenta un adelanto de su próximo álbum con producción de Fancy Freak.",
    content: `# "El Límite" - Nuevo Single

Zaque, fundador y líder de Sonido Líquido Crew, lanza "El Límite", primer sencillo de su esperado álbum solista.

## Sobre la Canción

"El Límite" es una reflexión sobre la perseverancia y los sacrificios necesarios para alcanzar los sueños. Con producción de Fancy Freak y colaboración de Tino El Pingüino, el track combina boom bap clásico con elementos contemporáneos.

## Disponible Ahora

El single está disponible en todas las plataformas digitales:
- Spotify
- Apple Music
- YouTube Music
- Deezer`,
    pullQuote: "No hay límite cuando la pasión te impulsa. Esta canción resume todo lo que hemos construido.",
    pullQuoteAttribution: "Zaque",
    coverImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
    spotifyEmbedUrl: "https://open.spotify.com/track/example",
    youtubeVideoId: "cQf1kLsB3gQ",
    prContactEmail: "prensasonidoliquido@gmail.com",
    isPublished: true,
    isFeatured: true,
    tags: ["single", "zaque", "el limite"],
  },
  {
    title: "Bruno Grasso y Dilema Anuncian EP Colaborativo",
    subtitle: "Colaboración",
    category: "collaboration" as const,
    summary: "Dos pilares del crew unen fuerzas para un EP de 6 tracks que explorará nuevos territorios sonoros.",
    content: `# EP Colaborativo: Bruno Grasso x Dilema

Bruno Grasso y Dilema, dos de los MCs más versátiles de Sonido Líquido Crew, anuncian un proyecto colaborativo que promete redefinir sus sonidos individuales.

## Detalles del Proyecto

- **Nombre**: "Dualidad"
- **Tracks**: 6 canciones originales
- **Producción**: Codak, Fancy Freak
- **Fecha de lanzamiento**: Agosto 2026

## Primer Adelanto

El primer sencillo del EP será revelado en las próximas semanas a través de las redes sociales oficiales.`,
    coverImageUrl: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800",
    prContactEmail: "prensasonidoliquido@gmail.com",
    isPublished: true,
    isFeatured: false,
    tags: ["colaboración", "bruno grasso", "dilema", "ep"],
  },
  {
    title: "Latin Geisha Representará a México en Festival Hip Hop al Parque",
    subtitle: "Festival Internacional",
    category: "event" as const,
    summary: "La cantante de SLC fue seleccionada para representar al Hip Hop mexicano en el festival más grande de Latinoamérica.",
    content: `# Latin Geisha en Hip Hop al Parque 2026

Latin Geisha, la voz femenina de Sonido Líquido Crew, ha sido seleccionada para representar a México en Hip Hop al Parque, el festival de Hip Hop más grande de Latinoamérica.

## El Festival

Hip Hop al Parque se celebra anualmente en Bogotá, Colombia, reuniendo a los mejores exponentes del género de todo el continente.

## Presentación

Latin Geisha se presentará en el escenario principal el sábado 15 de octubre, con un set de 45 minutos que incluirá material de su discografía y adelantos de su próximo álbum.`,
    coverImageUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800",
    prContactEmail: "prensasonidoliquido@gmail.com",
    isPublished: true,
    isFeatured: true,
    tags: ["festival", "latin geisha", "colombia", "internacional"],
  },
  {
    title: "Q Master Weed Inaugura Nuevo Estudio 'Dosocho Lab'",
    subtitle: "Anuncio",
    category: "announcement" as const,
    summary: "El MC y productor abre las puertas de su nuevo estudio de grabación en la Ciudad de México.",
    content: `# Dosocho Lab: Nuevo Estudio de Q Master Weed

Q Master Weed inaugura "Dosocho Lab", un estudio de grabación profesional ubicado en la Ciudad de México, disponible para artistas del crew y proyectos externos.

## Servicios

- Grabación vocal
- Producción musical
- Mezcla y masterización
- Sesiones de video

## Ubicación

El estudio está ubicado en la colonia Roma Norte, CDMX, con fácil acceso desde cualquier punto de la ciudad.

## Contacto

Para reservaciones y cotizaciones: dosocholab@gmail.com`,
    coverImageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800",
    prContactEmail: "dosocholab@gmail.com",
    isPublished: true,
    isFeatured: false,
    tags: ["estudio", "q master weed", "dosocho lab"],
  },
];

// ===========================================
// SAMPLE EVENTS
// ===========================================

const sampleEvents = [
  {
    title: "Sonido Líquido Crew - 25 Aniversario",
    description: "Celebramos 25 años de historia con todos los artistas del roster en un show épico. Invitados especiales y sorpresas.",
    venue: "Auditorio Nacional",
    city: "Ciudad de México",
    country: "México",
    eventDate: new Date("2026-05-15T21:00:00"),
    eventTime: "21:00",
    ticketUrl: "https://ticketmaster.com.mx",
    imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
    isFeatured: true,
  },
  {
    title: "Hip Hop al Parque 2026",
    description: "Representando a México en el festival más grande de Hip Hop en Latinoamérica. Latin Geisha y Zaque en el escenario principal.",
    venue: "Parque Simón Bolívar",
    city: "Bogotá",
    country: "Colombia",
    eventDate: new Date("2026-06-20T16:00:00"),
    eventTime: "16:00",
    ticketUrl: "https://hiphopalparkue.gov.co",
    imageUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800",
    isFeatured: true,
  },
  {
    title: "Cypher Nocturno Vol. 12",
    description: "Sesión de freestyle con DJs en vivo. Entrada libre. Todos los MCs bienvenidos.",
    venue: "Foro Indie Rocks",
    city: "Ciudad de México",
    country: "México",
    eventDate: new Date("2026-04-10T22:00:00"),
    eventTime: "22:00",
    ticketUrl: null,
    imageUrl: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=800",
    isFeatured: false,
  },
  {
    title: "Bruno Grasso & Dilema - EP Release Party",
    description: "Lanzamiento del EP colaborativo 'Dualidad'. Presentación en vivo con invitados especiales.",
    venue: "Foro Alicia",
    city: "Ciudad de México",
    country: "México",
    eventDate: new Date("2026-08-25T20:00:00"),
    eventTime: "20:00",
    ticketUrl: "https://boletia.com",
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
    isFeatured: true,
  },
  {
    title: "Festival Coordenada 2026",
    description: "Doctor Destino y Brez representan al crew en el escenario Hip Hop del festival.",
    venue: "Explanada del Estadio Jalisco",
    city: "Guadalajara",
    country: "México",
    eventDate: new Date("2026-07-12T17:00:00"),
    eventTime: "17:00",
    ticketUrl: "https://festivalcoordenada.com",
    imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
    isFeatured: true,
  },
  {
    title: "Taller de Producción con Codak",
    description: "Masterclass de producción musical. Aprende técnicas de sampling, mezcla y beatmaking con uno de los productores más reconocidos del crew.",
    venue: "Casa del Lago",
    city: "Ciudad de México",
    country: "México",
    eventDate: new Date("2026-04-28T11:00:00"),
    eventTime: "11:00",
    ticketUrl: "https://casadellago.unam.mx",
    imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800",
    isFeatured: false,
  },
  {
    title: "Noche de Boom Bap",
    description: "Una noche dedicada al Hip Hop clásico. Sets de DJs y presentaciones en vivo.",
    venue: "Bajo Circuito",
    city: "Ciudad de México",
    country: "México",
    eventDate: new Date("2026-05-03T21:00:00"),
    eventTime: "21:00",
    ticketUrl: "https://boletia.com",
    imageUrl: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800",
    isFeatured: false,
  },
  {
    title: "Sonido Líquido en Monterrey",
    description: "Show completo con Zaque, K-Oso, y Simpson Ahuevo. Gira nacional 2026.",
    venue: "Café Iguana",
    city: "Monterrey",
    country: "México",
    eventDate: new Date("2026-06-05T21:00:00"),
    eventTime: "21:00",
    ticketUrl: "https://cafeiguana.com.mx",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
    isFeatured: true,
  },
];

const samplePhotos = [
  {
    title: "Concierto Vive Latino 2024",
    imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200",
    thumbnailUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400",
    photographer: "Carlos Mendoza",
    location: "Foro Sol, CDMX",
    isFeatured: true,
    tags: ["concierto", "vive latino"],
  },
  {
    title: "Sesión de Grabación",
    imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200",
    thumbnailUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400",
    photographer: "Studio SLC",
    location: "Estudio Sonido Líquido",
    isFeatured: true,
    tags: ["estudio", "grabación"],
  },
  {
    title: "Freestyle en la Plaza",
    imageUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=1200",
    thumbnailUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400",
    photographer: "Crew SLC",
    location: "Plaza de la Constitución",
    isFeatured: false,
    tags: ["freestyle", "urbano"],
  },
  {
    title: "Backstage - Tour 2023",
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200",
    thumbnailUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400",
    photographer: "Ana García",
    location: "Monterrey",
    isFeatured: true,
    tags: ["backstage", "tour"],
  },
  {
    title: "Cypher Nocturno",
    imageUrl: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=1200",
    thumbnailUrl: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400",
    photographer: "DJ Fancy",
    location: "CDMX",
    isFeatured: false,
    tags: ["cypher", "noche"],
  },
  {
    title: "Equipo de Producción",
    imageUrl: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=1200",
    thumbnailUrl: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=400",
    photographer: "Codak",
    location: "Estudio",
    isFeatured: true,
    tags: ["producción", "estudio"],
  },
  {
    title: "Graffiti Mural SLC",
    imageUrl: "https://images.unsplash.com/photo-1561059488-916d69792237?w=1200",
    thumbnailUrl: "https://images.unsplash.com/photo-1561059488-916d69792237?w=400",
    photographer: "Street Artist",
    location: "Tepito, CDMX",
    isFeatured: false,
    tags: ["graffiti", "arte urbano"],
  },
  {
    title: "Hip Hop al Parque",
    imageUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200",
    thumbnailUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400",
    photographer: "Festival",
    location: "Bogotá, Colombia",
    isFeatured: true,
    tags: ["festival", "internacional"],
  },
  {
    title: "Rehearsal Session",
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200",
    thumbnailUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
    photographer: "Crew",
    location: "Sala de Ensayo",
    isFeatured: true,
    tags: ["ensayo", "música"],
  },
  {
    title: "Meet & Greet",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200",
    thumbnailUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
    photographer: "Prensa SLC",
    location: "CDMX",
    isFeatured: false,
    tags: ["fans", "evento"],
  },
];

// ===========================================
// API HANDLER
// ===========================================

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { type } = body; // "all", "beats", "videos", "photos", "campaigns", "media", "events"

    const results = {
      beats: 0,
      videos: 0,
      photos: 0,
      campaigns: 0,
      mediaReleases: 0,
      events: 0,
    };

    // Seed beats
    if (type === "all" || type === "beats") {
      for (const beat of sampleBeats) {
        try {
          await db.insert(beats).values({
            id: generateUUID(),
            title: beat.title,
            slug: slugify(beat.title),
            description: beat.description,
            producerName: beat.producerName,
            bpm: beat.bpm,
            key: beat.key,
            genre: beat.genre,
            tags: beat.tags,
            duration: beat.duration,
            previewAudioUrl: beat.previewAudioUrl,
            coverImageUrl: beat.coverImageUrl,
            isFree: beat.isFree,
            price: beat.price || null,
            currency: beat.currency || "USD",
            gateEnabled: beat.gateEnabled,
            requireEmail: beat.requireEmail || false,
            requireSpotifyFollow: beat.requireSpotifyFollow || false,
            spotifyArtistUrl: beat.spotifyArtistUrl || null,
            isActive: true,
            isFeatured: true,
          }).onConflictDoNothing();
          results.beats++;
        } catch (e) {
          console.error("Error seeding beat:", beat.title, e);
        }
      }
    }

    // Seed videos
    if (type === "all" || type === "videos") {
      for (const video of sampleVideos) {
        try {
          await db.insert(videos).values({
            id: generateUUID(),
            title: video.title,
            description: video.description,
            youtubeId: video.youtubeId,
            youtubeUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
            thumbnailUrl: `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`,
            isFeatured: video.isFeatured,
          }).onConflictDoNothing();
          results.videos++;
        } catch (e) {
          console.error("Error seeding video:", video.title, e);
        }
      }
    }

    // Seed gallery photos
    if (type === "all" || type === "photos") {
      // First create tags
      const tagIds: Record<string, string> = {};
      const allTags = new Set<string>();
      samplePhotos.forEach(photo => photo.tags.forEach(tag => allTags.add(tag)));

      for (const tagName of allTags) {
        const tagId = generateUUID();
        tagIds[tagName] = tagId;
        try {
          await db.insert(tags).values({
            id: tagId,
            name: tagName,
            slug: slugify(tagName),
            category: "gallery",
          }).onConflictDoNothing();
        } catch (e) {
          // Tag might already exist
        }
      }

      // Then add photos
      for (const photo of samplePhotos) {
        try {
          const photoId = generateUUID();
          await db.insert(galleryPhotos).values({
            id: photoId,
            title: photo.title,
            imageUrl: photo.imageUrl,
            thumbnailUrl: photo.thumbnailUrl,
            photographer: photo.photographer,
            location: photo.location,
            isFeatured: photo.isFeatured,
            isPublished: true,
            altText: photo.title,
          }).onConflictDoNothing();

          // Add photo tags
          for (const tagName of photo.tags) {
            const existingTags = await db.select().from(tags).where(eq(tags.slug, slugify(tagName)));
            if (existingTags.length > 0) {
              try {
                await db.insert(photoTags).values({
                  id: generateUUID(),
                  photoId: photoId,
                  tagId: existingTags[0].id,
                }).onConflictDoNothing();
              } catch (e) {
                // Photo tag might already exist
              }
            }
          }

          results.photos++;
        } catch (e) {
          console.error("Error seeding photo:", photo.title, e);
        }
      }
    }

    // Seed campaigns
    if (type === "all" || type === "campaigns") {
      for (const campaign of sampleCampaigns) {
        try {
          await db.insert(campaigns).values({
            id: generateUUID(),
            title: campaign.title,
            slug: slugify(campaign.title),
            description: campaign.description,
            campaignType: campaign.campaignType,
            coverImageUrl: campaign.coverImageUrl || null,
            bannerImageUrl: campaign.bannerImageUrl || null,
            smartLinkUrl: campaign.smartLinkUrl || null,
            oneRpmUrl: campaign.oneRpmUrl || null,
            spotifyPresaveUrl: campaign.spotifyPresaveUrl || null,
            downloadGateEnabled: campaign.downloadGateEnabled || false,
            requireSpotifyFollow: campaign.requireSpotifyFollow || false,
            spotifyArtistUrl: campaign.spotifyArtistUrl || null,
            requireSpotifyPresave: campaign.requireSpotifyPresave || false,
            requireEmail: campaign.requireEmail || true,
            isActive: campaign.isActive,
            isFeatured: campaign.isFeatured,
          }).onConflictDoNothing();
          results.campaigns++;
        } catch (e) {
          console.error("Error seeding campaign:", campaign.title, e);
        }
      }
    }

    // Seed media releases
    if (type === "all" || type === "media") {
      for (const release of sampleMediaReleases) {
        try {
          await db.insert(mediaReleases).values({
            id: generateUUID(),
            title: release.title,
            slug: slugify(release.title),
            subtitle: release.subtitle,
            category: release.category,
            summary: release.summary,
            content: release.content,
            pullQuote: release.pullQuote || null,
            pullQuoteAttribution: release.pullQuoteAttribution || null,
            coverImageUrl: release.coverImageUrl || null,
            bannerImageUrl: release.bannerImageUrl || null,
            spotifyEmbedUrl: release.spotifyEmbedUrl || null,
            youtubeVideoId: release.youtubeVideoId || null,
            prContactName: release.prContactName || null,
            prContactEmail: release.prContactEmail || null,
            prContactPhone: release.prContactPhone || null,
            publishDate: new Date(),
            isPublished: release.isPublished,
            isFeatured: release.isFeatured,
            tags: JSON.stringify(release.tags),
          }).onConflictDoNothing();
          results.mediaReleases++;
        } catch (e) {
          console.error("Error seeding media release:", release.title, e);
        }
      }
    }

    // Seed events
    if (type === "all" || type === "events") {
      for (const event of sampleEvents) {
        try {
          await db.insert(events).values({
            id: generateUUID(),
            title: event.title,
            description: event.description,
            venue: event.venue,
            city: event.city,
            country: event.country,
            eventDate: event.eventDate,
            eventTime: event.eventTime,
            ticketUrl: event.ticketUrl || null,
            imageUrl: event.imageUrl || null,
            isFeatured: event.isFeatured,
          }).onConflictDoNothing();
          results.events++;
        } catch (e) {
          console.error("Error seeding event:", event.title, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded: ${results.beats} beats, ${results.videos} videos, ${results.photos} photos, ${results.campaigns} campaigns, ${results.mediaReleases} media releases, ${results.events} events`,
      results,
    });
  } catch (error) {
    console.error("Error seeding content:", error);
    return NextResponse.json(
      { success: false, error: "Failed to seed content" },
      { status: 500 }
    );
  }
}
