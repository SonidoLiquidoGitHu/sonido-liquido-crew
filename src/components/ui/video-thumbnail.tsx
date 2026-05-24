"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import {
  getProxiedThumbnailUrl,
  getProxiedVideoSrc,
  getYouTubeId,
  isYouTubeThumbnailUrl,
  getYouTubeThumbnailFallback,
  getVideoPlaceholderSvg,
  isDirectVideo,
  type VideoLike,
} from "@/lib/video-utils";

interface VideoThumbnailProps {
  video: VideoLike;
  alt?: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  /** Aspect ratio for the container (default: "9/16") */
  aspectRatio?: "9/16" | "16/9";
  /** Whether to show play button overlay */
  showPlayOverlay?: boolean;
  /** Additional content to render on top (e.g. title, artist) */
  overlay?: React.ReactNode;
}

/**
 * VideoThumbnail - A unified component for displaying video thumbnails.
 *
 * Resolution order:
 * 1. If the video has a thumbnail URL → use SafeImage (with YouTube tiered fallback)
 * 2. If the video is a direct/Uploaded video (Dropbox) → use <video> element
 *    that auto-renders the first frame as a "poster" (browsers do this natively
 *    when preload="metadata" is set and the video is paused)
 * 3. Fallback → placeholder SVG
 *
 * This fixes the issue where vertical videos uploaded from mobile don't show
 * thumbnails because client-side canvas extraction often fails on mobile browsers
 * due to H.264 hardware decoder latency.
 */
export function VideoThumbnail({
  video,
  alt = "Video",
  fill = true,
  className = "",
  sizes,
  aspectRatio = "9/16",
  showPlayOverlay = false,
  overlay,
}: VideoThumbnailProps) {
  const thumbnailUrl = getProxiedThumbnailUrl(video);
  const hasThumbnail = Boolean(thumbnailUrl);
  const isDirect = isDirectVideo(video);
  const videoSrc = getProxiedVideoSrc(video);

  // If we have a thumbnail image, use SafeImage
  if (hasThumbnail) {
    return (
      <div className={`relative ${fill ? "absolute inset-0" : ""} ${className}`}>
        <SafeImage
          src={thumbnailUrl!}
          alt={alt}
          fill={fill}
          className="object-cover"
          sizes={sizes}
          fallbackSrc={(() => {
            const ytId = getYouTubeId(video);
            if (ytId && isYouTubeThumbnailUrl(thumbnailUrl!)) {
              return getYouTubeThumbnailFallback(ytId, thumbnailUrl!) || getVideoPlaceholderSvg(aspectRatio);
            }
            return getVideoPlaceholderSvg(aspectRatio);
          })()}
        />
        {showPlayOverlay && <PlayOverlay />}
        {overlay}
      </div>
    );
  }

  // If it's a direct video (Dropbox upload) without a thumbnail,
  // use a <video> element that auto-renders the first frame
  if (isDirect && videoSrc) {
    return (
      <VideoFrameFallback
        videoSrc={videoSrc}
        alt={alt}
        fill={fill}
        className={className}
        aspectRatio={aspectRatio}
        showPlayOverlay={showPlayOverlay}
        overlay={overlay}
      />
    );
  }

  // Final fallback: placeholder
  return (
    <div className={`relative ${fill ? "absolute inset-0" : ""} ${className}`}>
      <div className="w-full h-full bg-gradient-to-br from-slc-card to-slc-dark flex items-center justify-center">
        <svg
          className="w-12 h-12 text-slc-border/50"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      {showPlayOverlay && <PlayOverlay />}
      {overlay}
    </div>
  );
}

/**
 * PlayOverlay - A semi-transparent play button overlay
 */
function PlayOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
        <svg className="w-6 h-6 text-white ml-0.5" viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

/**
 * VideoFrameFallback - Uses a <video> element to render the first frame
 * as a thumbnail when no static thumbnail image is available.
 *
 * How it works:
 * 1. Creates a <video> element with preload="metadata"
 * 2. When the first frame is loaded, seeks to a specific time (0.5s)
 * 3. The browser renders the video frame as the "poster"
 * 4. We overlay a canvas-captured frame for better quality on some browsers
 *
 * This approach is reliable because the browser's native video decoder
 * handles the frame extraction - no FFmpeg or canvas workarounds needed.
 */
function VideoFrameFallback({
  videoSrc,
  alt,
  fill,
  className,
  aspectRatio,
  showPlayOverlay,
  overlay,
}: {
  videoSrc: string;
  alt: string;
  fill: boolean;
  className: string;
  aspectRatio: "9/16" | "16/9" | "1/1";
  showPlayOverlay: boolean;
  overlay?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameCaptured, setFrameCaptured] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use the video's natural dimensions, scaled down for performance
    const maxDim = 720;
    const scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight, 1);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFrameCaptured(true);
  }, []);

  // When video metadata loads, seek to a good frame position
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setVideoLoaded(true);
      // Seek to 0.5s for a better frame than the very first frame
      // (which might be black or a loading screen)
      if (video.duration > 1) {
        video.currentTime = 0.5;
      } else {
        // Very short video - capture immediately
        captureFrame();
      }
    };

    const handleSeeked = () => {
      // Small delay to let the frame composite after seek
      setTimeout(captureFrame, 200);
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("seeked", handleSeeked);

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [captureFrame]);

  // Fallback: If video fails to load, show placeholder
  const [videoError, setVideoError] = useState(false);

  if (videoError) {
    return (
      <div className={`relative ${fill ? "absolute inset-0" : ""} ${className}`}>
        <div className="w-full h-full bg-gradient-to-br from-slc-card to-slc-dark flex items-center justify-center">
          <svg className="w-12 h-12 text-slc-border/50" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        {showPlayOverlay && <PlayOverlay />}
        {overlay}
      </div>
    );
  }

  return (
    <div className={`relative ${fill ? "absolute inset-0" : ""} ${className}`}>
      {/* Hidden video element for frame extraction */}
      <video
        ref={videoRef}
        src={videoSrc}
        preload="metadata"
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: frameCaptured ? 0 : 1 }}
        onError={() => setVideoError(true)}
      />

      {/* Canvas with captured frame (better quality than raw video) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: frameCaptured ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Loading state while video frame is being extracted */}
      {!videoLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slc-card to-slc-dark flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-slc-border border-t-primary animate-spin" />
        </div>
      )}

      {showPlayOverlay && <PlayOverlay />}
      {overlay}
    </div>
  );
}
