"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Cloud,
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  File,
  Image as ImageIcon,
  Music,
  FileText,
  Zap,
} from "lucide-react";

interface DirectDropboxUploaderProps {
  onUploadComplete: (url: string, filename: string, fileSize: number) => void;
  accept?: string;
  maxSize?: number; // in MB
  folder?: string; // Dropbox folder path
  label?: string;
  currentUrl?: string;
  className?: string;
}

interface UploadState {
  status: "idle" | "preparing" | "uploading" | "creating-link" | "success" | "error";
  progress: number;
  message?: string;
  url?: string;
  filename?: string;
}

// Generate unique ID without crypto
function generateUniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function DirectDropboxUploader({
  onUploadComplete,
  accept = "*/*",
  maxSize = 500, // 500MB default - browser uploads can handle much more
  folder = "/uploads",
  label = "Subir archivo",
  currentUrl,
  className = "",
}: DirectDropboxUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropboxConfigured, setDropboxConfigured] = useState<boolean | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Dropbox configuration and get token
  useEffect(() => {
    const initDropbox = async () => {
      try {
        // First check if configured
        const statusRes = await fetch("/api/admin/dropbox");
        const statusData = await statusRes.json();

        if (!statusData?.data?.connected) {
          console.log("[DirectDropbox] Not connected");
          setDropboxConfigured(false);
          return;
        }

        // Get access token for direct uploads
        const tokenRes = await fetch("/api/admin/dropbox/token");
        const tokenData = await tokenRes.json();

        if (tokenData.success && tokenData.data?.token) {
          setAccessToken(tokenData.data.token);
          setDropboxConfigured(true);
          console.log("[DirectDropbox] Ready for direct uploads");
        } else {
          setDropboxConfigured(false);
        }
      } catch (error) {
        console.error("[DirectDropbox] Init error:", error);
        setDropboxConfigured(false);
      }
    };

    initDropbox();
  }, []);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-5 h-5" />;
    if (mimeType.startsWith("audio/")) return <Music className="w-5 h-5" />;
    if (mimeType.startsWith("application/pdf")) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const uploadToDropbox = useCallback(async (file: File) => {
    if (!accessToken) {
      setUploadState({
        status: "error",
        progress: 0,
        message: "No hay token de Dropbox disponible",
      });
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setUploadState({
        status: "error",
        progress: 0,
        message: `El archivo excede el límite de ${maxSize}MB`,
      });
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    const isLargeFile = fileSizeMB > 150;

    setUploadState({
      status: "preparing",
      progress: 5,
      message: "Preparando archivo...",
    });

    try {
      // Generate unique filename
      const ext = file.name.split(".").pop() || "";
      const baseName = file.name.replace(`.${ext}`, "").replace(/[^a-zA-Z0-9-_]/g, "_");
      const uniqueId = generateUniqueId();
      const filename = `${baseName}_${uniqueId}.${ext}`;

      // Ensure folder starts with /
      const normalizedFolder = folder.startsWith("/") ? folder : `/${folder}`;
      const dropboxPath = `${normalizedFolder}/${filename}`;

      setUploadState({
        status: "uploading",
        progress: 10,
        message: `Subiendo ${formatFileSize(file.size)} directamente a Dropbox...`,
      });

      // For files larger than 150MB, use upload sessions
      if (isLargeFile) {
        await uploadLargeFile(file, dropboxPath, filename);
      } else {
        await uploadSmallFile(file, dropboxPath, filename);
      }

    } catch (error) {
      console.error("[DirectDropbox] Upload error:", error);
      const errorMessage = (error as Error).message || "Error desconocido";

      setUploadState({
        status: "error",
        progress: 0,
        message: errorMessage.includes("401") || errorMessage.includes("expired")
          ? "Token expirado. Reconecta Dropbox en Sincronización."
          : `Error: ${errorMessage.slice(0, 100)}`,
      });
    }
  }, [accessToken, folder, maxSize]);

  const uploadSmallFile = async (file: File, dropboxPath: string, filename: string) => {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Upload directly to Dropbox Content API
    const uploadResponse = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(errorData.error_summary || `HTTP ${uploadResponse.status}`);
    }

    setUploadState({
      status: "creating-link",
      progress: 80,
      message: "Creando enlace compartido...",
    });

    // Create shared link
    const sharedUrl = await createSharedLink(dropboxPath);

    setUploadState({
      status: "success",
      progress: 100,
      message: "Archivo subido exitosamente",
      url: sharedUrl,
      filename,
    });

    onUploadComplete(sharedUrl, filename, file.size);
  };

  const uploadLargeFile = async (file: File, dropboxPath: string, filename: string) => {
    const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Start upload session
    const startResponse = await fetch("https://content.dropboxapi.com/2/files/upload_session/start", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({ close: false }),
      },
      body: new ArrayBuffer(0),
    });

    if (!startResponse.ok) {
      throw new Error("Failed to start upload session");
    }

    const { session_id } = await startResponse.json();
    let offset = 0;

    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const chunkBuffer = await chunk.arrayBuffer();
      const isLastChunk = i === totalChunks - 1;

      const progress = Math.round(10 + ((i + 1) / totalChunks) * 70);
      setUploadState({
        status: "uploading",
        progress,
        message: `Subiendo parte ${i + 1} de ${totalChunks}...`,
      });

      if (isLastChunk) {
        // Finish upload session
        const finishResponse = await fetch("https://content.dropboxapi.com/2/files/upload_session/finish", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": JSON.stringify({
              cursor: { session_id, offset },
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
          const errorData = await finishResponse.json().catch(() => ({}));
          throw new Error(errorData.error_summary || "Failed to finish upload");
        }
      } else {
        // Append chunk
        const appendResponse = await fetch("https://content.dropboxapi.com/2/files/upload_session/append_v2", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": JSON.stringify({
              cursor: { session_id, offset },
              close: false,
            }),
          },
          body: chunkBuffer,
        });

        if (!appendResponse.ok) {
          throw new Error("Failed to append chunk");
        }
      }

      offset += chunkBuffer.byteLength;
    }

    setUploadState({
      status: "creating-link",
      progress: 85,
      message: "Creando enlace compartido...",
    });

    // Create shared link
    const sharedUrl = await createSharedLink(dropboxPath);

    setUploadState({
      status: "success",
      progress: 100,
      message: "Archivo subido exitosamente",
      url: sharedUrl,
      filename,
    });

    onUploadComplete(sharedUrl, filename, file.size);
  };

  const createSharedLink = async (path: string): Promise<string> => {
    try {
      // Try to create a new shared link
      const response = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path,
          settings: {
            access: "viewer",
            audience: "public",
            requested_visibility: "public",
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return convertToDirectLink(data.url);
      }

      // If link already exists, get existing links
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error_summary?.includes("shared_link_already_exists") || response.status === 409) {
        const listResponse = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path, direct_only: true }),
        });

        if (listResponse.ok) {
          const listData = await listResponse.json();
          if (listData.links && listData.links.length > 0) {
            return convertToDirectLink(listData.links[0].url);
          }
        }
      }

      throw new Error(errorData.error_summary || "Failed to create shared link");
    } catch (error) {
      console.error("[DirectDropbox] Create link error:", error);
      throw error;
    }
  };

  const convertToDirectLink = (url: string): string => {
    return url
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("?dl=0", "")
      .replace("&dl=0", "");
  };

  const handleFileSelect = (file: File) => {
    uploadToDropbox(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearUpload = () => {
    setUploadState({ status: "idle", progress: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isUploading = uploadState.status === "preparing" ||
                      uploadState.status === "uploading" ||
                      uploadState.status === "creating-link";

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Dropbox not configured warning */}
      {dropboxConfigured === false && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-yellow-500 font-medium">Dropbox no configurado</p>
              <p className="text-yellow-500/80 text-xs mt-1">
                Ve a <a href="/admin/sync" className="underline hover:no-underline">Sincronización</a> para conectar Dropbox.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feature badge */}
      {dropboxConfigured && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <Zap className="w-3 h-3" />
          <span>Upload directo al navegador - Sin límite de tiempo</span>
        </div>
      )}

      {/* Current file display */}
      {currentUrl && uploadState.status === "idle" && (
        <div className="flex items-center gap-2 p-3 bg-slc-card border border-slc-border rounded-lg">
          <Cloud className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-slc-muted truncate flex-1">
            {currentUrl.split("/").pop() || "Archivo actual"}
          </span>
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Ver
          </a>
        </div>
      )}

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          isDragOver
            ? "border-primary bg-primary/5"
            : uploadState.status === "error"
            ? "border-red-500/50 bg-red-500/5"
            : uploadState.status === "success"
            ? "border-green-500/50 bg-green-500/5"
            : "border-slc-border hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading || dropboxConfigured === false}
        />

        {uploadState.status === "idle" && (
          <>
            <Cloud className="w-10 h-10 mx-auto mb-3 text-slc-muted" />
            <p className="text-sm font-medium mb-1">{label}</p>
            <p className="text-xs text-slc-muted">
              Arrastra un archivo o haz clic para seleccionar
            </p>
            <p className="text-xs text-slc-muted mt-1">
              Máximo {maxSize}MB
            </p>
            <p className="text-xs text-emerald-500/80 mt-2">
              Los archivos se suben directo a Dropbox desde tu navegador
            </p>
          </>
        )}

        {(uploadState.status === "preparing" ||
          uploadState.status === "uploading" ||
          uploadState.status === "creating-link") && (
          <>
            <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
            <p className="text-sm font-medium mb-1">{uploadState.message}</p>
            <div className="w-full bg-slc-border rounded-full h-2 mt-3">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <p className="text-xs text-slc-muted mt-2">
              {uploadState.progress}% completado
            </p>
          </>
        )}

        {uploadState.status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
            <p className="text-sm font-medium text-green-500 mb-1">
              {uploadState.message}
            </p>
            <p className="text-xs text-slc-muted truncate">
              {uploadState.filename}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearUpload();
              }}
              className="mt-2"
            >
              <X className="w-4 h-4 mr-1" />
              Subir otro
            </Button>
          </>
        )}

        {uploadState.status === "error" && (
          <>
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-500" />
            <p className="text-sm font-medium text-red-500 mb-1">
              {uploadState.message}
            </p>
            {(uploadState.message?.toLowerCase().includes("token") ||
              uploadState.message?.toLowerCase().includes("expirado")) && (
              <a
                href="/admin/sync"
                className="text-xs text-primary hover:underline block mb-2"
                onClick={(e) => e.stopPropagation()}
              >
                Ir a Sincronización - Dropbox
              </a>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearUpload();
              }}
              className="mt-2"
            >
              Intentar de nuevo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Compact button version
export function DirectDropboxUploadButton({
  onUploadComplete,
  accept = "*/*",
  maxSize = 500,
  folder = "/uploads",
  label = "Subir a Dropbox",
  disabled = false,
}: Omit<DirectDropboxUploaderProps, "currentUrl" | "className"> & { disabled?: boolean }) {
  const [isUploading, setIsUploading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/dropbox/token")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAccessToken(data.data.token);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!accessToken) {
      alert("Dropbox no está configurado");
      return;
    }

    if (file.size > maxSize * 1024 * 1024) {
      alert(`El archivo excede el límite de ${maxSize}MB`);
      return;
    }

    setIsUploading(true);

    try {
      const ext = file.name.split(".").pop() || "";
      const baseName = file.name.replace(`.${ext}`, "").replace(/[^a-zA-Z0-9-_]/g, "_");
      const uniqueId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const filename = `${baseName}_${uniqueId}.${ext}`;
      const normalizedFolder = folder.startsWith("/") ? folder : `/${folder}`;
      const dropboxPath = `${normalizedFolder}/${filename}`;

      const arrayBuffer = await file.arrayBuffer();

      const uploadResponse = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path: dropboxPath,
            mode: "overwrite",
          }),
        },
        body: arrayBuffer,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      // Create shared link
      const linkResponse = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: dropboxPath,
          settings: { access: "viewer", audience: "public" },
        }),
      });

      let url: string;
      if (linkResponse.ok) {
        const linkData = await linkResponse.json();
        url = linkData.url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
      } else {
        // Try to get existing link
        const listResponse = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: dropboxPath }),
        });
        const listData = await listResponse.json();
        if (listData.links?.[0]) {
          url = listData.links[0].url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
        } else {
          throw new Error("Could not create shared link");
        }
      }

      onUploadComplete(url, filename, file.size);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error al subir archivo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
        disabled={disabled || isUploading || !accessToken}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading || !accessToken}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {!accessToken ? "Dropbox no configurado" : isUploading ? "Subiendo..." : label}
      </Button>
    </>
  );
}
