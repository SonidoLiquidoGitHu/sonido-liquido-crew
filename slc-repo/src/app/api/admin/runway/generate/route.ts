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
      promptImage,
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
