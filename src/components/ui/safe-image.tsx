"use client";
import Image, { ImageProps } from "next/image";
import { useState, useEffect } from "react";
interface SafeImageProps extends Omit<ImageProps, "onError" | "src"> {
  src: ImageProps["src"] | null | undefined;
  fallbackSrc?: string;
  onError?: () => void;
  useNativeForDropbox?: boolean;
}
/**
 * SafeImage - A wrapper around Next.js Image component that:
 * 1. Automatically sets unoptimized for Dropbox URLs
 * 2. Handles image loading errors with optional fallback
 * 3. Uses native img element for Dropbox URLs to bypass content-type issues
 * 4. Works correctly on Netlify production
 */
export function SafeImage({
  src,
  alt,
  fallbackSrc = "/images/placeholder.png",
  onError: onErrorProp,
  useNativeForDropbox = true,
  fill,
  width,
  height,
  className,
  sizes,
  priority,
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  // Reset error state when src changes
  useEffect(() => {
    setError(false);
    setImageSrc(src);
  }, [src]);
  // Check if URL is from Dropbox
  const isDropboxUrl = typeof src === "string" && (
    src.includes("dropbox.com") ||
    src.includes("dropboxusercontent.com")
  );
  // Use unoptimized for Dropbox URLs (they have auth tokens that don't work with Next.js optimization)
  const shouldUnoptimize = isDropboxUrl || props.unoptimized;
  const handleError = () => {
    console.warn("[SafeImage] Image failed to load:", typeof src === "string" ? src.substring(0, 80) : src);
    if (!error && fallbackSrc) {
      setError(true);
      setImageSrc(fallbackSrc);
    }
    // Call the provided onError callback
    onErrorProp?.();
  };
  // If no valid src, show nothing or fallback
  if (!src || (typeof src === "string" && src.trim() === "")) {
    if (fallbackSrc) {
      return (
        <Image
          {...props}
          src={fallbackSrc}
          alt={alt || "Image"}
          fill={fill}
          width={width}
          height={height}
          className={className}
          sizes={sizes}
          priority={priority}
          unoptimized
        />
      );
    }
    return null;
  }
  // Final URL to render
  const finalSrc = error ? fallbackSrc : imageSrc;
  // For Dropbox URLs, use native img element to bypass content-type header issues
  // Dropbox returns content-type: application/json but actual content is image
  if (isDropboxUrl && useNativeForDropbox && !error) {
    // For fill mode, we need special handling
    if (fill) {
      return (
        // biome-ignore lint/a11y/useAltText: alt is provided
        <img
          src={typeof finalSrc === "string" ? finalSrc : ""}
          alt={alt || "Image"}
          className={className}
          style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            inset: 0,
            objectFit: "cover",
          }}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
        />
      );
    }
    // For explicit dimensions
    return (
      // biome-ignore lint/a11y/useAltText: alt is provided
      <img
        src={typeof finalSrc === "string" ? finalSrc : ""}
        alt={alt || "Image"}
        width={typeof width === "number" ? width : undefined}
        height={typeof height === "number" ? height : undefined}
        className={className}
        onError={handleError}
        loading={priority ? "eager" : "lazy"}
      />
    );
  }
  return (
    <Image
      {...props}
      src={finalSrc}
      alt={alt || "Image"}
      fill={fill}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized={shouldUnoptimize}
      onError={handleError}
    />
  );
}
export default SafeImage;