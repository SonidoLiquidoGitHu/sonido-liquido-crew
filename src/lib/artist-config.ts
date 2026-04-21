/**
 * Static artist configuration that supplements Spotify API data.
 * Spotify provides: name, image, followers, popularity, releases, top tracks, albums.
 * This config provides: Instagram URLs, YouTube channel IDs, and slug overrides.
 */

export interface ArtistConfig {
  /** Spotify artist ID — primary key */
  spotifyId: string;
  /** Instagram profile URL */
  instagram: string | null;
  /** YouTube channel ID (for video embeds) */
  youtubeChannelId: string | null;
  /** YouTube channel handle (e.g. @zakeuno) */
  youtubeHandle: string | null;
}

/**
 * Complete roster of Sonido Líquido Crew artists.
 * Spotify IDs match the URLs provided by the user.
 */
export const ARTIST_CONFIGS: ArtistConfig[] = [
  {
    spotifyId: "2jJmTEMkGQfH3BxoG3MQvF",
    instagram: "https://www.instagram.com/brez_idc?igsh=MTk0azBwaDl0N2pweg==",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "4fNQqyvcM71IyF2EitEtCj",
    instagram: "https://www.instagram.com/brunograssosl?igsh=MWd3YWNxcGVkemJmMQ==",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "3RAg8fPmZ8RnacJO8MhLP1",
    instagram: "https://www.instagram.com/chas7pecados?igsh=MTdhbTM3bDlsYnBkNg==",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "2zrv1oduhIYh29vvQZwI5r",
    instagram: null,
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "3eCEorgAoZkvnAQLdy4x38",
    instagram: "https://www.instagram.com/dilema_ladee?igsh=amw5ZGluNjI3ZW1k&utm_source=qr",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "5urer15JPbCELf17LVia7w",
    instagram: "https://www.instagram.com/estoesdoctordestino?igsh=MTVubWk1ZG0xMjBkNA==",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "5TMoczTLclVyzzDY5qf3Yb",
    instagram: "https://www.instagram.com/fancyfreakcorp?igsh=MXNhenBpZWJvbDczdg==",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "6AN9ek9RwrLbSp9rT2lcDG",
    instagram: null,
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ",
    instagram: "https://www.instagram.com/kev.cabrone?igsh=bTdqMG5ndjV6bWx1",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "16YScXC67nAnFDcA2LGdY0",
    instagram: "https://www.instagram.com/latingeishamx?igsh=aXU3ODdjc3lhOG9t",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc",
    instagram: "https://www.instagram.com/pepelevineonline?igsh=eGw5dzNxa2F4aDll",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "4T4Z7jvUcMV16VsslRRuC5",
    instagram: "https://www.instagram.com/q.masterw?igsh=MXg5YWt0cXk0cjJ5aA==",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ",
    instagram: null,
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "2Apt0MjZGqXAd1pl4LNQrR",
    instagram: "https://www.instagram.com/x_santa_ana?igsh=dGFyMWoxcm5sNWg4",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
  {
    spotifyId: "4WQmw3fIx9F7iPKL5v8SCN",
    instagram: "https://www.instagram.com/zaqueslc?igsh=emFhcDRmaXQ2eDUx",
    youtubeChannelId: null,
    youtubeHandle: null,
  },
];

/** Get config for a Spotify artist ID */
export function getArtistConfig(spotifyId: string): ArtistConfig | undefined {
  return ARTIST_CONFIGS.find((c) => c.spotifyId === spotifyId);
}
