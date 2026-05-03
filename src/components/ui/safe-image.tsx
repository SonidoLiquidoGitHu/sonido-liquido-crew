"use client";
import Image, { ImageProps } from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";

interface SafeImageProps extends Omit<ImageProps, "onError" | "src"> {
  src: ImageProps["src"] | null | undefined;
  fallbackSrc?: string;
  onError?: () => void;
  useNativeForDropbox?: boolean;
  /** Number of retry attempts for failed images (default: 2). Helps with flaky mobile connections. */
  retryCount?: number;
  /** Delay in ms between retries (default: 1500) */
  retryDelay?: number;
}

/**
 * Inline SVG data URI placeholder — no external file dependency.
 * Prevents cascade failures when the fallback image file is missing.
 */
const INLINE_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="#1a1a1a"/>
    <text x="200" y="210" text-anchor="middle" fill="#555" font-family="sans-serif" font-size="14">Sin imagen</text>
  </svg>`
)}`;

/**
 * SafeImage - A wrapper around Next.js Image component that:
 * 1. Automatically sets unoptimized for Dropbox URLs
 * 2. Handles image loading errors with optional fallback
 * 3. Uses native img element for Dropbox URLs to bypass content-type issues
 * 4. Works correctly on Netlify production
 * 5. Retries failed images (helpful for flaky mobile connections)
 * 6. Uses an inline SVG placeholder to avoid fallback cascade failures
 */
export function SafeImage({
  src,
  alt,
  fallbackSrc = INLINE_PLACEHOLDER,
  onError: onErrorProp,
  useNativeForDropbox = true,
  fill,
  width,
  height,
  className,
  sizes,
  priority,
  retryCount = 2,
  retryDelay = 1500,
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when src changes
  useEffect(() => {
    setError(false);
    setImageSrc(src);
    retryAttemptRef.current = 0;

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [src]);

  // Check if URL is from Dropbox
  const isDropboxUrl = typeof src === "string" && (
    src.includes("dropbox.com") ||
    src.includes("dropboxusercontent.com")
  );

  // Use unoptimized for Dropbox URLs (they have auth tokens that don't work with Next.js optimization)
  const shouldUnoptimize = isDropboxUrl || props.unoptimized;

  const handleFinalError = useCallback(() => {
    // Call the provided onError callback
    onErrorProp?.();
  }, [onErrorProp]);

  const handleError = useCallback(() => {
    const currentSrc = typeof src === "string" ? src : "unknown";
    console.warn(
      `[SafeImage] Image failed to load (attempt ${retryAttemptRef.current + 1}/${retryCount + 1}):`,
      currentSrc.substring(0, 80)
    );

    // Retry logic: on mobile, connections can be flaky and a simple retry often works
    if (retryAttemptRef.current < retryCount && !error) {
      retryAttemptRef.current++;
      retryTimerRef.current = setTimeout(() => {
        // Force a re-render by toggling the src (adds cache-bust query param)
        const bustParam = `_retry=${retryAttemptRef.current}_${Date.now()}`;
        const retrySrc = typeof src === "string" && src.startsWith("http")
          ? `${src}${src.includes("?") ? "&" : "?"}${bustParam}`
          : src;
        setImageSrc(retrySrc);
      }, retryDelay * retryAttemptRef.current);
      return;
    }

    // All retries exhausted — fall back
    if (!error && fallbackSrc) {
      setError(true);
      setImageSrc(fallbackSrc);
    }
    handleFinalError();
  }, [src, error, fallbackSrc, retryCount, retryDelay, handleFinalError]);

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
          // Help mobile browsers by providing decoding hint
          decoding="async"
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
        decoding="async"
      />
    );
  }

  return (
    <Image
      {...props}
      src={finalSrc || ""}
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
