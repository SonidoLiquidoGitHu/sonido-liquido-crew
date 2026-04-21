/**
 * Static artist configuration that supplements Spotify API data.
 * Spotify provides: name, image, followers, popularity, releases, top tracks, albums.
 * This config provides: Instagram URLs, YouTube channel IDs, and handles.
 */

export interface ArtistConfig {
  /** Spotify artist ID — primary key */
  spotifyId: string;
  /** Instagram profile URL */
  instagram: string | null;
  /** YouTube channel ID (for video search & channel links) */
  youtubeChannelId: string | null;
  /** YouTube channel handle (e.g. @zakeuno) */
  youtubeHandle: string | null;
}

/**
 * Complete roster of Sonido Líquido Crew artists.
 * Spotify IDs match the URLs provided by the user.
 *
 * YouTube channels found:
 * - Zaque:              UCXLJPF4RRLT4aoVJkXG80bg
 * - SonidoLíquido Crew: UCy6tHVzGmZ_ehIBWcdrTuRA (main crew channel)
 * - Brez:               UCxVg9-xrVGfjtRd_N32EuTA
 * - Doctor Destino:     UCGXC-OtIZ7PHOHBKZTE4mIw
 * - Latin Geisha:       UCZvZ8tbIZKt9IzO42Y8_gtw
 *
 * Artists without individual channels publish through the SLC crew channel.
 */
export const ARTIST_CONFIGS: ArtistConfig[] = [
  {
    spotifyId: "2jJmTEMkGQfH3BxoG3MQvF",
    instagram: "https://www.instagram.com/brez_idc?igsh=MTk0azBwaDl0N2pweg==",
    youtubeChannelId: "UCxVg9-xrVGfjtRd_N32EuTA",
    youtubeHandle: "@brezhiphopmexicoslc25",
  },
  {
    spotifyId: "4fNQqyvcM71IyF2EitEtCj",
    instagram: "https://www.instagram.com/brunograssosl?igsh=MWd3YWNxcGVkemJmMQ==",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", // SLC crew channel
    youtubeHandle: "@sonidoliquidocrew",
  },
  {
    spotifyId: "3RAg8fPmZ8RnacJO8MhLP1",
    instagram: "https://www.instagram.com/chas7pecados?igsh=MTdhbTM3bDlsYnBkNg==",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", // SLC crew channel
    youtubeHandle: "@sonidoliquidocrew",
  },
  {
    spotifyId: "2zrv1oduhIYh29vvQZwI5r",
    instagram: "https://www.instagram.com/ilikebigbuds_i_canot_lie/",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", // SLC crew channel
    youtubeHandle: "@sonidoliquidocrew",
  },
  {
    spotifyId: "3eCEorgAoZkvnAQLdy4x38",
    instagram: "https://www.instagram.com/dilema_ladee?igsh=amw5ZGluNjI3ZW1k&utm_source=qr",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", // SLC crew channel
    youtubeHandle: "@sonidoliquidocrew",
  },
  {
    spotifyId: "5urer15JPbCELf17LVia7w",
    instagram: "https://www.instagram.com/estoesdoctordestino?igsh=MTVubWk1ZG0xMjBkNA==",
    youtubeChannelId: "UCGXC-OtIZ7PHOHBKZTE4mIw",
    youtubeHandle: "@doctordestinohiphop",
  },
  {
    spotifyId: "5TMoczTLclVyzzDY5qf3Yb",
    instagram: "https://www.instagram.com/fancyfreakcorp?igsh=MXNhenBpZWJvbDczdg==",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", // SLC crew channel
    youtubeHandle: "@sonidoliquidocrew",
  },
  {
    spotifyId: "6AN9ek9RwrLbSp9rT2lcDG",
    instagram: "https://www.instagram.com/hassyel_s.l.c/",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", // SLC crew channel
    youtubeHandle: "@sonidoliquidocrew",
  },
  {
    spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ",
    instagram: "https://www.instagram.com/kev.cabrone?igsh=bTdqMG5ndjV6bWx1",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", // SLC crew channel
    youtubeHandle: "@sonidoliquidocrew",
  },
  {
    spotifyId: "16YScXC67nAnFDcA2LGdY0",
    instagram: "https://www.instagram.com/latingeishamx?igsh=aXU3ODdjc3lhOG9t",
    youtubeChannelId: "UCZvZ8tbIZKt9IzO42Y8_gtw",
    youtubeHandle: "@LatinGeisha",
  },
  {
    spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc",
    instagram: "https://www.instagram.com/pepelevineonline?igsh=eGw5dzNxa2F4aDll",
    youtubeChannelId: "UCXLJPF4RRLT4aoVJkXG80bg", // Zaque's channel (Pepe Levine releases here)
    youtubeHandle: "@ZaqueSonidoLiquido",
  },
  {
    spotifyId: "4T4Z7jvUcMV16VsslRRuC5",
    instagram: "https://www.instagram.com/q.masterw?igsh=MXg5YWt0cXk0cjJ5aA==",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", // SLC crew channel
    youtubeHandle: "@sonidoliquidocrew",
  },
  {
    spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ",
    instagram: "https://www.instagram.com/reickuno/",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", // SLC crew channel
    youtubeHandle: "@sonidoliquidocrew",
  },
  {
    spotifyId: "2Apt0MjZGqXAd1pl4LNQrR",
    instagram: "https://www.instagram.com/x_santa_ana?igsh=dGFyMWoxcm5sNWg4",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", // SLC crew channel
    youtubeHandle: "@sonidoliquidocrew",
  },
  {
    spotifyId: "4WQmw3fIx9F7iPKL5v8SCN",
    instagram: "https://www.instagram.com/zaqueslc?igsh=emFhcDRmaXQ2eDUx",
    youtubeChannelId: "UCXLJPF4RRLT4aoVJkXG80bg",
    youtubeHandle: "@ZaqueSonidoLiquido",
  },
];

/** Get config for a Spotify artist ID */
export function getArtistConfig(spotifyId: string): ArtistConfig | undefined {
  return ARTIST_CONFIGS.find((c) => c.spotifyId === spotifyId);
}
