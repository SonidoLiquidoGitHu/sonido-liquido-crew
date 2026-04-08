// ===========================================
// API CLIENTS INDEX
// ===========================================

// Core integrations
export { spotifyClient, SpotifyClient } from "./spotify";
export { youtubeClient, YouTubeClient } from "./youtube";
export { dropboxClient, DropboxClient } from "./dropbox";

// Optional integrations
export { mailchimpClient, MailchimpClient, MAILCHIMP_DEFAULT_TAG } from "./mailchimp";
export { stripeClient, StripeClient } from "./stripe";

// ===========================================
// CLIENT STATUS HELPER
// ===========================================

export function getIntegrationStatus() {
  return {
    spotify: {
      configured: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
      name: "Spotify",
    },
    youtube: {
      configured: Boolean(process.env.YOUTUBE_API_KEY),
      name: "YouTube",
    },
    dropbox: {
      configured: Boolean(process.env.DROPBOX_ACCESS_TOKEN),
      name: "Dropbox",
    },
    mailchimp: {
      configured: Boolean(
        process.env.MAILCHIMP_API_KEY &&
        process.env.MAILCHIMP_SERVER_PREFIX &&
        process.env.MAILCHIMP_AUDIENCE_ID
      ),
      name: "Mailchimp",
      optional: true,
    },
    stripe: {
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      name: "Stripe",
      optional: true,
    },
  };
}
