// ===========================================
// RUNWAY VIDEO GENERATION API
// ===========================================
// POST: Start a new video generation task
// GET: List recent generation tasks

import {
  type RunwayModel,
  type RunwayRatio,
  estimateCost,
  generateImageToVideo,
  generateTextToVideo,
  isRunwayConfigured,
} from "@/lib/clients/runway";
import { getAllTasks, storeTask } from "@/lib/clients/runway-task-store";
import { getDirectDropboxUrl, isDropboxUrl } from "@/lib/video-utils";
import { type NextRequest, NextResponse } from "next/server";

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

  console.log(
    "[Runway API] Resolving Dropbox URL for promptImage:",
    url.substring(0, 80),
  );

  try {
    const { dropboxClient } = await import("@/lib/clients/dropbox");

    // Convert to a format the metadata API can resolve
    let sharedLink = getDirectDropboxUrl(url);
    if (sharedLink.includes("raw=1")) {
      sharedLink = sharedLink
        .replace("?raw=1", "?dl=0")
        .replace("&raw=1", "&dl=0");
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
      },
    );

    if (!metaResponse.ok) {
      const errorBody = await metaResponse.text();
      console.warn(
        `[Runway API] Dropbox metadata API returned ${metaResponse.status}: ${errorBody.substring(0, 200)}`,
      );
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
      },
    );

    if (!tempLinkResponse.ok) {
      const errorBody = await tempLinkResponse.text();
      console.warn(
        `[Runway API] Dropbox temp link API returned ${tempLinkResponse.status}: ${errorBody.substring(0, 200)}`,
      );
      return url; // Fallback to original URL
    }

    const tempLinkData = await tempLinkResponse.json();
    const tempLink = tempLinkData.link;

    if (tempLink) {
      console.log(
        "[Runway API] Resolved Dropbox URL to temporary CDN link successfully",
      );
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
        { status: 500 },
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
        { status: 400 },
      );
    }

    const validDuration = Math.max(2, Math.min(10, Math.round(duration)));
    const cost = estimateCost(model as RunwayModel, validDuration);

    // Resolve the prompt image URL — Dropbox URLs must be converted to
    // temporary direct CDN links so Runway can fetch the image.
    // If resolution fails, use the image proxy as a last resort so Runway
    // gets a proper image content-type instead of Dropbox's HTML page.
    let promptImage = rawPromptImage;
    if (promptImage && isDropboxUrl(promptImage)) {
      const resolved = await resolvePromptImageUrl(promptImage);
      if (resolved === promptImage) {
        // Resolution failed — use our image proxy as a fallback
        // This ensures Runway gets an actual image, not an HTML page
        const serverPrefix =
          process.env.NEXT_PUBLIC_SERVER_URL || "https://sonidoliquido.com";
        const proxiedUrl = `${serverPrefix}/api/image-proxy?url=${encodeURIComponent(promptImage)}`;
        console.log("[Runway API] Using image proxy fallback for Dropbox URL");
        promptImage = proxiedUrl;
      } else {
        promptImage = resolved;
      }
    }

    // Generate video
    let result;
    try {
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
    } catch (genError) {
      const errMsg =
        genError instanceof Error ? genError.message : "Unknown error";
      console.error("[Runway API] Generation creation failed:", errMsg);

      // Return a user-friendly error
      let friendlyError = errMsg;
      if (
        errMsg.includes("insufficient_credits") ||
        errMsg.includes("credits")
      ) {
        friendlyError =
          "Créditos insuficientes en tu cuenta de Runway. Recarga en runwayml.com";
      } else if (errMsg.includes("invalid") && errMsg.includes("image")) {
        friendlyError =
          "La imagen de portada no se pudo cargar. Intenta con una URL directa (no Dropbox).";
      } else if (
        errMsg.includes("content_policy") ||
        errMsg.includes("safety")
      ) {
        friendlyError =
          "La imagen fue rechazada por la política de contenido de Runway.";
      }

      return NextResponse.json(
        { success: false, error: friendlyError },
        { status: 500 },
      );
    }

    // Store task info in database (persists across cold starts)
    const taskInfo = {
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
      createdAt: result.createdAt || new Date().toISOString(),
      estimatedCost: cost,
    };

    await storeTask(taskInfo);

    console.log(
      `[Runway API] Task created: ${result.id} (${model}, ${ratio}, ${validDuration}s, $${cost.usd.toFixed(2)})`,
    );

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
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    // Get tasks from database (persists across cold starts)
    const tasks = await getAllTasks();

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 },
    );
  }
}
