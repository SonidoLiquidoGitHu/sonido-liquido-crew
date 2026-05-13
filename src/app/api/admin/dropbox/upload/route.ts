// ===========================================
// DROPBOX UPLOAD API - Server-side file upload
// ===========================================
// Accepts FormData with a file and folder path,
// uploads to Dropbox, creates a shared link,
// and returns the public URL.

import { NextRequest, NextResponse } from "next/server";
import { dropboxClient } from "@/lib/clients/dropbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds timeout for uploads

// Maximum file size for server-side upload (150MB)
// Increased to match BulkAudioUploader's maxSize and support large audio files
const MAX_UPLOAD_SIZE = 150 * 1024 * 1024;

/**
 * POST - Upload a file to Dropbox and return a shared link URL
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Dropbox is configured
    const isConfigured = await dropboxClient.isConfiguredAsync();
    if (!isConfigured) {
      return NextResponse.json(
        { success: false, error: "Dropbox no está configurado. Conecta tu cuenta en Sincronización." },
        { status: 503 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "/uploads";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó archivo" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { success: false, error: `El archivo excede el límite de ${MAX_UPLOAD_SIZE / 1024 / 1024}MB para subida por servidor. Para archivos grandes, usa la subida directa.` },
        { status: 400 }
      );
    }

    console.log(`[Dropbox Upload] Uploading file: ${file.name}, size: ${(file.size / 1024).toFixed(1)}KB, folder: ${folder}`);

    // Generate a unique filename to avoid collisions
    const ext = file.name.split(".").pop() || "";
    const baseName = file.name.replace(`.${ext}`, "").replace(/[^a-zA-Z0-9-_]/g, "_");
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const filename = `${baseName}_${uniqueId}.${ext}`;

    // Normalize folder path
    const normalizedFolder = folder.startsWith("/") ? folder : `/${folder}`;
    const dropboxPath = `${normalizedFolder}/${filename}`;

    // Read file content
    const arrayBuffer = await file.arrayBuffer();

    // Upload to Dropbox
    const uploadResult = await dropboxClient.uploadFile(dropboxPath, arrayBuffer);
    console.log(`[Dropbox Upload] File uploaded to: ${uploadResult.path_display}`);

    // Create a shared link for the uploaded file
    let sharedUrl = "";
    try {
      sharedUrl = await dropboxClient.getSharedLink(dropboxPath);
      console.log(`[Dropbox Upload] Shared link created: ${sharedUrl}`);
    } catch (shareError) {
      console.error("[Dropbox Upload] Error creating shared link:", shareError);
      // The file was uploaded but we couldn't create a shared link
      return NextResponse.json({
        success: false,
        error: "Archivo subido pero no se pudo crear el enlace compartido. Verifica los permisos de Dropbox.",
      }, { status: 500 });
    }

    if (!sharedUrl) {
      return NextResponse.json({
        success: false,
        error: "No se pudo obtener el enlace del archivo",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        url: sharedUrl,
        filename: file.name,
        storedFilename: filename,
        path: uploadResult.path_display,
        fileSize: file.size,
        mimeType: file.type,
      },
    });
  } catch (error) {
    console.error("[Dropbox Upload] Error:", error);
    const errorMessage = (error as Error).message || "Error desconocido";

    // Provide helpful error messages
    if (errorMessage.includes("401") || errorMessage.includes("expired") || errorMessage.includes("token")) {
      return NextResponse.json(
        { success: false, error: "Token de Dropbox expirado. Reconecta tu cuenta en Sincronización → Dropbox." },
        { status: 401 }
      );
    }

    if (errorMessage.includes("insufficient_space")) {
      return NextResponse.json(
        { success: false, error: "No hay suficiente espacio en tu cuenta de Dropbox." },
        { status: 507 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
