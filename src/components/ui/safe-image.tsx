"use client";
import Image, { ImageProps } from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
// NOTE: useMemo intentionally removed — see processedSrc comment below.

interface SafeImageProps extends Omit<ImageProps, "onError" | "src"> {
  src: ImageProps["src"] | null | undefined;
  fallbackSrc?: string;
  onError?: () => void;
  /** @deprecated No longer needed — proxy handles content-type issues */
  useNativeForDropbox?: boolean;
  /** Number of retry attempts for failed images (default: 2). Helps with flaky mobile connections. */
  retryCount?: number;
  /** Delay in ms between retries (default: 1500) */
  retryDelay?: number;
  /** Show a refresh overlay on error instead of just the fallback (default: true) */
  showRefreshOn?: boolean;
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
 * Check if a URL is from Dropbox (needs proxy for content-type fix on mobile)
 */
function isDropboxUrl(url: string): boolean {
  return url.includes("dropbox.com") || url.includes("dropboxusercontent.com");
}

/**
 * Convert a Dropbox URL to a proxied URL that fixes the content-type header.
 * Dropbox returns content-type: application/json even for image files, which
 * causes mobile browsers (especially Safari) to refuse rendering them.
 * Our /api/image-proxy route fetches the image server-side and re-serves it
 * with the correct MIME type.
 *
 * IMPORTANT: Check for already-proxied URLs FIRST, before isDropboxUrl(),
 * because a proxied URL like /api/image-proxy?url=https%3A%2F%2Fwww.dropbox.com%2F...
 * still contains "dropbox.com" in the encoded query parameter.
 */
function proxyUrl(url: string): string {
  // Already proxied — skip to prevent double-proxying
  if (url.startsWith("/api/image-proxy")) return url;
  if (isDropboxUrl(url)) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * SafeImage - A wrapper around Next.js Image component that:
 * 1. Routes Dropbox URLs through /api/image-proxy to fix content-type issues on mobile
 * 2. Handles image loading errors with optional fallback
 * 3. Works correctly on Netlify production
 * 4. Retries failed images (helpful for flaky mobile connections)
 * 5. Uses an inline SVG placeholder to avoid fallback cascade failures
 * 6. Shows a refresh button when images fail to load (helps with cached errors)
 */
export function SafeImage({
  src,
  alt,
  fallbackSrc = INLINE_PLACEHOLDER,
  onError: onErrorProp,
  useNativeForDropbox: _useNativeForDropbox, // deprecated — kept for API compat
  fill,
  width,
  height,
  className,
  sizes,
  priority,
  retryCount = 2,
  retryDelay = 1500,
  showRefreshOn = true,
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-process the source URL: proxy Dropbox URLs
  // CRITICAL: Compute the proxied URL directly (not via useMemo) so it's
  // used from the very first render (SSR + initial paint). In React 19 /
  // Next.js 16, useMemo may not execute during SSR, causing raw Dropbox
  // URLs to be rendered in the HTML. Since proxyUrl() is a trivial string
  // operation (no expensive computation), there's no benefit from memoizing.
  const processedSrc = !src || typeof src !== "string" ? src : proxyUrl(src);

  // Initialize imageSrc with the already-proxied URL (not raw src!)
  const [imageSrc, setImageSrc] = useState(processedSrc);

  // Reset state when src changes
  useEffect(() => {
    setError(false);
    setImageSrc(processedSrc);
    retryAttemptRef.current = 0;

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [processedSrc]);

  // Check if original URL is from Dropbox
  const wasDropboxUrl = typeof src === "string" && isDropboxUrl(src);

  // Use unoptimized for proxied URLs (proxy already serves optimized content)
  const shouldUnoptimize = wasDropboxUrl || props.unoptimized;

  const handleFinalError = useCallback(() => {
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
        const currentProcessedSrc = typeof processedSrc === "string" && processedSrc.startsWith("/")
          ? `${processedSrc}${processedSrc.includes("?") ? "&" : "?"}${bustParam}`
          : typeof processedSrc === "string" && processedSrc.startsWith("http")
            ? `${processedSrc}${processedSrc.includes("?") ? "&" : "?"}${bustParam}`
            : processedSrc;
        setImageSrc(currentProcessedSrc);
      }, retryDelay * retryAttemptRef.current);
      return;
    }

    // All retries exhausted — fall back
    if (!error && fallbackSrc) {
      setError(true);
      setImageSrc(fallbackSrc);
    }
    handleFinalError();
  }, [src, processedSrc, error, fallbackSrc, retryCount, retryDelay, handleFinalError]);

  // Manual refresh handler — busts cache and retries the image
  const handleRefresh = useCallback(() => {
    setError(false);
    retryAttemptRef.current = 0;
    setRetryKey(prev => prev + 1);
    const bustParam = `_refresh=${Date.now()}`;
    const refreshedSrc = typeof processedSrc === "string" && processedSrc.startsWith("/")
      ? `${processedSrc}${processedSrc.includes("?") ? "&" : "?"}${bustParam}`
      : typeof processedSrc === "string" && processedSrc.startsWith("http")
        ? `${processedSrc}${processedSrc.includes("?") ? "&" : "?"}${bustParam}`
        : processedSrc;
    setImageSrc(refreshedSrc);
  }, [processedSrc]);

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

  return (
    <div className={fill ? "absolute inset-0" : "relative"} key={retryKey}>
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
      {/* Show refresh button when image fails and showRefreshOn is true */}
      {error && showRefreshOn && (
        <button
          type="button"
          onClick={handleRefresh}
          className="absolute bottom-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors z-10"
          title="Reintentar cargar imagen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6"/>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
            <path d="M3 22v-6h6"/>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
        </button>
      )}
    </div>
  );
}

export default SafeImage;
