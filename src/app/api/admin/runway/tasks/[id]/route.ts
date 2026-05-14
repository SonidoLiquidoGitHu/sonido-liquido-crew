// ===========================================
// RUNWAY TASK STATUS API
// ===========================================
// GET: Poll task status and return output URLs when complete
// DELETE: Cancel a running task

import { NextRequest, NextResponse } from "next/server";
import { getTaskStatus, cancelTask } from "@/lib/clients/runway";
import { taskStore } from "@/lib/clients/runway-task-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get latest status from Runway API
    const task = await getTaskStatus(id);

    // Update our local store
    const localTask = taskStore.get(id);
    if (localTask) {
      localTask.status = task.status;
      localTask.output = task.output;
      localTask.error = task.error;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
        status: task.status,
        output: task.output,
        error: task.error,
        progress: task.progress,
        createdAt: task.createdAt,
        localTaskInfo: localTask
          ? {
              artistName: localTask.artistName,
              title: localTask.title,
              model: localTask.model,
              ratio: localTask.ratio,
              duration: localTask.duration,
              estimatedCost: localTask.estimatedCost,
            }
          : undefined,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Runway API] Task status error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cancelled = await cancelTask(id);

    if (cancelled) {
      const localTask = taskStore.get(id);
      if (localTask) {
        localTask.status = "CANCELLED";
      }
    }

    return NextResponse.json({
      success: cancelled,
      data: { id, cancelled },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
