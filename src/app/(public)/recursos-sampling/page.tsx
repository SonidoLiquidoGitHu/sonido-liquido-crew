import type { Metadata } from "next";
import SamplingResourcesClient from "./SamplingResourcesClient";

export const metadata: Metadata = {
  title: "Recursos para Sampling | Sonido Líquido Crew",
  description:
    "Curaduría de canales, videos y playlists de YouTube para encontrar música sampleable.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SamplingResourcesPage() {
  return <SamplingResourcesClient />;
}
