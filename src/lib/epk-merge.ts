/**
 * EPK Merge Utility
 * 
 * Merges Artist and EPK data with EPK priority.
 * When both have the same field, EPK wins.
 * When EPK is empty, Artist data is used as fallback.
 * 
 * This ensures that info entered via the Artists section
 * is reflected in the EPK public page, but EPK-specific
 * edits always take precedence.
 */

import type { Artist } from "@/db/schema/artists";
import type { ArtistEpk } from "@/db/schema/epk";

type JsonArray = unknown[];

function parseJson<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim() === "";
}

function hasItems(value: string | null | undefined): boolean {
  if (!value) return false;
  const parsed = parseJson<JsonArray>(value, []);
  return Array.isArray(parsed) && parsed.length > 0;
}

/**
 * Merged EPK data — combines Artist + EPK with EPK priority.
 * This is what the public EPK page should use for rendering.
 */
export interface MergedEpkData {
  // Identity
  tagline: string | null;
  genreSpecific: string | null;
  subgenres: string[];
  artistType: string | null;

  // Bios — EPK has 3 bio levels, Artist has 2
  bioShort: string | null;
  bioLong: string | null;
  bioPress: string | null;
  storyHighlights: unknown[];

  // Visual Identity (EPK-only, no merge needed)
  logoUrl: string | null;
  logoTransparentUrl: string | null;
  logoWhiteUrl: string | null;
  logoBlackUrl: string | null;
  brandColors: string[];
  brandFont: string | null;

  // Streaming Stats (EPK-only numeric fields, no merge needed)
  spotifyMonthlyListeners: number | null;
  spotifyFollowers: number | null;
  spotifyTopTrack: unknown | null;
  appleMusicUrl: string | null;
  youtubeSubscribers: number | null;
  youtubeTotalViews: number | null;
  instagramFollowers: number | null;
  tiktokFollowers: number | null;
  totalStreams: number | null;
  streamingHighlights: unknown[];

  // Press (EPK-only, no Artist equivalent)
  pressFeatures: unknown[];
  blogMentions: unknown[];
  interviewUrls: unknown[];

  // Playlists (EPK-only)
  editorialPlaylists: unknown[];
  curatedPlaylists: unknown[];

  // Shows (EPK-only)
  pastShows: unknown[];
  festivalAppearances: unknown[];
  notableVenues: unknown[];
  tourHistory: unknown[];

  // Collaborations (EPK-only)
  collaborations: unknown[];
  producerCredits: unknown[];
  remixCredits: unknown[];

  // Music (EPK-only)
  topTracks: unknown[];
  latestRelease: unknown | null;
  upcomingRelease: unknown | null;

  // Videos — EPK has detailed video fields; Artist has featuredVideos
  officialMusicVideos: unknown[];
  livePerformanceVideos: unknown[];
  featuredVideo: unknown | null;
  visualizerVideos: unknown[];
  behindTheScenes: unknown[];

  // Press Quotes — both Artist and EPK have this
  pressQuotes: unknown[];

  // Testimonials (EPK-only)
  artistEndorsements: unknown[];
  industryTestimonials: unknown[];

  // Contact — both Artist and EPK have some of these
  bookingEmail: string | null;
  bookingPhone: string | null;
  managementName: string | null;
  managementEmail: string | null;
  managementPhone: string | null;
  publicistName: string | null;
  publicistEmail: string | null;
  labelName: string | null;
  labelContact: string | null;

  // Technical Rider (EPK-only)
  performanceFormat: string | null;
  setLengthOptions: number[];
  technicalRequirements: unknown | null;
  backlineNeeds: unknown | null;
  stageRequirements: string | null;
  hospitalityRider: string | null;
  travelRequirements: string | null;

  // Downloads (EPK-only)
  pressKitPdfUrl: string | null;
  hiResPhotosZipUrl: string | null;
  logoPackZipUrl: string | null;
  technicalRiderPdfUrl: string | null;
  stageplotUrl: string | null;

  // Labels (from Artist.labels → fallback for EPK.labelName)
  labels: string[];

  // Year started (Artist-only, useful for EPK display)
  yearStarted: number | null;

  // Location (Artist-only, useful for EPK display)
  location: string | null;

  // Country (Artist-only)
  country: string | null;
}

/**
 * Merge Artist and EPK data with EPK priority.
 * 
 * Priority: EPK field > Artist field > null
 * For array fields (pressQuotes, etc.): EPK items come first, then Artist items not already present
 */
export function mergeArtistEpk(artist: Artist, epk: ArtistEpk | null): MergedEpkData {
  // Helper: merge two JSON arrays, EPK items first, deduplicated
  function mergeJsonArrays<T extends { source?: string }>(
    epkValue: string | null | undefined,
    artistValue: string | null | undefined
  ): T[] {
    const epkItems = parseJson<T[]>(epkValue, []);
    const artistItems = parseJson<T[]>(artistValue, []);

    if (epkItems.length > 0 && artistItems.length > 0) {
      // Both have items — combine, EPK first, dedup by quote+source or just add all
      return [...epkItems, ...artistItems];
    }
    if (epkItems.length > 0) return epkItems;
    if (artistItems.length > 0) return artistItems;
    return [];
  }

  // Helper: string field with EPK priority
  function mergeString(epkVal: string | null | undefined, artistVal: string | null | undefined): string | null {
    if (!isEmpty(epkVal)) return epkVal!;
    if (!isEmpty(artistVal)) return artistVal!;
    return null;
  }

  return {
    // Identity
    tagline: mergeString(epk?.tagline, null),
    genreSpecific: mergeString(epk?.genreSpecific, artist.genres ? parseJson<string[]>(artist.genres, []).join(", ") : null),
    subgenres: parseJson<string[]>(epk?.subgenres, []),
    artistType: epk?.artistType || null,

    // Bios
    bioShort: mergeString(epk?.bioShort, artist.shortBio),
    bioLong: mergeString(epk?.bioLong, artist.bio),
    bioPress: mergeString(epk?.bioPress, artist.bio),
    storyHighlights: parseJson<unknown[]>(epk?.storyHighlights, []),

    // Visual Identity
    logoUrl: epk?.logoUrl || null,
    logoTransparentUrl: epk?.logoTransparentUrl || null,
    logoWhiteUrl: epk?.logoWhiteUrl || null,
    logoBlackUrl: epk?.logoBlackUrl || null,
    brandColors: parseJson<string[]>(epk?.brandColors, []),
    brandFont: epk?.brandFont || null,

    // Streaming Stats
    spotifyMonthlyListeners: epk?.spotifyMonthlyListeners || artist.monthlyListeners || null,
    spotifyFollowers: epk?.spotifyFollowers || null,
    spotifyTopTrack: epk?.spotifyTopTrack ? parseJson(epk?.spotifyTopTrack, null) : null,
    appleMusicUrl: epk?.appleMusicUrl || null,
    youtubeSubscribers: epk?.youtubeSubscribers || null,
    youtubeTotalViews: epk?.youtubeTotalViews || null,
    instagramFollowers: epk?.instagramFollowers || null,
    tiktokFollowers: epk?.tiktokFollowers || null,
    totalStreams: epk?.totalStreams || null,
    streamingHighlights: parseJson<unknown[]>(epk?.streamingHighlights, []),

    // Press
    pressFeatures: parseJson<unknown[]>(epk?.pressFeatures, []),
    blogMentions: parseJson<unknown[]>(epk?.blogMentions, []),
    interviewUrls: parseJson<unknown[]>(epk?.interviewUrls, []),

    // Playlists
    editorialPlaylists: parseJson<unknown[]>(epk?.editorialPlaylists, []),
    curatedPlaylists: parseJson<unknown[]>(epk?.curatedPlaylists, []),

    // Shows
    pastShows: parseJson<unknown[]>(epk?.pastShows, []),
    festivalAppearances: parseJson<unknown[]>(epk?.festivalAppearances, []),
    notableVenues: parseJson<unknown[]>(epk?.notableVenues, []),
    tourHistory: parseJson<unknown[]>(epk?.tourHistory, []),

    // Collaborations
    collaborations: parseJson<unknown[]>(epk?.collaborations, []),
    producerCredits: parseJson<unknown[]>(epk?.producerCredits, []),
    remixCredits: parseJson<unknown[]>(epk?.remixCredits, []),

    // Music
    topTracks: parseJson<unknown[]>(epk?.topTracks, []),
    latestRelease: epk?.latestRelease ? parseJson(epk?.latestRelease, null) : null,
    upcomingRelease: epk?.upcomingRelease ? parseJson(epk?.upcomingRelease, null) : null,

    // Videos — if EPK has no videos but Artist has featuredVideos, use those
    officialMusicVideos: hasItems(epk?.officialMusicVideos)
      ? parseJson<unknown[]>(epk?.officialMusicVideos, [])
      : parseJson<unknown[]>(artist.featuredVideos, []),
    livePerformanceVideos: parseJson<unknown[]>(epk?.livePerformanceVideos, []),
    featuredVideo: epk?.featuredVideo ? parseJson(epk?.featuredVideo, null) : null,
    visualizerVideos: parseJson<unknown[]>(epk?.visualizerVideos, []),
    behindTheScenes: parseJson<unknown[]>(epk?.behindTheScenes, []),

    // Press Quotes — merge both sources, EPK first
    pressQuotes: mergeJsonArrays(epk?.pressQuotes, artist.pressQuotes),

    // Testimonials
    artistEndorsements: parseJson<unknown[]>(epk?.artistEndorsements, []),
    industryTestimonials: parseJson<unknown[]>(epk?.industryTestimonials, []),

    // Contact
    bookingEmail: mergeString(epk?.bookingEmail, artist.bookingEmail),
    bookingPhone: epk?.bookingPhone || null,
    managementName: epk?.managementName || null,
    managementEmail: mergeString(epk?.managementEmail, artist.managementEmail),
    managementPhone: epk?.managementPhone || null,
    publicistName: epk?.publicistName || null,
    publicistEmail: mergeString(epk?.publicistEmail, artist.pressEmail),
    labelContact: epk?.labelContact || null,

    // Labels — EPK labelName is a string, Artist labels is JSON array
    labelName: mergeString(
      epk?.labelName,
      artist.labels ? parseJson<string[]>(artist.labels, []).join(" / ") : null
    ),
    labels: parseJson<string[]>(artist.labels, []),

    // Technical Rider
    performanceFormat: epk?.performanceFormat || null,
    setLengthOptions: parseJson<number[]>(epk?.setLengthOptions, []),
    technicalRequirements: epk?.technicalRequirements ? parseJson(epk?.technicalRequirements, null) : null,
    backlineNeeds: epk?.backlineNeeds ? parseJson(epk?.backlineNeeds, null) : null,
    stageRequirements: epk?.stageRequirements || null,
    hospitalityRider: epk?.hospitalityRider || null,
    travelRequirements: epk?.travelRequirements || null,

    // Downloads
    pressKitPdfUrl: epk?.pressKitPdfUrl || null,
    hiResPhotosZipUrl: epk?.hiResPhotosZipUrl || null,
    logoPackZipUrl: epk?.logoPackZipUrl || null,
    technicalRiderPdfUrl: epk?.technicalRiderPdfUrl || null,
    stageplotUrl: epk?.stageplotUrl || null,

    // From Artist
    yearStarted: artist.yearStarted || null,
    location: artist.location || null,
    country: artist.country || null,
  };
}
