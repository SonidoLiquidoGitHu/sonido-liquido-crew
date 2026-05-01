"use client";

import { useState, useEffect } from "react";

export interface CrewSocialLinks {
  spotifyUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  facebookUrl: string;
}

// Sensible defaults used while loading or if the API fails
const defaultLinks: CrewSocialLinks = {
  spotifyUrl: "https://open.spotify.com/playlist/5qHTKCZIwi3GM3mhPq45Ab",
  youtubeUrl: "https://www.youtube.com/@sonidoliquidocrew",
  instagramUrl: "https://www.instagram.com/sonidoliquido/",
  facebookUrl: "https://www.facebook.com/sonidoliquidocrew/",
};

/**
 * Hook to fetch crew-level social links from the site_settings DB.
 * Falls back to defaults if the API is unreachable.
 */
export function useCrewSocialLinks() {
  const [links, setLinks] = useState<CrewSocialLinks>(defaultLinks);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchLinks = async () => {
      try {
        const res = await fetch("/api/site/social-links");
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setLinks(json.data);
        }
      } catch {
        // Keep defaults on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLinks();

    return () => {
      cancelled = true;
    };
  }, []);

  return { links, loading };
}
