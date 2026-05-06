"use client";

import { ArtistSelector, type Artist } from "./ArtistSelector";

interface ArtistSelectorWithDataProps {
  artists: Artist[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showRole?: boolean;
  filterRole?: string;
}

/**
 * Wrapper for ArtistSelector that accepts pre-loaded artists data
 * Use this when artists are fetched server-side
 */
export function ArtistSelectorWithData({
  artists,
  ...props
}: ArtistSelectorWithDataProps) {
  return (
    <ArtistSelector
      initialArtists={artists}
      {...props}
    />
  );
}

export default ArtistSelectorWithData;
