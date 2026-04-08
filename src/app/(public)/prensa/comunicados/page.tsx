"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Newspaper,
  Calendar,
  ArrowRight,
  Tag,
  Eye,
  Download,
  Music,
  Video,
  Loader2,
  Filter,
} from "lucide-react";

interface MediaRelease {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  category: string;
  summary: string | null;
  coverImageUrl: string | null;
  publishDate: string;
  isFeatured: boolean;
  viewCount: number;
  tags: string | null;
}

const categoryLabels: Record<string, string> = {
  new_release: "Nuevo Lanzamiento",
  single: "Single",
  album: "Álbum",
  ep: "EP",
  tour: "Gira / Tour",
  collaboration: "Colaboración",
  event: "Evento",
  announcement: "Anuncio",
  interview: "Entrevista",
  feature: "Feature / Artículo",
};

const categoryColors: Record<string, string> = {
  new_release: "bg-green-500/20 text-green-400 border-green-500/30",
  single: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  album: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  ep: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  tour: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  collaboration: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  event: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  announcement: "bg-red-500/20 text-red-400 border-red-500/30",
  interview: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  feature: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function ComunicadosPage() {
  const [releases, setReleases] = useState<MediaRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchReleases();
  }, []);

  const fetchReleases = async () => {
    try {
      const res = await fetch("/api/media-releases");
      const data = await res.json();
      if (data.success) {
        setReleases(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch media releases:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReleases = selectedCategory === "all"
    ? releases
    : releases.filter(r => r.category === selectedCategory);

  const featuredReleases = releases.filter(r => r.isFeatured);
  const categories = [...new Set(releases.map(r => r.category))];

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Hero */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-purple-900/5 to-slc-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/30 mb-6">
            <Newspaper className="w-8 h-8 text-primary" />
          </div>

          <h1 className="font-oswald text-5xl md:text-6xl lg:text-7xl uppercase mb-4">
            <span className="text-white">Comunicados de</span>
            <br />
            <span className="text-primary">Prensa</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Noticias oficiales, anuncios de lanzamientos y comunicados del crew.
          </p>
        </div>
      </section>

      {/* Featured */}
      {featuredReleases.length > 0 && (
        <section className="py-8 border-b border-slc-border">
          <div className="container mx-auto px-4">
            <h2 className="font-oswald text-2xl uppercase mb-6">Destacados</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {featuredReleases.slice(0, 2).map((release) => (
                <Link
                  key={release.id}
                  href={`/prensa/comunicados/${release.slug}`}
                  className="group bg-slc-card border border-slc-border rounded-xl overflow-hidden hover:border-primary/50 transition-all"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-48 h-48 relative flex-shrink-0">
                      {release.coverImageUrl ? (
                        <SafeImage
                          src={release.coverImageUrl}
                          alt={release.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slc-border flex items-center justify-center">
                          <Newspaper className="w-12 h-12 text-slc-muted" />
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex-1">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium border mb-3 ${categoryColors[release.category] || "bg-slc-card"}`}>
                        {categoryLabels[release.category] || release.category}
                      </span>
                      <h3 className="font-oswald text-xl uppercase mb-2 group-hover:text-primary transition-colors">
                        {release.title}
                      </h3>
                      {release.subtitle && (
                        <p className="text-sm text-primary mb-2">{release.subtitle}</p>
                      )}
                      {release.summary && (
                        <p className="text-sm text-slc-muted line-clamp-2">{release.summary}</p>
                      )}
                      <div className="flex items-center gap-4 mt-4 text-xs text-slc-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(release.publishDate).toLocaleDateString("es-MX")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {release.viewCount} vistas
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category Filter */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <Filter className="w-4 h-4 text-slc-muted" />
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                selectedCategory === "all"
                  ? "bg-primary text-white"
                  : "bg-slc-card text-slc-muted hover:bg-slc-card/80"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-white"
                    : "bg-slc-card text-slc-muted hover:bg-slc-card/80"
                }`}
              >
                {categoryLabels[cat] || cat}
              </button>
            ))}
          </div>

          {/* Releases Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredReleases.length === 0 ? (
            <div className="text-center py-16">
              <Newspaper className="w-16 h-16 text-slc-muted mx-auto mb-4" />
              <h3 className="text-xl font-oswald uppercase mb-2">No hay comunicados</h3>
              <p className="text-slc-muted">
                {selectedCategory === "all"
                  ? "Aún no hay comunicados publicados."
                  : "No hay comunicados en esta categoría."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReleases.map((release) => (
                <Link
                  key={release.id}
                  href={`/prensa/comunicados/${release.slug}`}
                  className="group bg-slc-card border border-slc-border rounded-xl overflow-hidden hover:border-primary/50 transition-all"
                >
                  <div className="aspect-[4/3] relative">
                    {release.coverImageUrl ? (
                      <SafeImage
                        src={release.coverImageUrl}
                        alt={release.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-slc-border flex items-center justify-center">
                        <Newspaper className="w-12 h-12 text-slc-muted" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium border ${categoryColors[release.category] || "bg-slc-card"}`}>
                      {categoryLabels[release.category] || release.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-oswald text-lg uppercase mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {release.title}
                    </h3>
                    {release.summary && (
                      <p className="text-sm text-slc-muted line-clamp-2 mb-3">{release.summary}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-slc-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(release.publishDate).toLocaleDateString("es-MX")}
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        Leer más
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-slc-dark/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-oswald text-2xl uppercase mb-4">
            ¿Necesitas más información?
          </h2>
          <p className="text-slc-muted mb-6">
            Contacta a nuestro equipo de prensa para entrevistas y material adicional.
          </p>
          <Button asChild>
            <a href="mailto:prensasonidoliquido@gmail.com">
              Contactar Prensa
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
