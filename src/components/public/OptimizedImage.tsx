"use client";

import { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImageProps, "onError" | "onLoad"> {
  fallbackSrc?: string;
  showLoadingState?: boolean;
  aspectRatio?: "square" | "video" | "portrait" | "auto";
}

// Simple blur data URL for placeholder
const shimmerBlur = `data:image/svg+xml;base64,${Buffer.from(
  `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="#1a1a1a"/>
  </svg>`
).toString("base64")}`;

// Default fallback image
const defaultFallback = "/images/placeholder.jpg";

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

  // Reset state when src changes
  useEffect(() => {
    setImgSrc(src);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

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
    <div className={cn("relative overflow-hidden", aspectRatioClass, className)}>
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
          props.fill ? "object-cover" : ""
        )}
        onError={handleError}
        onLoad={handleLoad}
        placeholder={priority ? undefined : "blur"}
        blurDataURL={shimmerBlur}
        loading={priority ? "eager" : "lazy"}
        priority={priority}
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
