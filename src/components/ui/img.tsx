"use client";

import { isDropboxImageUrl, proxyImageUrl } from "@/lib/utils";
import { useCallback, useState } from "react";

/**
 * Img - A reliable image component that:
 * 1. Routes Dropbox URLs through /api/image-proxy (content-type fix for mobile Safari)
 * 2. Uses plain <img> tags for all external URLs (Spotify CDN, etc.)
 * 3. Handles loading errors with a fallback
 *
 * Previously used next/image, but switched to plain <img> because:
 * - next/image with fill + unoptimized={false} for external URLs was unreliable
 *   on client-rendered sections (the unoptimized prop overrode the global config)
 * - Spotify CDN images are already optimized and cached, no need for Next.js processing
 * - Plain <img> is simpler, more reliable, and renders identically
 */
export function Img({
  src,
  alt,
  fill,
  className,
  unoptimized: _unoptimized,
  priority,
  sizes: _sizes,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  unoptimized?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  const [error, setError] = useState(false);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  // Proxy Dropbox URLs through /api/image-proxy
  const processedSrc = typeof src === "string" ? proxyImageUrl(src) : src;

  if (!processedSrc || error) {
    return (
      <div
        className={`bg-slc-card flex items-center justify-center ${fill ? "absolute inset-0" : "w-full h-full"}`}
      >
        <svg viewBox="0 0 24 24" className="w-12 h-12 text-slc-border">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      </div>
    );
  }

  // For fill mode, use absolute positioning
  if (fill) {
    return (
      <img
        {...rest}
        src={processedSrc}
        alt={alt || ""}
        className={`absolute inset-0 w-full h-full object-cover ${className || ""}`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={handleError}
      />
    );
  }

  return (
    <img
      {...rest}
      src={processedSrc}
      alt={alt || ""}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={handleError}
    />
  );
}

export default Img;
