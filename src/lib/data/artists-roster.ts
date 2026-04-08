// ===========================================
// SONIDO LÍQUIDO CREW - ARTIST ROSTER DATA
// ===========================================

export interface ArtistRosterData {
  name: string;
  slug: string;
  spotifyUrl: string;
  spotifyId: string;
  instagramUrl?: string;
  instagramHandle?: string;
  youtubeUrl?: string;
  youtubeHandle?: string;
  // Secondary YouTube channel (for artists with multiple channels)
  youtubeUrl2?: string;
  youtubeHandle2?: string;
  role?: string;
  bio?: string;
}

/**
 * Extract Spotify ID from URL
 */
function extractSpotifyId(url: string): string {
  const match = url.match(/artist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : "";
}

/**
 * Extract Instagram handle from URL
 */
function extractInstagramHandle(url: string): string {
  const match = url.match(/instagram\.com\/([^/?]+)/);
  return match ? `@${match[1]}` : "";
}

/**
 * Extract YouTube handle from URL
 */
function extractYouTubeHandle(url: string): string {
  const match = url.match(/youtube\.com\/@([^/?]+)|youtube\.com\/channel\/([^/?]+)/);
  if (match) {
    return match[1] ? `@${match[1]}` : match[2] || "";
  }
  return "";
}

/**
 * Complete roster of Sonido Líquido Crew artists
 */
export const artistsRoster: ArtistRosterData[] = [
  {
    name: "Brez",
    slug: "brez",
    spotifyUrl: "https://open.spotify.com/artist/2jJmTEMkGQfH3BxoG3MQvF",
    spotifyId: "2jJmTEMkGQfH3BxoG3MQvF",
    instagramUrl: "https://www.instagram.com/brez_idc",
    instagramHandle: "@brez_idc",
    youtubeUrl: "https://youtube.com/@brezhiphopmexicoslc25",
    youtubeHandle: "@brezhiphopmexicoslc25",
    role: "mc",
  },
  {
    name: "Bruno Grasso",
    slug: "bruno-grasso",
    spotifyUrl: "https://open.spotify.com/artist/4fNQqyvcM71IyF2EitEtCj",
    spotifyId: "4fNQqyvcM71IyF2EitEtCj",
    instagramUrl: "https://www.instagram.com/brunograssosl",
    instagramHandle: "@brunograssosl",
    youtubeUrl: "https://youtube.com/@brunograssosl",
    youtubeHandle: "@brunograssosl",
    role: "mc",
  },
  {
    name: "Chas 7P",
    slug: "chas-7p",
    spotifyUrl: "https://open.spotify.com/artist/3RAg8fPmZ8RnacJO8MhLP1",
    spotifyId: "3RAg8fPmZ8RnacJO8MhLP1",
    instagramUrl: "https://www.instagram.com/chas7pecados",
    instagramHandle: "@chas7pecados",
    youtubeUrl: "https://youtube.com/@chas7p347",
    youtubeHandle: "@chas7p347",
    role: "mc",
  },
  {
    name: "Codak",
    slug: "codak",
    spotifyUrl: "https://open.spotify.com/artist/2zrv1oduhIYh29vvQZwI5r",
    spotifyId: "2zrv1oduhIYh29vvQZwI5r",
    instagramUrl: "https://www.instagram.com/ilikebigbuds_i_canot_lie",
    instagramHandle: "@ilikebigbuds_i_canot_lie",
    youtubeUrl: "https://youtu.be/1K7VwrXGCr8",
    youtubeHandle: "Codak",
    role: "producer",
  },
  {
    name: "Dilema",
    slug: "dilema",
    spotifyUrl: "https://open.spotify.com/artist/3eCEorgAoZkvnAQLdy4x38",
    spotifyId: "3eCEorgAoZkvnAQLdy4x38",
    instagramUrl: "https://www.instagram.com/dilema_ladee",
    instagramHandle: "@dilema_ladee",
    youtubeUrl: "https://youtube.com/@dilema999",
    youtubeHandle: "@dilema999",
    role: "mc",
  },
  {
    name: "Doctor Destino",
    slug: "doctor-destino",
    spotifyUrl: "https://open.spotify.com/artist/5urer15JPbCELf17LVia7w",
    spotifyId: "5urer15JPbCELf17LVia7w",
    instagramUrl: "https://www.instagram.com/estoesdoctordestino",
    instagramHandle: "@estoesdoctordestino",
    youtubeUrl: "https://youtube.com/@doctordestinohiphop",
    youtubeHandle: "@doctordestinohiphop",
    role: "mc",
  },
  {
    name: "Fancy Freak",
    slug: "fancy-freak",
    spotifyUrl: "https://open.spotify.com/artist/5TMoczTLclVyzzDY5qf3Yb",
    spotifyId: "5TMoczTLclVyzzDY5qf3Yb",
    instagramUrl: "https://www.instagram.com/fancyfreakcorp",
    instagramHandle: "@fancyfreakcorp",
    youtubeUrl: "https://youtube.com/@fancyfreakdj",
    youtubeHandle: "@fancyfreakdj",
    role: "dj",
  },
  {
    name: "Hassyel",
    slug: "hassyel",
    spotifyUrl: "https://open.spotify.com/artist/6AN9ek9RwrLbSp9rT2lcDG",
    spotifyId: "6AN9ek9RwrLbSp9rT2lcDG",
    instagramUrl: "https://www.instagram.com/hassyel_slc",
    instagramHandle: "@hassyel_slc",
    youtubeUrl: "https://youtube.com/channel/UCZp_YCv7jK3-lEtvSONNs8A",
    youtubeHandle: "Hassyel",
    role: "mc",
  },
  {
    name: "Kev Cabrone",
    slug: "kev-cabrone",
    spotifyUrl: "https://open.spotify.com/artist/0QdRhOmiqAcV1dPCoiSIQJ",
    spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ",
    instagramUrl: "https://www.instagram.com/kev.cabrone",
    instagramHandle: "@kev.cabrone",
    youtubeUrl: "https://youtube.com/@kevcabrone",
    youtubeHandle: "@kevcabrone",
    role: "mc",
  },
  {
    name: "Latin Geisha",
    slug: "latin-geisha",
    spotifyUrl: "https://open.spotify.com/artist/16YScXC67nAnFDcA2LGdY0",
    spotifyId: "16YScXC67nAnFDcA2LGdY0",
    instagramUrl: "https://www.instagram.com/latingeishamx",
    instagramHandle: "@latingeishamx",
    youtubeUrl: "https://youtube.com/@latingeishamx",
    youtubeHandle: "@latingeishamx",
    role: "cantante",
  },
  {
    name: "Pepe Levine",
    slug: "pepe-levine",
    spotifyUrl: "https://open.spotify.com/artist/5HrBwfVDf0HXzGDrJ6Znqc",
    spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc",
    instagramUrl: "https://www.instagram.com/pepelevineonline",
    instagramHandle: "@pepelevineonline",
    youtubeUrl: "https://youtu.be/rdZTYthV1nI",
    youtubeHandle: "Pepe Levine",
    role: "mc",
  },
  {
    name: "Q Master Weed",
    slug: "q-master-weed",
    spotifyUrl: "https://open.spotify.com/artist/4T4Z7jvUcMV16VsslRRuC5",
    spotifyId: "4T4Z7jvUcMV16VsslRRuC5",
    instagramUrl: "https://www.instagram.com/q.masterw",
    instagramHandle: "@q.masterw",
    youtubeUrl: "https://youtube.com/@qmasterw",
    youtubeHandle: "@qmasterw",
    youtubeUrl2: "https://www.youtube.com/@dosocholab",
    youtubeHandle2: "@dosocholab",
    role: "mc",
  },
  {
    name: "Reick One",
    slug: "reick-one",
    spotifyUrl: "https://open.spotify.com/artist/4UqFXhJVb9zy2SbNx4ycJQ",
    spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ",
    instagramUrl: "https://www.instagram.com/reickuno",
    instagramHandle: "@reickuno",
    youtubeUrl: "https://youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA",
    youtubeHandle: "Reick Uno",
    role: "mc",
  },
  {
    name: "X Santa-Ana",
    slug: "x-santa-ana",
    spotifyUrl: "https://open.spotify.com/artist/2Apt0MjZGqXAd1pl4LNQrR",
    spotifyId: "2Apt0MjZGqXAd1pl4LNQrR",
    instagramUrl: "https://www.instagram.com/x_santa_ana",
    instagramHandle: "@x_santa_ana",
    youtubeUrl: "https://youtube.com/@xsanta-ana",
    youtubeHandle: "@xsanta-ana",
    role: "mc",
  },
  {
    name: "Zaque",
    slug: "zaque",
    spotifyUrl: "https://open.spotify.com/artist/4WQmw3fIx9F7iPKL5v8SCN",
    spotifyId: "4WQmw3fIx9F7iPKL5v8SCN",
    instagramUrl: "https://www.instagram.com/zaqueslc",
    instagramHandle: "@zaqueslc",
    youtubeUrl: "https://youtube.com/@zakeuno",
    youtubeHandle: "@zakeuno",
    role: "mc",
    bio: "Fundador de Sonido Líquido Crew. MC y productor pionero del Hip Hop mexicano desde 1999.",
  },
];

/**
 * Get artist by slug
 */
export function getArtistBySlug(slug: string): ArtistRosterData | undefined {
  return artistsRoster.find((a) => a.slug === slug);
}

/**
 * Get artist by Spotify ID
 */
export function getArtistBySpotifyId(spotifyId: string): ArtistRosterData | undefined {
  return artistsRoster.find((a) => a.spotifyId === spotifyId);
}

/**
 * Get all artist Spotify IDs
 */
export function getAllSpotifyIds(): string[] {
  return artistsRoster.map((a) => a.spotifyId);
}
