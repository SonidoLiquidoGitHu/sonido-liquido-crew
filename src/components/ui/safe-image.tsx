"use client";

import Image, { ImageProps } from "next/image";
import { useState, useEffect } from "react";

interface SafeImageProps extends Omit<ImageProps, "onError" | "src"> {
  src: string | null | undefined;
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
  const [imageSrc, setImageSrc] = useState<string>(src || fallbackSrc);

  useEffect(() => {
    setError(false);
    setImageSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  const isDropboxUrl = typeof src === "string" && (
    src.includes("dropbox.com") ||
    src.includes("dropboxusercontent.com")
  );

  const shouldUnoptimize = isDropboxUrl || props.unoptimized;

  const handleError = () => {
    if (!error) {
      setError(true);
      setImageSrc(fallbackSrc);
    }
    onErrorProp?.();
  };

  // Always have a valid string src
  const finalSrc: string = error ? fallbackSrc : imageSrc;

  // For Dropbox URLs, use native img element
  if (isDropboxUrl && useNativeForDropbox && !error) {
    if (fill) {
      return (
        // biome-ignore lint/a11y/useAltText: alt is provided
        <img
          src={finalSrc}
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

    return (
      // biome-ignore lint/a11y/useAltText: alt is provided
      <img
        src={finalSrc}
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
