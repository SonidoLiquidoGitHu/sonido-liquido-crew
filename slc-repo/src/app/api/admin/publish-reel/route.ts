// ===========================================
// ADMIN API: PUBLISH REEL
// POST — Publish a vertical video as Reel to Instagram and/or Facebook
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import {
  isMetaConfigured,
  postReelToInstagram,
  postReelToFacebook,
  ensurePublicImageUrl,
} from "@/lib/clients/meta";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — video processing can take time

interface PublishReelRequest {
  videoUrl: string;
  caption: string;
  platforms: ("instagram" | "facebook")[];
  releaseId?: string;
  releaseTitle?: string;
  artistName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PublishReelRequest = await request.json();
    const { videoUrl, caption, platforms, releaseId, releaseTitle, artistName } = body;

    // Validate required fields
    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: "videoUrl is required" },
        { status: 400 }
      );
    }

    if (!caption) {
      return NextResponse.json(
        { success: false, error: "caption is required" },
        { status: 400 }
      );
    }

    if (!platforms || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one platform must be selected" },
        { status: 400 }
      );
    }

    // Check Meta API configuration
    if (!isMetaConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Meta API not configured. Set META_SYSTEM_USER_TOKEN and FACEBOOK_PAGE_ID env vars.",
        },
        { status: 500 }
      );
    }

    // Ensure the video URL is publicly accessible
    const publicVideoUrl = ensurePublicImageUrl(videoUrl);

    console.log(
      `[Publish Reel] Publishing reel for "${releaseTitle || "unknown"}" by ${artistName || "unknown"} to ${platforms.join(", ")}`
    );
    console.log(`[Publish Reel] Video URL: ${publicVideoUrl.substring(0, 100)}`);
    console.log(`[Publish Reel] Caption length: ${caption.length} chars`);

    const results: {
      instagram?: { success: boolean; mediaId?: string; permalink?: string; error?: string };
      facebook?: { success: boolean; postId?: string; postUrl?: string; error?: string };
    } = {};

    let anySuccess = false;
    const errors: string[] = [];

    // Publish to Instagram Reels
    if (platforms.includes("instagram")) {
      console.log("[Publish Reel] Starting Instagram Reels publish...");
      try {
        const igResult = await postReelToInstagram(publicVideoUrl, caption, true);
        results.instagram = {
          success: igResult.success,
          mediaId: igResult.mediaId || undefined,
          permalink: igResult.permalink || undefined,
          error: igResult.error || undefined,
        };

        if (igResult.success) {
          anySuccess = true;
          console.log(`[Publish Reel] Instagram Reel published: ${igResult.mediaId}`);
        } else {
          errors.push(`Instagram: ${igResult.error}`);
          console.error(`[Publish Reel] Instagram Reel failed: ${igResult.error}`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        results.instagram = { success: false, error: errMsg };
        errors.push(`Instagram: ${errMsg}`);
        console.error("[Publish Reel] Instagram exception:", errMsg);
      }
    }

    // Publish to Facebook Reels
    if (platforms.includes("facebook")) {
      console.log("[Publish Reel] Starting Facebook Reels publish...");
      try {
        const fbResult = await postReelToFacebook(publicVideoUrl, caption);
        results.facebook = {
          success: fbResult.success,
          postId: fbResult.postId || undefined,
          postUrl: fbResult.postUrl || undefined,
          error: fbResult.error || undefined,
        };

        if (fbResult.success) {
          anySuccess = true;
          console.log(`[Publish Reel] Facebook Reel published: ${fbResult.postId}`);
        } else {
          errors.push(`Facebook: ${fbResult.error}`);
          console.error(`[Publish Reel] Facebook Reel failed: ${fbResult.error}`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        results.facebook = { success: false, error: errMsg };
        errors.push(`Facebook: ${errMsg}`);
        console.error("[Publish Reel] Facebook exception:", errMsg);
      }
    }

    // Build response
    const successPlatforms: string[] = [];
    if (results.instagram?.success) successPlatforms.push("Instagram Reels");
    if (results.facebook?.success) successPlatforms.push("Facebook Reels");

    const failedPlatforms: string[] = [];
    if (platforms.includes("instagram") && !results.instagram?.success) failedPlatforms.push("Instagram");
    if (platforms.includes("facebook") && !results.facebook?.success) failedPlatforms.push("Facebook");

    return NextResponse.json({
      success: anySuccess,
      message: anySuccess
        ? `Reel publicado exitosamente en: ${successPlatforms.join(", ")}${failedPlatforms.length > 0 ? `. Falló en: ${failedPlatforms.join(", ")}` : ""}`
        : `Error al publicar Reel: ${errors.join(" | ")}`,
      results,
      successPlatforms,
      failedPlatforms,
    });
  } catch (error) {
    console.error("[Publish Reel] Unhandled error:", error);

    // Handle the case where the request body is not valid JSON
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}
