import { NextRequest, NextResponse } from "next/server";
import { dropboxClient } from "@/lib/clients/dropbox";

export const dynamic = "force-dynamic";

/**
 * POST - Upload a file to Dropbox and return a shared link
 *
 * Accepts multipart/form-data with:
 *   - file: File (required)
 *   - folder: string (optional, defaults to "/uploads")
 *
 * Returns: { success: true, data: { url, filename, fileSize } }
 *
 * NOTE: This route was accidentally removed in commit 143e618 (an
 * auto-generated UUID-named commit). Without it, every component that
 * posts to /api/admin/dropbox/upload (DropboxUploadButton, DropboxUploader,
 * BulkDropboxUploader, AudioSnippetUploader, BulkAudioUploader, gallery page)
 * hits a 404 → the response body is Next.js' HTML 404 page → the client
 * sees a non-JSON response and shows the misleading
 * "Error de conexión con Dropbox. Reconecta tu cuenta" even though the
 * Dropbox account is perfectly healthy (visible on /admin/sync).
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "/uploads";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Validate file size (150MB max — Dropbox limit)
    const MAX_FILE_SIZE = 150 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `El archivo excede el límite de 150MB` },
        { status: 400 }
      );
    }

    // Sanitize folder path — ensure it starts with /
    const sanitizedFolder = folder.startsWith("/") ? folder : `/${folder}`;

    // Build the Dropbox path with a timestamp to avoid collisions
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const dropboxPath = `${sanitizedFolder}/${timestamp}_${safeName}`;

    console.log(
      `[Dropbox Upload] Uploading "${safeName}" (${(file.size / 1024 / 1024).toFixed(2)}MB) to ${dropboxPath}`
    );

    // Convert File to ArrayBuffer and upload to Dropbox
    const arrayBuffer = await file.arrayBuffer();
    const uploadResult = await dropboxClient.uploadFile(dropboxPath, arrayBuffer);

    console.log(`[Dropbox Upload] File uploaded to Dropbox, id: ${uploadResult.id}`);

    // Create a shared link so the file is publicly accessible
    let sharedUrl: string;
    try {
      sharedUrl = await dropboxClient.getSharedLink(dropboxPath);
      console.log(`[Dropbox Upload] Shared link: ${sharedUrl}`);
    } catch (linkError) {
      console.error("[Dropbox Upload] Failed to create shared link:", linkError);
      return NextResponse.json(
        {
          success: false,
          error: "El archivo se subió pero no se pudo crear el enlace público. Intenta usar la URL directa.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        url: sharedUrl,
        filename: file.name,
        fileSize: file.size,
        dropboxPath: uploadResult.path_display,
      },
    });
  } catch (error) {
    console.error("[Dropbox Upload] Error:", error);

    const message = (error as Error).message || "Error al subir archivo";

    // Provide user-friendly error for auth issues
    if (
      message.includes("expirad") ||
      message.includes("token") ||
      message.includes("401") ||
      message.includes("reconect")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Token de Dropbox expirado. Ve a Admin > Sincronización > Dropbox para reconectar.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
