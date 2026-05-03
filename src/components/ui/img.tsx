"use client";

import Image, { ImageProps } from "next/image";
import { proxyImageUrl, isDropboxImageUrl } from "@/lib/utils";

/**
 * Img - A thin wrapper around Next.js Image that automatically routes
 * Dropbox URLs through /api/image-proxy to fix content-type issues on mobile.
 *
 * Dropbox shared links return content-type: application/json even though
 * the body is an image. Mobile browsers (especially Safari) refuse to render
 * images when the content-type doesn't match.
 *
 * Use this anywhere you'd use next/image with URLs from the database.
 */
export function Img({
  src,
  unoptimized,
  ...props
}: ImageProps) {
  const proxiedSrc = typeof src === "string" ? proxyImageUrl(src) : src;
  const needsUnoptimized = typeof src === "string" ? isDropboxImageUrl(src) : false;

  return (
    <Image
      {...props}
      src={proxiedSrc || ""}
      unoptimized={needsUnoptimized || !!unoptimized}
    />
  );
}

export default Img;
