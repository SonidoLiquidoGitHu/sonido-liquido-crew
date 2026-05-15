// ===========================================
// RUNWAY VIDEO GENERATION API
// ===========================================
// POST: Start a new video generation task
// GET: List recent generation tasks

import { NextRequest, NextResponse } from "next/server";
import {
  generateImageToVideo,
  generateTextToVideo,
  isRunwayConfigured,
  estimateCost,
  type RunwayModel,
  type RunwayRatio,
} from "@/lib/clients/runway";
import { taskStore } from "@/lib/clients/runway-task-store";
import { getDirectDropboxUrl, isDropboxUrl } from "@/lib/video-utils";

/**
 * Resolve a prompt image URL so Runway can fetch it.
 *
 * Dropbox shared links return HTML pages, not raw images.
 * Runway needs a publicly accessible direct image URL.
 * We resolve Dropbox URLs via the API to get a temporary CDN link
 * that has proper content-type and no CORS restrictions.
 */
async function resolvePromptImageUrl(url: string): Promise<string> {
  if (!isDropboxUrl(url)) return url;

  console.log("[Runway API] Resolving Dropbox URL for promptImage:", url.substring(0, 80));

  try {
    const { dropboxClient } = await import("@/lib/clients/dropbox");

    // Convert to a format the metadata API can resolve
    let sharedLink = getDirectDropboxUrl(url);
    if (sharedLink.includes("raw=1")) {
      sharedLink = sharedLink.replace("?raw=1", "?dl=0").replace("&raw=1", "&dl=0");
    }
    if (!sharedLink.includes("?")) {
      sharedLink += "?dl=0";
    }

    const token = await dropboxClient.getAccessToken();

    // Step 1: Get file metadata from the shared link
    const metaResponse = await fetch(
      "https://api.dropboxapi.com/2/sharing/get_shared_link_metadata",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: sharedLink }),
      }
    );

    if (!metaResponse.ok) {
      console.warn(`[Runway API] Dropbox metadata API returned ${metaResponse.status}`);
      return url; // Fallback to original URL
    }

    const metaData = await metaResponse.json();
    const filePath = metaData.path_lower || metaData.path_display;

    if (!filePath) {
      console.warn("[Runway API] Dropbox metadata did not contain a file path");
      return url; // Fallback to original URL
    }

    // Step 2: Get a temporary direct download link
    const tempLinkResponse = await fetch(
      "https://api.dropboxapi.com/2/files/get_temporary_link",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: filePath }),
      }
    );

    if (!tempLinkResponse.ok) {
      console.warn(`[Runway API] Dropbox temp link API returned ${tempLinkResponse.status}`);
      return url; // Fallback to original URL
    }

    const tempLinkData = await tempLinkResponse.json();
    const tempLink = tempLinkData.link;

    if (tempLink) {
      console.log("[Runway API] Resolved Dropbox URL to temporary CDN link");
      return tempLink;
    }

    return url; // Fallback to original URL
  } catch (err) {
    console.warn("[Runway API] Dropbox URL resolution failed:", err);
    return url; // Fallback to original URL
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check configuration
    const config = await isRunwayConfigured();
    if (!config.configured) {
      return NextResponse.json(
        { success: false, error: `Runway API not configured: ${config.error}` },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      model = "gen4_turbo",
      ratio = "720:1280",
      duration = 5,
      promptText,
      promptImage: rawPromptImage,
      artistName,
      title,
      upcomingReleaseId,
    } = body;

    if (!promptText) {
      return NextResponse.json(
        { success: false, error: "promptText is required" },
        { status: 400 }
      );
    }

    const validDuration = Math.max(2, Math.min(10, Math.round(duration)));
    const cost = estimateCost(model as RunwayModel, validDuration);

    // Resolve the prompt image URL — Dropbox URLs must be converted to
    // temporary direct CDN links so Runway can fetch the image
    let promptImage = rawPromptImage;
    if (promptImage && isDropboxUrl(promptImage)) {
      promptImage = await resolvePromptImageUrl(promptImage);
    }

    // Generate video
    let result;
    if (promptImage) {
      result = await generateImageToVideo({
        model: model as RunwayModel,
        promptText,
        promptImage,
        ratio: ratio as RunwayRatio,
        duration: validDuration,
      });
    } else {
      result = await generateTextToVideo({
        model: model as RunwayModel,
        promptText,
        ratio: ratio as RunwayRatio,
        duration: validDuration,
      });
    }

    // Store task info
    taskStore.set(result.id, {
      id: result.id,
      upcomingReleaseId,
      artistName: artistName || "Unknown",
      title: title || "Untitled",
      model: model as RunwayModel,
      ratio: ratio as RunwayRatio,
      duration: validDuration,
      promptText,
      promptImage,
      status: result.status,
      output: result.output,
      error: result.error,
      createdAt: result.createdAt,
      estimatedCost: cost,
    });

    return NextResponse.json({
      success: true,
      data: {
        taskId: result.id,
        status: result.status,
        estimatedCost: cost,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Runway API] Generation error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return all tasks, sorted by creation date (newest first)
    const tasks = Array.from(taskStore.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
