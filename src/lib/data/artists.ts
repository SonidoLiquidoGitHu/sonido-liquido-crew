export interface Socials {
  instagram?: string;
  spotify?: string;
  soundcloud?: string;
  youtube?: string;
  twitter?: string;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string;
  image: string;
  socials: Socials;
}

export const artists: Artist[] = [
  {
    id: "1",
    name: "Luna Nocturna",
    slug: "luna-nocturna",
    bio: "Luna Nocturna weaves ethereal vocals through layers of analog synthesis and field recordings. Born in Mexico City's underground scene, her sound drifts between ambient, dream pop, and experimental electronics — always anchored by an unmistakable emotional depth that has earned her a devoted following across Latin America and Europe.",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop",
    socials: {
      instagram: "https://instagram.com/lunanocturna",
      spotify: "https://open.spotify.com/artist/luna-nocturna",
      soundcloud: "https://soundcloud.com/lunanocturna",
    },
  },
  {
    id: "2",
    name: "Cero Grados",
    slug: "cero-grados",
    bio: "Cero Grados is the moniker of producer and DJ Alejandro Vera, whose精密ly crafted techno sets have ignited dance floors from Tulum to Berlin. His productions pulse with cold, metallic energy — a sonic reflection of urban landscapes after midnight, where rhythm becomes architecture.",
    image: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&h=600&fit=crop",
    socials: {
      instagram: "https://instagram.com/cerogrados",
      soundcloud: "https://soundcloud.com/cerogrados",
      youtube: "https://youtube.com/@cerogrados",
    },
  },
  {
    id: "3",
    name: "Selva",
    slug: "selva",
    bio: "Selva draws from Colombia's rich musical heritage and fuses it with contemporary bass music, creating a sound that is both ancestral and futuristic. Live percussion meets modular synthesis in performances that feel like rituals — raw, hypnotic, and impossible to replicate.",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop",
    socials: {
      instagram: "https://instagram.com/selva.sound",
      spotify: "https://open.spotify.com/artist/selva",
      twitter: "https://twitter.com/selva_sound",
    },
  },
  {
    id: "4",
    name: "Niebla",
    slug: "niebla",
    bio: "Niebla exists in the space between silence and noise. The solo project of Valentina Reyes, it explores textured guitar loops, reverbed vocals, and sparse drum machines to create intimate soundscapes that feel like overheard conversations in empty rooms.",
    image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&h=600&fit=crop",
    socials: {
      instagram: "https://instagram.com/niebla.music",
      spotify: "https://open.spotify.com/artist/niebla",
      soundcloud: "https://soundcloud.com/niebla-music",
    },
  },
  {
    id: "5",
    name: "Fuego Interior",
    slug: "fuego-interior",
    bio: "Fuego Interior is a collaborative duo — vocalist Camila Torres and producer Diego Ramírez — whose genre-defying tracks blend R&B sensuality with electronic aggression. Their live shows are immersive experiences featuring projection mapping and reactive visuals synced to every beat.",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=600&fit=crop",
    socials: {
      instagram: "https://instagram.com/fuegointerior",
      spotify: "https://open.spotify.com/artist/fuego-interior",
      youtube: "https://youtube.com/@fuegointerior",
      twitter: "https://twitter.com/fuego_interior",
    },
  },
  {
    id: "6",
    name: "Eco",
    slug: "eco",
    bio: "Eco transforms environmental field recordings into ambient compositions that blur the line between documentary and music. Rivers, markets, thunderstorms — every sound becomes a note in his expansive palette. Based in Buenos Aires, he has performed at MUTEK, Sónar, and Unsound.",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop",
    socials: {
      instagram: "https://instagram.com/eco.sound",
      spotify: "https://open.spotify.com/artist/eco",
      soundcloud: "https://soundcloud.com/eco-ambient",
    },
  },
];

export function getArtistBySlug(slug: string): Artist | undefined {
  return artists.find((artist) => artist.slug === slug);
}
