import { NextResponse } from "next/server";

const artists = [
  {
    id: "1",
    name: "Luna Nocturna",
    slug: "luna-nocturna",
    bio: "Ethereal vocals through analog synthesis and field recordings from Mexico City's underground.",
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
    bio: "Precisely crafted techno from producer and DJ Alejandro Vera, igniting floors from Tulum to Berlin.",
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
    bio: "Colombian heritage fused with contemporary bass music — ancestral and futuristic.",
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
    bio: "Textured guitar loops, reverbed vocals, and sparse drum machines — intimate soundscapes by Valentina Reyes.",
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
    bio: "R&B sensuality meets electronic aggression — vocalist Camila Torres and producer Diego Ramírez.",
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
    bio: "Environmental field recordings transformed into ambient compositions. Performed at MUTEK, Sónar, and Unsound.",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop",
    socials: {
      instagram: "https://instagram.com/eco.sound",
      spotify: "https://open.spotify.com/artist/eco",
      soundcloud: "https://soundcloud.com/eco-ambient",
    },
  },
];

export async function GET() {
  return NextResponse.json(artists);
}
