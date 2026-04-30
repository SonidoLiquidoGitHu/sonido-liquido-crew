interface SpotifyEmbedProps {
  type: "artist" | "album" | "track" | "playlist";
  id: string;
  theme?: "dark" | "light";
  height?: number;
  compact?: boolean;
}

export function SpotifyEmbed({
  type,
  id,
  theme = "dark",
  height,
  compact = false,
}: SpotifyEmbedProps) {
  const baseUrl = `https://open.spotify.com/embed/${type}/${id}`;
  const params = new URLSearchParams({
    utm_source: "generator",
    theme: theme === "dark" ? "0" : "1",
  });

  // Default heights based on type
  const defaultHeights: Record<string, number> = {
    artist: compact ? 152 : 352,
    album: compact ? 152 : 352,
    track: compact ? 80 : 152,
    playlist: compact ? 152 : 352,
  };

  const embedHeight = height || defaultHeights[type];

  return (
    <div className="spotify-embed">
      <iframe
        src={`${baseUrl}?${params.toString()}`}
        width="100%"
        height={embedHeight}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ borderRadius: "12px" }}
        title={`Spotify ${type}`}
      />
    </div>
  );
}
