import { Metadata } from "next";
import { GallerySection } from "@/components/public";
import { Camera } from "lucide-react";

export const metadata: Metadata = {
  title: "Galería | Sonido Líquido Crew",
  description: "Galería de fotos del crew. Conciertos, sesiones, detrás de cámaras y más momentos capturados.",
};

export const dynamic = "force-dynamic";

export default function GalleryPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-purple-900/5 to-slc-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        <div className="section-container relative z-10 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/30 mb-6">
            <Camera className="w-8 h-8 text-primary" />
          </div>

          <h1 className="font-oswald text-5xl md:text-6xl lg:text-7xl uppercase mb-4">
            <span className="text-white">Galería</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Momentos capturados del crew en acción. Conciertos, sesiones de grabación,
            detrás de cámaras y más.
          </p>
        </div>
      </section>

      {/* Gallery Section - Show all photos */}
      <GallerySection showAll={true} limit={100} />

      {/* Empty State Info */}
      <section className="py-16 text-center">
        <p className="text-gray-500 text-sm">
          ¿Tienes fotos del crew? Compártelas en Instagram con el hashtag{" "}
          <span className="text-primary">#SonidoLíquidoCrew</span>
        </p>
      </section>
    </div>
  );
}
