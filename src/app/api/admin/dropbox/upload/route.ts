// ===========================================
// DROPBOX FILE UPLOAD API
// ===========================================
// Handles file uploads from admin components:
// - Gallery image uploads
// - Beat/track audio uploads
// - Event image uploads
// - Any file that needs to be stored on Dropbox
//
// Flow:
// 1. Receive FormData with file + folder path
// 2. Get Dropbox access token (auto-refreshes if expired)
// 3. Upload file to Dropbox via API
// 4. Create a shared link for public access
// 5. Return the shared URL

import { NextRequest, NextResponse } from "next/server";
import { dropboxClient } from "@/lib/clients/dropbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 second timeout for large uploads

export async function POST(request: NextRequest) {
  try {
    // Check if Dropbox is configured
    const isConfigured = await dropboxClient.isConfiguredAsync();
    if (!isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: "Dropbox no está configurado. Ve a Admin > Sincronización para conectar tu cuenta de Dropbox.",
        },
        { status: 400 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "/uploads";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Validate file size (max 150MB for server-side upload)
    const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `El archivo excede el límite de 150MB para subida por servidor. Usa la subida directa para archivos más grandes.`,
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "";
    const baseName = file.name.replace(`.${ext}`, "").replace(/[^a-zA-Z0-9-_]/g, "_");
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const filename = `${baseName}_${uniqueId}.${ext}`;

    // Normalize folder path
    const normalizedFolder = folder.startsWith("/") ? folder : `/${folder}`;
    const dropboxPath = `${normalizedFolder}/${filename}`;

    console.log(`[Dropbox Upload] Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) to ${dropboxPath}`);

    // Read file content
    const arrayBuffer = await file.arrayBuffer();

    // Upload to Dropbox
    try {
      await dropboxClient.uploadFile(dropboxPath, arrayBuffer);
    } catch (uploadError) {
      const errorMsg = (uploadError as Error).message;
      console.error("[Dropbox Upload] Upload failed:", errorMsg);

      if (errorMsg.includes("expirado") || errorMsg.includes("401")) {
        return NextResponse.json(
          {
            success: false,
            error: "Token de Dropbox expirado. Ve a Sincronización > Dropbox y reconecta tu cuenta.",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Error al subir archivo a Dropbox: ${errorMsg}`,
        },
        { status: 500 }
      );
    }

    // Create shared link
    let sharedUrl = "";
    try {
      sharedUrl = await dropboxClient.getSharedLink(dropboxPath);
    } catch (shareError) {
      const errorMsg = (shareError as Error).message;
      console.error("[Dropbox Upload] Shared link creation failed:", errorMsg);

      // Upload succeeded but link creation failed - still report as partial success
      return NextResponse.json({
        success: true,
        data: {
          url: "", // No public URL available
          path: dropboxPath,
          filename,
          fileSize: file.size,
        },
        warning: "Archivo subido pero no se pudo crear el enlace compartido",
      });
    }

    console.log(`[Dropbox Upload] Success: ${filename} -> ${sharedUrl}`);

    return NextResponse.json({
      success: true,
      data: {
        url: sharedUrl,
        path: dropboxPath,
        filename,
        fileSize: file.size,
      },
    });
  } catch (error) {
    console.error("[Dropbox Upload] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Error inesperado: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
