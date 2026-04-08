import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists, artistExternalProfiles } from "@/db/schema";
import { generateUUID, slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";

// ===========================================
// SLC ROSTER - 15 ARTISTS WITH DETAILED BIOS
// ===========================================

const slcArtists = [
  {
    name: "Zaque",
    slug: "zaque",
    role: "mc" as const,
    bio: "Fundador y líder de Sonido Líquido Crew desde 1999. Con más de 25 años de trayectoria, Zaque es una de las figuras más importantes del Hip Hop mexicano. Su estilo lírico combina consciencia social con técnica depurada. Ha colaborado con artistas de toda Latinoamérica y es reconocido como pionero del movimiento Hip Hop en la Ciudad de México. Su legado incluye la formación de nuevas generaciones de MCs y la consolidación de SLC como el colectivo más representativo del género en México.",
    shortBio: "Fundador de Sonido Líquido Crew. Pionero del Hip Hop mexicano desde 1999.",
    isActive: true,
    isFeatured: true,
    sortOrder: 1,
    spotify: {
      id: "4WQmw3fIx9F7iPKL5v8SCN",
      url: "https://open.spotify.com/artist/4WQmw3fIx9F7iPKL5v8SCN",
    },
    instagram: {
      handle: "zaqueslc",
      url: "https://www.instagram.com/zaqueslc",
    },
    youtube: {
      handle: "zakeuno",
      url: "https://youtube.com/@zakeuno",
    },
  },
  {
    name: "Doctor Destino",
    slug: "doctor-destino",
    role: "mc" as const,
    bio: "MC veterano con más de dos décadas de trayectoria en la escena del Hip Hop mexicano. Doctor Destino es conocido por su flow técnico y letras profundas que abordan temas de la vida cotidiana, reflexiones personales y crítica social. Su estilo único combina influencias del boom bap clásico con sonidos contemporáneos. Ha lanzado múltiples proyectos en solitario y colaboraciones que han marcado la historia del rap en español.",
    shortBio: "MC con 20+ años de trayectoria. Flow técnico y letras profundas.",
    isActive: true,
    isFeatured: true,
    sortOrder: 2,
    spotify: {
      id: "5urer15JPbCELf17LVia7w",
      url: "https://open.spotify.com/artist/5urer15JPbCELf17LVia7w",
    },
    instagram: {
      handle: "estoesdoctordestino",
      url: "https://www.instagram.com/estoesdoctordestino",
    },
    youtube: {
      handle: "doctordestinohiphop",
      url: "https://youtube.com/@doctordestinohiphop",
    },
  },
  {
    name: "Brez",
    slug: "brez",
    role: "mc" as const,
    bio: "MC representante del Hip Hop mexicano underground. Brez destaca por su estilo único, letras contundentes y flow versátil que lo ha posicionado como uno de los artistas más respetados de la nueva generación del crew. Su música refleja las realidades de la calle mexicana con autenticidad y técnica lírica refinada. Activo en la escena desde principios de los 2000s.",
    shortBio: "MC underground con estilo único y letras contundentes.",
    isActive: true,
    isFeatured: true,
    sortOrder: 3,
    spotify: {
      id: "2jJmTEMkGQfH3BxoG3MQvF",
      url: "https://open.spotify.com/artist/2jJmTEMkGQfH3BxoG3MQvF",
    },
    instagram: {
      handle: "brez_idc",
      url: "https://www.instagram.com/brez_idc",
    },
    youtube: {
      handle: "brezhiphopmexicoslc25",
      url: "https://youtube.com/@brezhiphopmexicoslc25",
    },
  },
  {
    name: "Bruno Grasso",
    slug: "bruno-grasso",
    role: "mc" as const,
    bio: "MC y productor con un estilo distintivo que fusiona melodías emotivas con letras introspectivas. Bruno Grasso es reconocido por su capacidad de crear atmósferas musicales únicas y narrativas personales profundas. Su trabajo combina influencias del Hip Hop clásico con elementos de R&B y soul, creando un sonido propio que ha resonado con audiencias de toda Latinoamérica. Álbumes como 'Consumir' lo han establecido como una voz importante del rap mexicano contemporáneo.",
    shortBio: "MC y productor. Flow melódico y letras introspectivas.",
    isActive: true,
    isFeatured: true,
    sortOrder: 4,
    spotify: {
      id: "4fNQqyvcM71IyF2EitEtCj",
      url: "https://open.spotify.com/artist/4fNQqyvcM71IyF2EitEtCj",
    },
    instagram: {
      handle: "brunograssosl",
      url: "https://www.instagram.com/brunograssosl",
    },
    youtube: {
      handle: "brunograssosl",
      url: "https://youtube.com/@brunograssosl",
    },
  },
  {
    name: "Dilema",
    slug: "dilema",
    role: "mc" as const,
    bio: "MC con estilo versátil y presencia escénica impactante. Dilema ha construido su reputación a través de presentaciones en vivo energéticas y un catálogo de música que abarca desde el boom bap hasta el trap. Su capacidad para adaptarse a diferentes estilos musicales mientras mantiene su esencia lírica lo ha convertido en uno de los artistas más dinámicos del colectivo.",
    shortBio: "MC versátil con presencia escénica impactante.",
    isActive: true,
    isFeatured: true,
    sortOrder: 5,
    spotify: {
      id: "3eCEorgAoZkvnAQLdy4x38",
      url: "https://open.spotify.com/artist/3eCEorgAoZkvnAQLdy4x38",
    },
    instagram: {
      handle: "dilema_ladee",
      url: "https://www.instagram.com/dilema_ladee",
    },
    youtube: {
      handle: "dilema999",
      url: "https://youtube.com/@dilema999",
    },
  },
  {
    name: "Kev Cabrone",
    slug: "kev-cabrone",
    role: "mc" as const,
    bio: "MC con flow agresivo y letras callejeras que reflejan la realidad urbana mexicana sin filtros. Kev Cabrone es conocido por su estilo directo, energía en el escenario y colaboraciones que han definido el sonido del Hip Hop mexicano contemporáneo. Su música aborda temas de la vida en la calle con honestidad brutal y técnica lírica afilada.",
    shortBio: "MC con flow agresivo y letras callejeras sin filtros.",
    isActive: true,
    isFeatured: true,
    sortOrder: 6,
    spotify: {
      id: "0QdRhOmiqAcV1dPCoiSIQJ",
      url: "https://open.spotify.com/artist/0QdRhOmiqAcV1dPCoiSIQJ",
    },
    instagram: {
      handle: "kev.cabrone",
      url: "https://www.instagram.com/kev.cabrone",
    },
    youtube: {
      handle: "kevcabrone",
      url: "https://youtube.com/@kevcabrone",
    },
  },
  {
    name: "X Santa-Ana",
    slug: "x-santa-ana",
    role: "mc" as const,
    bio: "MC y productor conocido como 'Lado B' del crew. X Santa-Ana aporta una perspectiva única con letras profundas y producciones atmosféricas. Su trabajo detrás de escenas como productor ha sido fundamental para definir el sonido de Sonido Líquido Crew, mientras que sus apariciones como MC demuestran un dominio técnico y lírico excepcional.",
    shortBio: "MC y productor. El 'Lado B' de Sonido Líquido Crew.",
    isActive: true,
    isFeatured: true,
    sortOrder: 7,
    spotify: {
      id: "2Apt0MjZGqXAd1pl4LNQrR",
      url: "https://open.spotify.com/artist/2Apt0MjZGqXAd1pl4LNQrR",
    },
    instagram: {
      handle: "x_santa_ana",
      url: "https://www.instagram.com/x_santa_ana",
    },
    youtube: {
      handle: "xsanta-ana",
      url: "https://youtube.com/@xsanta-ana",
    },
  },
  {
    name: "Latin Geisha",
    slug: "latin-geisha",
    role: "cantante" as const,
    bio: "Cantante, MC y la voz femenina principal de Sonido Líquido Crew. Latin Geisha ha roto barreras en una escena dominada por hombres, estableciéndose como una de las artistas más talentosas del Hip Hop mexicano. Su versatilidad vocal le permite transitar entre el rap y el canto melódico con facilidad, aportando una dimensión única al sonido del colectivo.",
    shortBio: "Cantante y MC. La voz femenina de Sonido Líquido Crew.",
    isActive: true,
    isFeatured: true,
    sortOrder: 8,
    spotify: {
      id: "16YScXC67nAnFDcA2LGdY0",
      url: "https://open.spotify.com/artist/16YScXC67nAnFDcA2LGdY0",
    },
    instagram: {
      handle: "latingeishamx",
      url: "https://www.instagram.com/latingeishamx",
    },
    youtube: {
      handle: "latingeishamx",
      url: "https://youtube.com/@latingeishamx",
    },
  },
  {
    name: "Q Master Weed",
    slug: "q-master-weed",
    role: "mc" as const,
    bio: "MC y productor, fundador de Dosocho Lab. Q Master Weed combina su experiencia como beatmaker con habilidades líricas para crear música que define el sonido del Hip Hop mexicano. Su laboratorio de producción ha sido cuna de muchos de los beats que han definido la carrera de artistas del crew y más allá.",
    shortBio: "MC y productor. Fundador de Dosocho Lab.",
    isActive: true,
    isFeatured: true,
    sortOrder: 9,
    spotify: {
      id: "4T4Z7jvUcMV16VsslRRuC5",
      url: "https://open.spotify.com/artist/4T4Z7jvUcMV16VsslRRuC5",
    },
    instagram: {
      handle: "q.masterw",
      url: "https://www.instagram.com/q.masterw",
    },
    youtube: {
      handle: "qmasterw",
      url: "https://youtube.com/@qmasterw",
    },
  },
  {
    name: "Chas 7P",
    slug: "chas-7p",
    role: "mc" as const,
    bio: "MC conocido por su estilo agresivo y letras sin censura que exploran los siete pecados capitales y las tentaciones de la vida urbana. Chas 7P (7 Pecados) ha construido una base de fans leales con su autenticidad y disposición a abordar temas controversiales con ingenio lírico.",
    shortBio: "MC con estilo agresivo. Los 7 pecados del Hip Hop.",
    isActive: true,
    isFeatured: true,
    sortOrder: 10,
    spotify: {
      id: "3RAg8fPmZ8RnacJO8MhLP1",
      url: "https://open.spotify.com/artist/3RAg8fPmZ8RnacJO8MhLP1",
    },
    instagram: {
      handle: "chas7pecados",
      url: "https://www.instagram.com/chas7pecados",
    },
    youtube: {
      handle: "chas7p347",
      url: "https://youtube.com/@chas7p347",
    },
  },
  {
    name: "Fancy Freak",
    slug: "fancy-freak",
    role: "dj" as const,
    bio: "DJ y productor oficial de Sonido Líquido Crew. Fancy Freak es el arquitecto sonoro detrás de muchas de las producciones más icónicas del colectivo. Su habilidad para crear beats que combinan samples clásicos con elementos modernos ha definido el sonido del crew. Como DJ, sus sets en vivo son legendarios en la escena del Hip Hop mexicano.",
    shortBio: "DJ y productor oficial de Sonido Líquido Crew.",
    isActive: true,
    isFeatured: true,
    sortOrder: 11,
    spotify: {
      id: "5TMoczTLclVyzzDY5qf3Yb",
      url: "https://open.spotify.com/artist/5TMoczTLclVyzzDY5qf3Yb",
    },
    instagram: {
      handle: "fancyfreakcorp",
      url: "https://www.instagram.com/fancyfreakcorp",
    },
    youtube: {
      handle: "fancyfreakdj",
      url: "https://youtube.com/@fancyfreakdj",
    },
  },
  {
    name: "Pepe Levine",
    slug: "pepe-levine",
    role: "mc" as const,
    bio: "MC con amplia trayectoria en el underground mexicano. Conocido como 'El Divo', Pepe Levine combina carisma escénico con habilidad lírica para crear presentaciones memorables. Su estilo abarca desde el humor hasta la reflexión profunda, siempre con un flow distintivo que lo hace inconfundible.",
    shortBio: "MC veterano. 'El Divo' del underground mexicano.",
    isActive: true,
    isFeatured: true,
    sortOrder: 12,
    spotify: {
      id: "5HrBwfVDf0HXzGDrJ6Znqc",
      url: "https://open.spotify.com/artist/5HrBwfVDf0HXzGDrJ6Znqc",
    },
    instagram: {
      handle: "pepelevineonline",
      url: "https://www.instagram.com/pepelevineonline",
    },
    youtube: {
      handle: "pepelevineonline",
      url: "https://youtube.com/@pepelevineonline",
    },
  },
  {
    name: "Reick One",
    slug: "reick-one",
    role: "mc" as const,
    bio: "MC y productor con estilo técnico y letras elaboradas. Reick One es conocido por su atención al detalle en cada verso y su capacidad para construir narrativas complejas. Su trabajo como productor complementa su visión artística, creando proyectos cohesivos que destacan en la escena del Hip Hop mexicano.",
    shortBio: "MC y productor. Estilo técnico y letras elaboradas.",
    isActive: true,
    isFeatured: true,
    sortOrder: 13,
    spotify: {
      id: "4UqFXhJVb9zy2SbNx4ycJQ",
      url: "https://open.spotify.com/artist/4UqFXhJVb9zy2SbNx4ycJQ",
    },
    instagram: {
      handle: "reickuno",
      url: "https://www.instagram.com/reickuno",
    },
    youtube: {
      handle: "",
      url: "https://youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA",
    },
  },
  {
    name: "Codak",
    slug: "codak",
    role: "producer" as const,
    bio: "Productor y beatmaker fundador de Sonido Líquido Crew. Codak ha sido fundamental en definir el sonido del colectivo desde sus inicios. Su producción combina samples de soul y funk con drums contundentes, creando el soundtrack del Hip Hop mexicano de los 90s y 2000s. Su legado incluye beats icónicos que han definido carreras.",
    shortBio: "Productor fundador. El arquitecto sonoro original de SLC.",
    isActive: true,
    isFeatured: true,
    sortOrder: 14,
    spotify: {
      id: "2zrv1oduhIYh29vvQZwI5r",
      url: "https://open.spotify.com/artist/2zrv1oduhIYh29vvQZwI5r",
    },
    instagram: {
      handle: "ilikebigbuds_i_canot_lie",
      url: "https://www.instagram.com/ilikebigbuds_i_canot_lie",
    },
    youtube: {
      handle: "",
      url: "https://youtu.be/1K7VwrXGCr8",
    },
  },
  {
    name: "Hassyel",
    slug: "hassyel",
    role: "mc" as const,
    bio: "MC del crew con estilo propio y presencia creciente en la escena. Hassyel representa la nueva generación de Sonido Líquido Crew, aportando frescura mientras mantiene la esencia del colectivo. Su álbum 'Zen' demostró su capacidad para crear proyectos conceptuales con profundidad lírica y producción moderna.",
    shortBio: "MC de nueva generación. Frescura con esencia clásica.",
    isActive: true,
    isFeatured: true,
    sortOrder: 15,
    spotify: {
      id: "6AN9ek9RwrLbSp9rT2lcDG",
      url: "https://open.spotify.com/artist/6AN9ek9RwrLbSp9rT2lcDG",
    },
    instagram: {
      handle: "ilikebigbuds_i_canot_lie",
      url: "https://www.instagram.com/ilikebigbuds_i_canot_lie",
    },
    youtube: {
      handle: "",
      url: "https://youtube.com/channel/UCZp_YCv7jK3-lEtvSONNs8A",
    },
  },
];

// ===========================================
// Fetch Spotify profile image using oEmbed
// ===========================================

async function getSpotifyProfileImage(spotifyUrl: string): Promise<string | null> {
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;
    const response = await fetch(oembedUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 }
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.thumbnail_url || null;
  } catch (error) {
    console.error("Failed to fetch Spotify image:", error);
    return null;
  }
}

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

    const results = {
      created: 0,
      updated: 0,
      profiles: 0,
      errors: [] as string[],
    };

    console.log("[Seed Artists] Starting to seed 15 SLC artists...");

    for (const artistData of slcArtists) {
      try {
        // Check if artist exists by slug
        const [existingArtist] = await db
          .select()
          .from(artists)
          .where(eq(artists.slug, artistData.slug))
          .limit(1);

        // Get Spotify profile image
        const profileImageUrl = await getSpotifyProfileImage(artistData.spotify.url);

        let artistId: string;

        if (existingArtist) {
          // Update existing artist
          artistId = existingArtist.id;
          await db
            .update(artists)
            .set({
              name: artistData.name,
              bio: artistData.bio,
              role: artistData.role,
              profileImageUrl: profileImageUrl || existingArtist.profileImageUrl,
              isActive: artistData.isActive,
              isFeatured: artistData.isFeatured,
              sortOrder: artistData.sortOrder,
              updatedAt: new Date(),
            })
            .where(eq(artists.id, artistId));

          results.updated++;
          console.log(`[Seed Artists] Updated: ${artistData.name}`);
        } else {
          // Create new artist
          artistId = generateUUID();
          await db.insert(artists).values({
            id: artistId,
            name: artistData.name,
            slug: artistData.slug,
            bio: artistData.bio,
            role: artistData.role,
            profileImageUrl,
            isActive: artistData.isActive,
            isFeatured: artistData.isFeatured,
            sortOrder: artistData.sortOrder,
            verificationStatus: "verified",
          });

          results.created++;
          console.log(`[Seed Artists] Created: ${artistData.name}`);
        }

        // Delete existing external profiles for this artist
        await db
          .delete(artistExternalProfiles)
          .where(eq(artistExternalProfiles.artistId, artistId));

        // Add Spotify profile
        await db.insert(artistExternalProfiles).values({
          id: generateUUID(),
          artistId,
          platform: "spotify",
          externalId: artistData.spotify.id,
          externalUrl: artistData.spotify.url,
          isVerified: true,
        });
        results.profiles++;

        // Add Instagram profile
        await db.insert(artistExternalProfiles).values({
          id: generateUUID(),
          artistId,
          platform: "instagram",
          handle: artistData.instagram.handle,
          externalUrl: artistData.instagram.url,
          isVerified: true,
        });
        results.profiles++;

        // Add YouTube profile
        await db.insert(artistExternalProfiles).values({
          id: generateUUID(),
          artistId,
          platform: "youtube",
          handle: artistData.youtube.handle || undefined,
          externalUrl: artistData.youtube.url,
          isVerified: true,
        });
        results.profiles++;

      } catch (error) {
        const errMsg = `Failed to seed ${artistData.name}: ${(error as Error).message}`;
        console.error(`[Seed Artists] ${errMsg}`);
        results.errors.push(errMsg);
      }
    }

    console.log(`[Seed Artists] Complete: ${results.created} created, ${results.updated} updated, ${results.profiles} profiles`);

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.created + results.updated} artists with ${results.profiles} social profiles`,
      results,
    });
  } catch (error) {
    console.error("[Seed Artists] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to seed artists" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "POST to this endpoint to seed 15 SLC artists",
    artists: slcArtists.map(a => ({ name: a.name, slug: a.slug, role: a.role })),
  });
}
