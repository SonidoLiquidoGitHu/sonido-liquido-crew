// ===========================================
// RUNWAY TASK STATUS API
// ===========================================
// GET: Poll task status and return output URLs when complete
// DELETE: Cancel a running task

import { NextRequest, NextResponse } from "next/server";
import { getTaskStatus, cancelTask } from "@/lib/clients/runway";
import { getTask, updateTask } from "@/lib/clients/runway-task-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get latest status from Runway API
    const task = await getTaskStatus(id);

    // Update our database store
    await updateTask(id, {
      status: task.status,
      output: task.output,
      error: task.error,
    });

    // Get the full task info from database (includes artistName, model, etc.)
    const localTask = await getTask(id);

    // Log status changes for debugging
    if (task.status === "FAILED") {
      console.error(`[Runway API] Task ${id} FAILED: ${task.error || "No error message"}`);
    } else if (task.status === "SUCCEEDED") {
      console.log(`[Runway API] Task ${id} SUCCEEDED with ${task.output?.length || 0} output(s)`);
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

    // Provide more user-friendly error messages
    let friendlyError = errMsg;
    if (errMsg.includes("401") || errMsg.includes("Unauthorized")) {
      friendlyError = "API key de Runway inválida o expirada. Verifica RUNWAYML_API_SECRET en Netlify.";
    } else if (errMsg.includes("404") || errMsg.includes("not found")) {
      friendlyError = "Tarea no encontrada en Runway. Puede haber expirado o el ID es incorrecto.";
    } else if (errMsg.includes("429") || errMsg.includes("rate_limit")) {
      friendlyError = "Rate limit alcanzado en Runway. Espera un momento e intenta de nuevo.";
    }

    return NextResponse.json(
      { success: false, error: friendlyError },
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
      await updateTask(id, { status: "CANCELLED" });
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
