"use client";

import { cn } from "@/lib/utils";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

// ===========================================
// Types
// ===========================================

interface ArtistGalleryAsset {
  id: string;
  assetUrl: string;
  thumbnailUrl: string | null;
  assetType: string;
  caption: string | null;
  credit: string | null;
  isPublic: boolean;
  source: "artist_gallery";
}

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
  source: "gallery";
}

type GalleryItem = (ArtistGalleryAsset | GalleryPhoto) & {
  displayUrl: string;
  displayTitle: string | null;
  displayCredit: string | null;
};

// ===========================================
// Helper to normalize gallery items
// ===========================================

function normalizeItem(item: ArtistGalleryAsset | GalleryPhoto): GalleryItem {
  if (item.source === "artist_gallery") {
    return {
      ...item,
      displayUrl: item.assetUrl,
      displayTitle: item.caption,
      displayCredit: item.credit,
    };
  }
  return {
    ...item,
    displayUrl: item.imageUrl,
    displayTitle: item.title,
    displayCredit: item.photographer,
  };
}

// ===========================================
// Props
// ===========================================

interface ArtistGallerySectionProps {
  artistId?: string;
  artistSlug?: string;
  artistName: string;
  limit?: number;
}

// ===========================================
// ArtistGallerySection Component
// ===========================================

export function ArtistGallerySection({
  artistId,
  artistSlug,
  artistName,
  limit = 20,
}: ArtistGallerySectionProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Use slug-based API if available, otherwise fall back to artistId
  const slug = artistSlug;

  const fetchGallery = useCallback(async () => {
    setLoading(true);
    try {
      // Prefer slug-based endpoint (combines both artist_gallery_assets + gallery_photos)
      if (slug) {
        const res = await fetch(`/api/artists/${slug}/gallery?limit=${limit}`);
        const data = await res.json();
        if (data.success && data.data) {
          setItems(data.data.map(normalizeItem));
          return;
        }
      }

      // Fallback: use old artistId-based gallery API
      if (artistId) {
        const params = new URLSearchParams();
        params.set("artistId", artistId);
        params.set("limit", String(limit));
        const res = await fetch(`/api/gallery?${params}`);
        const data = await res.json();
        if (data.success && data.data) {
          setItems(data.data.map((p: GalleryPhoto) => normalizeItem(p)));
          return;
        }
      }
    } catch (error) {
      console.error("Error fetching artist gallery:", error);
    } finally {
      setLoading(false);
    }
  }, [slug, artistId, limit]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  // Lightbox navigation
  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const nextPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % items.length);
    }
  };
  const prevPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + items.length) % items.length);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % items.length : null,
        );
      }
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + items.length) % items.length : null,
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, items.length]);

  // Loading state
  if (loading) {
    return (
      <section className="mb-16">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  // Hide section if no photos
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-full bg-primary/20 border border-primary/30">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <h2 className="font-oswald text-2xl uppercase tracking-wide">
          Galería de {artistName}
        </h2>
        <span className="text-sm text-slc-muted ml-auto">
          {items.length} foto{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            onClick={() => openLightbox(index)}
            className={cn(
              "group relative cursor-pointer overflow-hidden rounded-xl bg-slc-card",
              // Make some images span 2 rows for visual interest
              index % 5 === 0 && "md:row-span-2",
              index % 7 === 3 && "lg:col-span-2",
            )}
            style={{
              aspectRatio:
                index % 5 === 0 ? "3/4" : index % 7 === 3 ? "16/9" : "1/1",
            }}
          >
            <Image
              src={item.thumbnailUrl || item.displayUrl}
              alt={item.displayTitle || `Foto de ${artistName}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Info on hover */}
            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              {item.displayTitle && (
                <h3 className="font-oswald text-white text-lg uppercase mb-1">
                  {item.displayTitle}
                </h3>
              )}
              {"tags" in item && (item as GalleryPhoto).tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(item as GalleryPhoto).tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
              {item.displayCredit && (
                <p className="text-white/60 text-xs mt-2">
                  Foto: {item.displayCredit}
                </p>
              )}
              {item.source === "artist_gallery" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/30 rounded-full text-xs text-primary mt-2">
                  <ImageIcon className="w-3 h-3" />
                  Press
                </span>
              )}
            </div>

            {/* Featured Badge */}
            {"isFeatured" in item && (item as GalleryPhoto).isFeatured && (
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                  Destacada
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && items[lightboxIndex] && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            aria-label="Cerrar galería"
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
            aria-label="Foto anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextPhoto();
            }}
            aria-label="Siguiente foto"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={items[lightboxIndex].displayUrl}
              alt={items[lightboxIndex].displayTitle || `Foto de ${artistName}`}
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Photo Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="max-w-4xl mx-auto text-center">
              {items[lightboxIndex].displayTitle && (
                <h3 className="font-oswald text-2xl text-white uppercase mb-2">
                  {items[lightboxIndex].displayTitle}
                </h3>
              )}
              {"description" in items[lightboxIndex] &&
                (items[lightboxIndex] as GalleryPhoto).description && (
                  <p className="text-white/80 mb-2">
                    {(items[lightboxIndex] as GalleryPhoto).description}
                  </p>
                )}
              <div className="flex items-center justify-center gap-4 text-sm text-white/60">
                {items[lightboxIndex].displayCredit && (
                  <span>Foto: {items[lightboxIndex].displayCredit}</span>
                )}
                {"location" in items[lightboxIndex] &&
                  (items[lightboxIndex] as GalleryPhoto).location && (
                    <span>
                      {(items[lightboxIndex] as GalleryPhoto).location}
                    </span>
                  )}
                <span>
                  {lightboxIndex + 1} / {items.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
