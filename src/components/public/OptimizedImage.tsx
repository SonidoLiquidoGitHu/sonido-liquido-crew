"use client";

import { cn } from "@/lib/utils";
import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";

/**
 * Route Dropbox URLs through the image proxy to fix content-type issues on mobile.
 */
function proxyDropboxUrl(url: string): string {
  if (url.includes("dropbox.com") || url.includes("dropboxusercontent.com")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

interface OptimizedImageProps extends Omit<ImageProps, "onError" | "onLoad"> {
  fallbackSrc?: string;
  showLoadingState?: boolean;
  aspectRatio?: "square" | "video" | "portrait" | "auto";
}

// Simple blur data URL for placeholder (inline SVG - no Buffer.from in client component)
const shimmerBlur = `data:image/svg+xml,${encodeURIComponent(
  `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="#1a1a1a"/>
  </svg>`,
)}`;

// Default fallback image - inline SVG to avoid missing file issues
const defaultFallback = `data:image/svg+xml,${encodeURIComponent(
  `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="#1a1a1a"/>
    <text x="200" y="210" text-anchor="middle" fill="#555" font-family="sans-serif" font-size="14">Sin imagen</text>
  </svg>`,
)}`;

export function OptimizedImage({
  src,
  alt,
  fallbackSrc = defaultFallback,
  showLoadingState = true,
  aspectRatio = "auto",
  className,
  priority,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Pre-process: proxy Dropbox URLs to fix content-type on mobile
  const processedSrc = useMemo(() => {
    if (!src || typeof src !== "string") return src;
    return proxyDropboxUrl(src);
  }, [src]);

  const isDropbox =
    typeof src === "string" &&
    (src.includes("dropbox.com") || src.includes("dropboxusercontent.com"));

  // Reset state when src changes
  useEffect(() => {
    setImgSrc(processedSrc);
    setIsLoading(true);
    setHasError(false);
  }, [processedSrc]);

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    auto: "",
  }[aspectRatio];

  return (
    <div
      className={cn("relative overflow-hidden", aspectRatioClass, className)}
    >
      {/* Loading shimmer */}
      {showLoadingState && isLoading && !hasError && (
        <div className="absolute inset-0 bg-slc-dark animate-pulse" />
      )}

      <Image
        {...props}
        src={imgSrc}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          props.fill ? "object-cover" : "",
        )}
        onError={handleError}
        onLoad={handleLoad}
        placeholder={priority ? undefined : "blur"}
        blurDataURL={shimmerBlur}
        loading={priority ? "eager" : "lazy"}
        priority={priority}
        unoptimized={isDropbox || props.unoptimized}
      />

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slc-dark text-slc-muted">
          <span className="text-xs">Sin imagen</span>
        </div>
      )}
    </div>
  );
}

/**
 * Preload critical images
 * Use this in the head for above-the-fold images
 */
export function preloadImage(src: string) {
  if (typeof window !== "undefined") {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    document.head.appendChild(link);
  }
}

export default OptimizedImage;
