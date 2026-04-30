import { NextRequest, NextResponse } from "next/server";
import { dropboxClient } from "@/lib/clients/dropbox";
import { db, isDatabaseConfigured } from "@/db/client";
import { fileAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// Route segment config - extend timeout for file uploads
export const maxDuration = 60; // 60 seconds (Netlify Pro) or 26s (free tier)
export const dynamic = "force-dynamic";

// Max file size: 150MB
const MAX_FILE_SIZE = 150 * 1024 * 1024;

// Supported file types with MIME mappings
const SUPPORTED_MIME_TYPES: Record<string, string> = {
  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  wma: "audio/x-ms-wma",
  aiff: "audio/aiff",
  alac: "audio/x-alac",
  opus: "audio/opus",
  webm: "audio/webm",
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  tiff: "image/tiff",
  ico: "image/x-icon",
  // Video
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  // Documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  // Archives
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
};

function getMimeType(filename: string, providedType?: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return SUPPORTED_MIME_TYPES[ext] || providedType || "application/octet-stream";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateUUID().slice(0, 8);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Dropbox Upload] [${requestId}] New upload request`);
  console.log(`[Dropbox Upload] [${requestId}] Timestamp: ${new Date().toISOString()}`);

  try {
    // Check if Dropbox is configured
    console.log(`[Dropbox Upload] [${requestId}] Checking configuration...`);
    let isConfigured = false;
    try {
      isConfigured = await dropboxClient.isConfiguredAsync();
    } catch (configError) {
      console.error(`[Dropbox Upload] [${requestId}] ❌ Config check error:`, configError);
      return NextResponse.json(
        {
          success: false,
          error: "Error al verificar configuración de Dropbox. Por favor intenta de nuevo."
        },
        { status: 500 }
      );
    }

    if (!isConfigured) {
      console.error(`[Dropbox Upload] [${requestId}] ❌ Not configured - returning 503`);
      return NextResponse.json(
        {
          success: false,
          error: "Dropbox no está configurado. Ve a Sincronización > Dropbox y conecta tu cuenta."
        },
        { status: 503 }
      );
    }
    console.log(`[Dropbox Upload] [${requestId}] ✓ Configuration OK`);

    // Test the connection before uploading
    try {
      console.log(`[Dropbox Upload] [${requestId}] Testing Dropbox connection...`);
      await dropboxClient.getCurrentAccount();
      console.log(`[Dropbox Upload] [${requestId}] ✓ Connection test passed`);
    } catch (testError) {
      console.error(`[Dropbox Upload] [${requestId}] ❌ Connection test failed:`, testError);
      const errMsg = (testError as Error).message || "";

      // Handle specific error cases with user-friendly messages
      if (errMsg.includes("401") || errMsg.includes("expired") || errMsg.includes("invalid_access_token")) {
        return NextResponse.json(
          {
            success: false,
            error: "Token de Dropbox expirado. Ve a Admin > Sincronización > Dropbox y reconecta tu cuenta."
          },
          { status: 401 }
        );
      }

      if (errMsg.includes("No Dropbox access token")) {
        return NextResponse.json(
          {
            success: false,
            error: "No hay token de Dropbox configurado. Ve a Admin > Sincronización > Dropbox."
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Error conectando a Dropbox: ${errMsg.slice(0, 100)}`
        },
        { status: 503 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = formData.get("folder") as string || "/uploads";
    const entityType = formData.get("entityType") as string | null;
    const entityId = formData.get("entityId") as string | null;
    const fieldName = formData.get("fieldName") as string | null;

    if (!file) {
      console.error(`[Dropbox Upload] [${requestId}] ❌ No file provided`);
      return NextResponse.json(
        { success: false, error: "No se proporcionó archivo" },
        { status: 400 }
      );
    }

    // Log file details
    const mimeType = getMimeType(file.name, file.type);
    console.log(`[Dropbox Upload] [${requestId}] 📁 File Details:`);
    console.log(`[Dropbox Upload] [${requestId}]    Name: ${file.name}`);
    console.log(`[Dropbox Upload] [${requestId}]    Size: ${formatBytes(file.size)}`);
    console.log(`[Dropbox Upload] [${requestId}]    Type: ${mimeType}`);
    console.log(`[Dropbox Upload] [${requestId}]    Folder: ${folder}`);
    if (entityType) console.log(`[Dropbox Upload] [${requestId}]    Entity: ${entityType}/${entityId}`);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.error(`[Dropbox Upload] [${requestId}] ❌ File too large: ${formatBytes(file.size)} > ${formatBytes(MAX_FILE_SIZE)}`);
      return NextResponse.json(
        { success: false, error: `El archivo excede el límite de ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "";
    const baseName = file.name.replace(`.${ext}`, "").replace(/[^a-zA-Z0-9-_]/g, "_");
    const uniqueId = generateUUID().slice(0, 8);
    const filename = `${baseName}_${uniqueId}.${ext}`;

    // Ensure folder starts with /
    const normalizedFolder = folder.startsWith("/") ? folder : `/${folder}`;
    const dropboxPath = `${normalizedFolder}/${filename}`;

    console.log(`[Dropbox Upload] [${requestId}] 📤 Uploading to Dropbox: ${dropboxPath}`);

    // Convert file to ArrayBuffer
    console.log(`[Dropbox Upload] [${requestId}] Converting file to buffer...`);
    const arrayBuffer = await file.arrayBuffer();
    console.log(`[Dropbox Upload] [${requestId}] ✓ Buffer ready (${formatBytes(arrayBuffer.byteLength)})`);

    // Upload to Dropbox
    console.log(`[Dropbox Upload] [${requestId}] Starting Dropbox upload...`);
    const uploadStartTime = Date.now();
    const uploadResult = await dropboxClient.uploadFile(dropboxPath, arrayBuffer);
    const uploadDuration = Date.now() - uploadStartTime;
    console.log(`[Dropbox Upload] [${requestId}] ✓ Upload complete (${uploadDuration}ms)`);

    // Get shared link for the file
    console.log(`[Dropbox Upload] [${requestId}] Creating shared link...`);
    const sharedUrl = await dropboxClient.getSharedLink(dropboxPath);
    console.log(`[Dropbox Upload] [${requestId}] ✓ Shared link: ${sharedUrl}`);

    // Track the file in file_assets table for persistence
    let fileAssetId: string | null = null;
    if (isDatabaseConfigured()) {
      try {
        console.log(`[Dropbox Upload] [${requestId}] Saving to database...`);

        // Check if file asset already exists by path
        const existingAsset = await db
          .select()
          .from(fileAssets)
          .where(eq(fileAssets.storagePath, dropboxPath))
          .limit(1);

        if (existingAsset.length > 0) {
          // Update existing record
          await db
            .update(fileAssets)
            .set({
              publicUrl: sharedUrl,
              fileSize: file.size,
              updatedAt: new Date(),
              metadata: {
                entityType,
                entityId,
                fieldName,
                uploadedAt: new Date().toISOString(),
              },
            })
            .where(eq(fileAssets.id, existingAsset[0].id));
          fileAssetId = existingAsset[0].id;
          console.log(`[Dropbox Upload] [${requestId}] ✓ Updated existing file asset: ${fileAssetId}`);
        } else {
          // Create new file asset record
          fileAssetId = generateUUID();
          await db.insert(fileAssets).values({
            id: fileAssetId,
            filename,
            originalFilename: file.name,
            mimeType: mimeType,
            fileSize: file.size,
            storageProvider: "dropbox",
            storagePath: dropboxPath,
            publicUrl: sharedUrl,
            isPublic: true,
            metadata: {
              entityType,
              entityId,
              fieldName,
              uploadedAt: new Date().toISOString(),
            },
          });
          console.log(`[Dropbox Upload] [${requestId}] ✓ Created new file asset: ${fileAssetId}`);
        }
      } catch (dbError) {
        // Log but don't fail - the file was uploaded successfully
        console.error(`[Dropbox Upload] [${requestId}] ⚠ Database error (non-fatal):`, dbError);
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[Dropbox Upload] [${requestId}] ✅ SUCCESS`);
    console.log(`[Dropbox Upload] [${requestId}]    Total time: ${totalDuration}ms`);
    console.log(`[Dropbox Upload] [${requestId}]    URL: ${sharedUrl}`);
    console.log(`${"=".repeat(60)}\n`);

    return NextResponse.json({
      success: true,
      data: {
        id: fileAssetId,
        filename,
        originalFilename: file.name,
        path: dropboxPath,
        url: sharedUrl,
        fileSize: file.size,
        mimeType: mimeType,
        uploadDuration,
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[Dropbox Upload] [${requestId}] ❌ ERROR after ${totalDuration}ms:`, error);
    console.error(`[Dropbox Upload] [${requestId}] Error stack:`, (error as Error).stack);
    console.log(`${"=".repeat(60)}\n`);

    const errorMessage = (error as Error).message || "Unknown error";
    const errorName = (error as Error).name || "";

    // Handle timeout errors
    if (errorName === "AbortError" || errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      return NextResponse.json(
        {
          success: false,
          error: "Tiempo de espera agotado. El archivo es muy grande. Intenta con un archivo más pequeño (<50MB) o usa la URL directa."
        },
        { status: 408 }
      );
    }

    // Handle fetch/network errors
    if (errorMessage.includes("fetch failed") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("network")) {
      return NextResponse.json(
        {
          success: false,
          error: "Error de conexión con Dropbox. Verifica tu conexión a internet e intenta de nuevo."
        },
        { status: 503 }
      );
    }

    // Handle specific Dropbox errors
    if (errorMessage.includes("401") || errorMessage.includes("expired") || errorMessage.includes("invalid_access_token")) {
      return NextResponse.json(
        {
          success: false,
          error: "Token de Dropbox expirado. Ve a Admin > Sincronización > Dropbox y reconecta tu cuenta."
        },
        { status: 401 }
      );
    }

    if (errorMessage.includes("No Dropbox access token")) {
      return NextResponse.json(
        {
          success: false,
          error: "No hay token de Dropbox. Ve a Admin > Sincronización > Dropbox para conectar tu cuenta."
        },
        { status: 503 }
      );
    }

    if (errorMessage.includes("insufficient_space")) {
      return NextResponse.json(
        { success: false, error: "No hay suficiente espacio en Dropbox. Libera espacio e intenta de nuevo." },
        { status: 507 }
      );
    }

    if (errorMessage.includes("no está conectado") || errorMessage.includes("not configured")) {
      return NextResponse.json(
        { success: false, error: "Dropbox no está conectado. Ve a Admin > Sincronización > Dropbox." },
        { status: 503 }
      );
    }

    if (errorMessage.includes("path/not_found")) {
      return NextResponse.json(
        { success: false, error: "No se pudo crear la carpeta en Dropbox. Verifica los permisos." },
        { status: 400 }
      );
    }

    if (errorMessage.includes("too_large") || errorMessage.includes("file_size")) {
      return NextResponse.json(
        { success: false, error: "El archivo es demasiado grande. Máximo 150MB permitido." },
        { status: 413 }
      );
    }

    // Check for rate limiting
    if (errorMessage.includes("429") || errorMessage.includes("too_many_requests") || errorMessage.includes("rate limit")) {
      return NextResponse.json(
        {
          success: false,
          error: "Dropbox está limitando las solicitudes. Espera unos segundos e intenta de nuevo.",
          requestId: requestId,
        },
        { status: 429 }
      );
    }

    // Handle Dropbox API specific errors
    if (errorMessage.includes("invalid_request") || errorMessage.includes("malformed")) {
      return NextResponse.json(
        {
          success: false,
          error: "Solicitud inválida a Dropbox. Intenta reconectar tu cuenta en Admin > Sincronización.",
          requestId: requestId,
        },
        { status: 400 }
      );
    }

    // Handle path conflicts
    if (errorMessage.includes("path/conflict")) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un archivo con ese nombre. Intenta con otro nombre.",
          requestId: requestId,
        },
        { status: 409 }
      );
    }

    // Generic error with full message for debugging
    return NextResponse.json(
      {
        success: false,
        error: `Error al subir: ${errorMessage.slice(0, 150)}. Intenta reconectar Dropbox en Admin > Sincronización.`,
        requestId: requestId,
      },
      { status: 500 }
    );
  }
}

// List files in a folder
export async function GET(request: NextRequest) {
  try {
    const isConfigured = await dropboxClient.isConfiguredAsync();
    if (!isConfigured) {
      return NextResponse.json(
        { success: false, error: "Dropbox no está configurado" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "/uploads";

    const files = await dropboxClient.listFolder(folder);

    return NextResponse.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error("[Dropbox List] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al listar archivos" },
      { status: 500 }
    );
  }
}
