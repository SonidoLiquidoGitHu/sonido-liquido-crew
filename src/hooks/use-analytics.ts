"use client";

import { useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

interface TrackEventOptions {
  type: "pageview" | "event";
  page?: string;
  event?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

// Track an event
export async function trackEvent(options: TrackEventOptions): Promise<void> {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.debug("[Analytics] Failed to track:", error);
  }
}

// Track a page view
export function trackPageView(page: string, metadata?: Record<string, unknown>): void {
  trackEvent({
    type: "pageview",
    page,
    metadata,
  });
}

// Hook to automatically track page views
export function usePageViewTracking(additionalMetadata?: Record<string, unknown>): void {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      trackPageView(pathname, {
        ...additionalMetadata,
        title: typeof document !== "undefined" ? document.title : undefined,
      });
    }
  }, [pathname, additionalMetadata]);
}

// Hook for custom event tracking
export function useEventTracking() {
  const track = useCallback((
    event: string,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, unknown>
  ) => {
    trackEvent({
      type: "event",
      event,
      entityType,
      entityId,
      metadata,
    });
  }, []);

  return { track };
}

// Pre-built tracking functions for common events
export const Analytics = {
  // Press kit events
  pressKitView: () => trackEvent({
    type: "event",
    event: "press_kit_view",
    entityType: "press",
  }),

  pressKitDownload: (format: string) => trackEvent({
    type: "event",
    event: "press_kit_download",
    entityType: "press",
    metadata: { format },
  }),

  pressArtistView: (artistSlug: string) => trackEvent({
    type: "event",
    event: "press_artist_view",
    entityType: "artist",
    entityId: artistSlug,
  }),

  // Media release events
  mediaReleaseView: (releaseSlug: string) => trackEvent({
    type: "event",
    event: "media_release_view",
    entityType: "media_release",
    entityId: releaseSlug,
  }),

  // Download events
  assetDownload: (assetType: string, assetId: string) => trackEvent({
    type: "event",
    event: "asset_download",
    entityType: assetType,
    entityId: assetId,
  }),

  // Contact events
  pressContactClick: (contactType: string) => trackEvent({
    type: "event",
    event: "press_contact_click",
    entityType: "contact",
    metadata: { contactType },
  }),
};
