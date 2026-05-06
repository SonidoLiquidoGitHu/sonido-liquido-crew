"use client";

/**
 * Hook to proxy Dropbox image URLs through /api/image-proxy.
 *
 * Dropbox shared links return content-type: application/json even though
 * the body is an image. Mobile browsers (especially Safari) refuse to render
 * images when the content-type doesn't match. Our /api/image-proxy route
 * fetches the image server-side and re-serves it with the correct MIME type.
 *
 * Usage:
 *   const { src, unoptimized } = useProxiedImage(imageUrl);
 *   <Image src={src} unoptimized={unoptimized} ... />
 */

function isDropboxUrl(url: string): boolean {
  return url.includes("dropbox.com") || url.includes("dropboxusercontent.com");
}

export function useProxiedImage(url: string | null | undefined): {
  src: string;
  unoptimized: boolean;
} {
  if (!url || typeof url !== "string") {
    return { src: url || "", unoptimized: false };
  }

  if (isDropboxUrl(url)) {
    return {
      src: `/api/image-proxy?url=${encodeURIComponent(url)}`,
      unoptimized: true,
    };
  }

  return { src: url, unoptimized: false };
}

/**
 * Synchronous version for use outside of React components
 */
export function proxyImageUrl(url: string | null | undefined): {
  src: string;
  unoptimized: boolean;
} {
  if (!url || typeof url !== "string") {
    return { src: url || "", unoptimized: false };
  }

  if (isDropboxUrl(url)) {
    return {
      src: `/api/image-proxy?url=${encodeURIComponent(url)}`,
      unoptimized: true,
    };
  }

  return { src: url, unoptimized: false };
}
