"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { ArrowRight, X, ChevronLeft, ChevronRight, Camera, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GalleryPhoto {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  photographer: string | null;
  location: string | null;
  isFeatured: boolean;
  tags: { id: string; name: string; slug: string }[];
}

interface Album {
  id: string;
  title: string;
  slug: string;
}

interface GallerySectionProps {
  initialPhotos?: GalleryPhoto[];
  showAll?: boolean;
  limit?: number;
}

export function GallerySection({ initialPhotos, showAll = false, limit = 12 }: GallerySectionProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos || []);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(!initialPhotos);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [allTags, setAllTags] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    if (!initialPhotos) {
      fetchGallery();
    } else {
      // Extract unique tags from photos
      const tagsMap = new Map();
      initialPhotos.forEach((photo) => {
        photo.tags.forEach((tag) => {
          if (!tagsMap.has(tag.id)) {
            tagsMap.set(tag.id, tag);
          }
        });
      });
      setAllTags(Array.from(tagsMap.values()));
    }
  }, [initialPhotos]);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!showAll) params.set("featured", "true");
      params.set("limit", String(limit));
      if (selectedTag) params.set("tag", selectedTag);

      const res = await fetch(`/api/gallery?${params}`);
      const data = await res.json();

      if (data.success) {
        setPhotos(data.data || []);
        setAlbums(data.albums || []);

        // Extract unique tags
        const tagsMap = new Map();
        (data.data || []).forEach((photo: GalleryPhoto) => {
          photo.tags.forEach((tag) => {
            if (!tagsMap.has(tag.id)) {
              tagsMap.set(tag.id, tag);
            }
          });
        });
        setAllTags(Array.from(tagsMap.values()));
      }
    } catch (error) {
      console.error("Error fetching gallery:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialPhotos) {
      fetchGallery();
    }
  }, [selectedTag]);

  // Filter photos by selected tag
  const filteredPhotos = selectedTag
    ? photos.filter((p) => p.tags.some((t) => t.slug === selectedTag))
    : photos;

  // Lightbox navigation
  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const nextPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % filteredPhotos.length);
    }
  };
  const prevPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "ArrowLeft") prevPhoto();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex]);

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
        <div className="section-container flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (photos.length === 0) {
    return null; // Don't show section if no photos
  }

  return (
    <section className="py-20 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
      <div className="section-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-primary/20 border border-primary/30">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-oswald text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide text-white">
                Galería
              </h2>
            </div>
            <p className="text-gray-400">
              Momentos capturados del crew en acción
            </p>
          </div>
          {!showAll && (
            <Button asChild variant="outline" className="shrink-0 border-gray-600 text-white hover:bg-white/10">
              <Link href="/galeria">
                Ver todas
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedTag("")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                !selectedTag
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              )}
            >
              Todas
            </button>
            {allTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(tag.slug)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                  selectedTag === tag.slug
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                )}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* Photo Grid - Masonry-like layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filteredPhotos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => openLightbox(index)}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-xl bg-slc-card",
                // Make some images span 2 rows for visual interest
                index % 5 === 0 && "md:row-span-2",
                index % 7 === 3 && "lg:col-span-2"
              )}
              style={{
                aspectRatio: index % 5 === 0 ? "3/4" : index % 7 === 3 ? "16/9" : "1/1",
              }}
            >
              <SafeImage
                src={photo.thumbnailUrl || photo.imageUrl}
                alt={photo.title || "Gallery photo"}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Info on hover */}
              <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                {photo.title && (
                  <h3 className="font-oswald text-white text-lg uppercase mb-1">
                    {photo.title}
                  </h3>
                )}
                {photo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {photo.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                {photo.photographer && (
                  <p className="text-white/60 text-xs mt-2">
                    Foto: {photo.photographer}
                  </p>
                )}
              </div>

              {/* Featured Badge */}
              {photo.isFeatured && (
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                    Destacada
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* View More Button (if not showing all) */}
        {!showAll && photos.length >= limit && (
          <div className="text-center mt-10">
            <Button asChild size="lg" variant="outline" className="border-gray-600 text-white hover:bg-white/10">
              <Link href="/galeria">
                Ver galería completa
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevPhoto();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextPhoto();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <SafeImage
              src={filteredPhotos[lightboxIndex].imageUrl}
              alt={filteredPhotos[lightboxIndex].title || "Gallery photo"}
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Photo Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="max-w-4xl mx-auto text-center">
              {filteredPhotos[lightboxIndex].title && (
                <h3 className="font-oswald text-2xl text-white uppercase mb-2">
                  {filteredPhotos[lightboxIndex].title}
                </h3>
              )}
              {filteredPhotos[lightboxIndex].description && (
                <p className="text-white/80 mb-2">
                  {filteredPhotos[lightboxIndex].description}
                </p>
              )}
              <div className="flex items-center justify-center gap-4 text-sm text-white/60">
                {filteredPhotos[lightboxIndex].photographer && (
                  <span>Foto: {filteredPhotos[lightboxIndex].photographer}</span>
                )}
                {filteredPhotos[lightboxIndex].location && (
                  <span>{filteredPhotos[lightboxIndex].location}</span>
                )}
                <span>
                  {lightboxIndex + 1} / {filteredPhotos.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
