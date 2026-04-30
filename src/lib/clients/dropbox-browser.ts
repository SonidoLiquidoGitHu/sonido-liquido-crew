// ===========================================
// DROPBOX BROWSER CLIENT - Direct uploads from browser
// ===========================================
// This client handles file uploads directly from the browser to Dropbox
// bypassing the serverless function timeout issues
// Supports chunked uploads for large video files (up to 500MB)

export interface DropboxUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface DropboxUploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

// Chunk size for large files (8MB chunks work well)
const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
// Simple upload limit (150MB - Dropbox's limit for single request)
const SIMPLE_UPLOAD_LIMIT = 150 * 1024 * 1024;
// Maximum file size we support (500MB for videos)
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Get an upload token from the server
 * This token is used for browser-side uploads
 */
export async function getDropboxUploadToken(): Promise<{ token: string; error?: string }> {
  try {
    const response = await fetch("/api/admin/dropbox/token");

    // Check for non-JSON response (server error)
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("[Dropbox Browser] Non-JSON response from token endpoint");
      return { token: "", error: "Error de servidor. Verifica la conexión." };
    }

    const data = await response.json();

    if (!data.success || !data.token) {
      return { token: "", error: data.error || "No se pudo obtener el token de Dropbox" };
    }

    return { token: data.token };
  } catch (error) {
    console.error("[Dropbox Browser] Token fetch error:", error);
    return { token: "", error: (error as Error).message };
  }
}

/**
 * Upload a large file using Dropbox's chunked upload API
 * Uses upload_session/start, upload_session/append, upload_session/finish
 */
async function uploadLargeFile(
  file: File,
  dropboxPath: string,
  token: string,
  onProgress?: (progress: DropboxUploadProgress) => void
): Promise<{ success: boolean; error?: string }> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let uploadedBytes = 0;

  console.log(`[Dropbox Browser] Starting chunked upload: ${totalChunks} chunks for ${(file.size / 1024 / 1024).toFixed(1)}MB file`);

  try {
    // Step 1: Start upload session
    const firstChunk = file.slice(0, Math.min(CHUNK_SIZE, file.size));
    const firstChunkBuffer = await firstChunk.arrayBuffer();

    const startResponse = await fetch("https://content.dropboxapi.com/2/files/upload_session/start", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          close: file.size <= CHUNK_SIZE, // Close if this is the only chunk
        }),
      },
      body: firstChunkBuffer,
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error("[Dropbox Browser] Upload session start failed:", errorText);
      if (startResponse.status === 401) {
        return { success: false, error: "Token de Dropbox expirado. Ve a Sincronización > Dropbox y reconecta." };
      }
      return { success: false, error: `Error al iniciar subida: ${startResponse.status}` };
    }

    const startData = await startResponse.json();
    const sessionId = startData.session_id;
    uploadedBytes = firstChunkBuffer.byteLength;

    onProgress?.({ loaded: uploadedBytes, total: file.size, percent: Math.round((uploadedBytes / file.size) * 100) });

    // Step 2: Upload remaining chunks (if any)
    if (file.size > CHUNK_SIZE) {
      let offset = CHUNK_SIZE;

      while (offset < file.size) {
        const chunkEnd = Math.min(offset + CHUNK_SIZE, file.size);
        const isLastChunk = chunkEnd >= file.size;
        const chunk = file.slice(offset, chunkEnd);
        const chunkBuffer = await chunk.arrayBuffer();

        const chunkNumber = Math.floor(offset / CHUNK_SIZE) + 1;
        console.log(`[Dropbox Browser] Uploading chunk ${chunkNumber}/${totalChunks} (offset: ${offset})`);

        // For the last chunk, we use finish; for middle chunks, we use append
        if (isLastChunk) {
          // Step 3: Finish the upload session
          const finishResponse = await fetch("https://content.dropboxapi.com/2/files/upload_session/finish", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/octet-stream",
              "Dropbox-API-Arg": JSON.stringify({
                cursor: {
                  session_id: sessionId,
                  offset: offset,
                },
                commit: {
                  path: dropboxPath,
                  mode: "overwrite",
                  autorename: false,
                  mute: false,
                },
              }),
            },
            body: chunkBuffer,
          });

          if (!finishResponse.ok) {
            const errorText = await finishResponse.text();
            console.error("[Dropbox Browser] Upload session finish failed:", errorText);
            return { success: false, error: `Error al finalizar subida: ${finishResponse.status}` };
          }

          const finishData = await finishResponse.json();
          console.log("[Dropbox Browser] Chunked upload completed:", finishData.path_display);
        } else {
          // Append chunk
          const appendResponse = await fetch("https://content.dropboxapi.com/2/files/upload_session/append_v2", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/octet-stream",
              "Dropbox-API-Arg": JSON.stringify({
                cursor: {
                  session_id: sessionId,
                  offset: offset,
                },
                close: false,
              }),
            },
            body: chunkBuffer,
          });

          if (!appendResponse.ok) {
            const errorText = await appendResponse.text();
            console.error("[Dropbox Browser] Upload session append failed:", errorText);
            return { success: false, error: `Error al subir parte ${chunkNumber}: ${appendResponse.status}` };
          }
        }

        uploadedBytes = chunkEnd;
        offset = chunkEnd;

        onProgress?.({ loaded: uploadedBytes, total: file.size, percent: Math.round((uploadedBytes / file.size) * 100) });
      }
    } else {
      // Single chunk file - need to finish the session
      const finishResponse = await fetch("https://content.dropboxapi.com/2/files/upload_session/finish", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            cursor: {
              session_id: sessionId,
              offset: 0,
            },
            commit: {
              path: dropboxPath,
              mode: "overwrite",
              autorename: false,
              mute: false,
            },
          }),
        },
        body: new ArrayBuffer(0), // Empty body for finish
      });

      if (!finishResponse.ok) {
        const errorText = await finishResponse.text();
        console.error("[Dropbox Browser] Upload session finish (single chunk) failed:", errorText);
        return { success: false, error: `Error al finalizar subida: ${finishResponse.status}` };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("[Dropbox Browser] Chunked upload error:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Upload a file directly to Dropbox from the browser
 * This bypasses the serverless function timeout
 * Supports files up to 500MB using chunked uploads for larger files
 */
export async function uploadToDropboxDirect(
  file: File,
  folder: string = "/uploads",
  onProgress?: (progress: DropboxUploadProgress) => void
): Promise<DropboxUploadResult> {
  try {
    // Check file size limit
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: `El archivo excede el límite de ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }

    // Get access token from server
    const { token, error: tokenError } = await getDropboxUploadToken();
    if (tokenError || !token) {
      return { success: false, error: tokenError || "No se pudo obtener el token" };
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "";
    const baseName = file.name.replace(`.${ext}`, "").replace(/[^a-zA-Z0-9-_]/g, "_");
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const filename = `${baseName}_${uniqueId}.${ext}`;

    // Normalize folder path
    const normalizedFolder = folder.startsWith("/") ? folder : `/${folder}`;
    const dropboxPath = `${normalizedFolder}/${filename}`;

    // Report initial progress
    onProgress?.({ loaded: 0, total: file.size, percent: 0 });

    // Decide upload method based on file size
    const useChunkedUpload = file.size > SIMPLE_UPLOAD_LIMIT;

    if (useChunkedUpload) {
      console.log(`[Dropbox Browser] Using chunked upload for ${(file.size / 1024 / 1024).toFixed(1)}MB file`);

      const uploadResult = await uploadLargeFile(file, dropboxPath, token, onProgress);

      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }
    } else {
      // Simple upload for smaller files
      console.log(`[Dropbox Browser] Using simple upload for ${(file.size / 1024 / 1024).toFixed(1)}MB file`);

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      onProgress?.({ loaded: file.size * 0.1, total: file.size, percent: 10 });

      // Upload to Dropbox
      const uploadResponse = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path: dropboxPath,
            mode: "overwrite",
            autorename: false,
            mute: false,
          }),
        },
        body: arrayBuffer,
      });

      onProgress?.({ loaded: file.size * 0.8, total: file.size, percent: 80 });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("[Dropbox Browser] Simple upload failed:", errorText);

        if (uploadResponse.status === 401) {
          return { success: false, error: "Token de Dropbox expirado. Ve a Sincronización > Dropbox y reconecta." };
        }

        return { success: false, error: `Error de Dropbox: ${uploadResponse.status}` };
      }

      const uploadResult = await uploadResponse.json();
      console.log("[Dropbox Browser] Simple upload success:", uploadResult.path_display);
    }

    // Create shared link
    onProgress?.({ loaded: file.size * 0.9, total: file.size, percent: 90 });

    let sharedUrl = "";
    try {
      const shareResponse = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: dropboxPath,
          settings: {
            requested_visibility: "public",
            audience: "public",
            access: "viewer",
          },
        }),
      });

      if (shareResponse.ok) {
        const shareData = await shareResponse.json();
        // Convert to direct link
        sharedUrl = shareData.url
          .replace("www.dropbox.com", "dl.dropboxusercontent.com")
          .replace("?dl=0", "")
          .replace("&dl=0", "");
      } else {
        // Try to get existing link (might already exist)
        const errorData = await shareResponse.json().catch(() => ({}));
        console.log("[Dropbox Browser] Create share link response:", errorData);

        // Check if link already exists
        if (shareResponse.status === 409 || (errorData.error_summary || "").includes("shared_link_already_exists")) {
          const existingResponse = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: dropboxPath,
              direct_only: true,
            }),
          });

          if (existingResponse.ok) {
            const existingData = await existingResponse.json();
            if (existingData.links && existingData.links.length > 0) {
              sharedUrl = existingData.links[0].url
                .replace("www.dropbox.com", "dl.dropboxusercontent.com")
                .replace("?dl=0", "")
                .replace("&dl=0", "");
            }
          }
        }
      }
    } catch (shareError) {
      console.error("[Dropbox Browser] Error creating share link:", shareError);
      // Return the path even without a shared link
      return {
        success: true,
        path: dropboxPath,
        error: "Archivo subido pero no se pudo crear el link compartido"
      };
    }

    onProgress?.({ loaded: file.size, total: file.size, percent: 100 });

    return {
      success: true,
      url: sharedUrl,
      path: dropboxPath,
    };
  } catch (error) {
    console.error("[Dropbox Browser] Error:", error);
    return { success: false, error: (error as Error).message };
  }
}
