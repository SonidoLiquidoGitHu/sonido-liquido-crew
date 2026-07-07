// ===========================================
// STORRITO CLIENT (Instagram Story scheduler with clickable link stickers)
// ===========================================
//
// WHY THIS EXISTS:
// The Meta Graph API does NOT support clickable link stickers on Instagram
// Stories. The official docs state: "Publishing stickers (i.e., link, poll,
// location) is not supported." (Confirmed Dec 2024 — see
// https://stackoverflow.com/questions/78841320)
//
// Storrito is a third-party SaaS that uses Instagram's PRIVATE API (the same
// one the Instagram app uses) to schedule and post Stories WITH clickable
// link stickers, polls, mentions, location stickers, etc.
//
// This client lets SonidoLiquido route IG Story posts through Storrito when
// the user wants TRUE clickable link stickers. When STORRITO_API_KEY is not
// set, the main postToInstagramStory() function falls back to the Graph API
// (with a visual non-clickable link overlay).
//
// SETUP:
//   1. Create a Storrito account at https://storrito.com (paid, ~$20/mo for
//      a single Instagram account)
//   2. Connect your @sonidoliquido Instagram account to Storrito
//   3. Get your API key from Storrito's settings page
//   4. Set in .env.local / Netlify env vars:
//        STORRITO_API_KEY=your-key-here
//   5. The main postToInstagramStory() function will automatically detect
//      the env var and route through Storrito instead of the Graph API.
//
// NOTE: Storrito's API is undocumented as of 2026 — this client uses the
// endpoints observed in their public web UI. If they change their API, this
// file will need to be updated.

import type { InstagramPostResult } from "./meta";

const STORRITO_BASE_URL = "https://api.storrito.com/v1";

class StorritoClient {
  private envApiKey: string | null = null;

  constructor() {
    this.envApiKey = process.env.STORRITO_API_KEY || null;
  }

  /**
   * Check if Storrito is configured (env var present).
   * When this returns true, postToInstagramStory() will route through
   * Storrito. When false, it falls back to the Graph API.
   */
  isConfigured(): boolean {
    return Boolean(this.envApiKey);
  }

  /**
   * Post an Instagram Story with a TRUE clickable link sticker.
   *
   * @param imageUrl  Public URL of the story image (1080×1920 recommended)
   * @param caption   Caption text (shown as text overlay or stored as metadata)
   * @param linkUrl   URL for the clickable link sticker (required — this is
   *                  the whole point of using Storrito)
   */
  async postStoryWithLinkSticker(
    imageUrl: string,
    caption: string,
    linkUrl: string,
  ): Promise<InstagramPostResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error:
          "Storrito API key not configured. Set STORRITO_API_KEY to enable clickable link stickers.",
      };
    }

    if (!linkUrl) {
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error:
          "Storrito posting requires a linkUrl (that's the whole point of using Storrito).",
      };
    }

    try {
      // Step 1: Upload the image to Storrito
      console.log("[Storrito] Uploading story image...");
      const uploadRes = await fetch(`${STORRITO_BASE_URL}/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.envApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageUrl,
        }),
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(
          `Upload failed: HTTP ${uploadRes.status} - ${errText.substring(0, 200)}`,
        );
      }

      const uploadData = await uploadRes.json();
      const mediaId = uploadData.id || uploadData.media_id;
      if (!mediaId) {
        throw new Error("Storrito upload response missing media id");
      }

      // Step 2: Schedule the story with a link sticker
      // Schedule for "now" (immediate post) — Storrito will post within ~1 min
      console.log("[Storrito] Scheduling story with link sticker...");
      const scheduleRes = await fetch(`${STORRITO_BASE_URL}/stories`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.envApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_id: mediaId,
          caption: caption || "",
          // Link sticker — the whole point of using Storrito
          link_sticker: {
            url: linkUrl,
          },
          // Schedule for immediate posting
          scheduled_at: new Date().toISOString(),
        }),
      });

      if (!scheduleRes.ok) {
        const errText = await scheduleRes.text();
        throw new Error(
          `Schedule failed: HTTP ${scheduleRes.status} - ${errText.substring(0, 200)}`,
        );
      }

      const scheduleData = await scheduleRes.json();
      const storyId = scheduleData.id || scheduleData.story_id;

      console.log(
        `[Storrito] Story scheduled successfully: id=${storyId}, link=${linkUrl.substring(0, 60)}`,
      );

      return {
        success: true,
        mediaId: String(storyId),
        permalink: null, // Stories don't have public permalinks
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown Storrito error";
      console.error("[Storrito] Error:", msg);
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: `Storrito error: ${msg}`,
      };
    }
  }
}

export const storritoClient = new StorritoClient();
