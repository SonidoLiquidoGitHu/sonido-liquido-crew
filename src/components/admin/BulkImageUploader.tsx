"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Image as ImageIcon,
  FolderUp,
  Trash2,
  GripVertical,
  ZoomIn,
  Zap,
} from "lucide-react";

interface ImageFileInfo {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  url?: string;
  error?: string;
}

interface BulkImageUploaderProps {
  onUploadComplete: (urls: string[]) => void;
  folder?: string;
  maxSize?: number; // in MB per file
  maxFiles?: number;
  existingImages?: string[];
  onRemoveExisting?: (index: number) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function BulkImageUploader({
  onUploadComplete,
  folder = "/gallery",
  maxSize = 10, // 10MB per file
  maxFiles = 20,
  existingImages = [],
  onRemoveExisting,
}: BulkImageUploaderProps) {
  const [files, setFiles] = useState<ImageFileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropboxConfigured, setDropboxConfigured] = useState<boolean | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Dropbox configuration and get token on mount
  useEffect(() => {
    const initDropbox = async () => {
      try {
        const res = await fetch("/api/admin/dropbox");
        const data = await res.json();
        const hasToken = data?.data?.configured === true || data?.data?.hasDatabaseToken === true;
        const isConnected = data?.data?.connected === true;

        if (hasToken && isConnected) {
          // Get access token for direct uploads
          const tokenRes = await fetch("/api/admin/dropbox/token");
          const tokenData = await tokenRes.json();

          if (tokenData.success && tokenData.data?.token) {
            setAccessToken(tokenData.data.token);
            setDropboxConfigured(true);
          } else {
            setDropboxConfigured(false);
          }
        } else {
          setDropboxConfigured(false);
        }
      } catch (error) {
        console.error("[BulkImageUploader] Error checking Dropbox:", error);
        setDropboxConfigured(false);
      }
    };
    initDropbox();
  }, []);

  const processFiles = useCallback(async (selectedFiles: FileList | File[]) => {
    const imageFiles = Array.from(selectedFiles).filter(
      (f) => f.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(f.name)
    );

    if (imageFiles.length === 0) {
      alert("No se encontraron imágenes válidas");
      return;
    }

    const totalImages = existingImages.length + files.length + imageFiles.length;
    if (totalImages > maxFiles) {
      alert(`Máximo ${maxFiles} imágenes permitidas. Ya tienes ${existingImages.length + files.length}.`);
      return;
    }

    // Check file sizes
    const oversizedFiles = imageFiles.filter(f => f.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`Algunas imágenes superan el límite de ${maxSize}MB: ${oversizedFiles.map(f => f.name).join(", ")}`);
      return;
    }

    // Create file info objects with previews
    const newFiles: ImageFileInfo[] = await Promise.all(
      imageFiles.map(async (file) => {
        const preview = URL.createObjectURL(file);
        return {
          id: generateId(),
          file,
          preview,
          status: "pending" as const,
          progress: 0,
        };
      })
    );

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, existingImages.length, maxFiles, maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [processFiles]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const uploadFiles = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === "pending");
    if (pendingFiles.length === 0 || !accessToken) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (const fileInfo of pendingFiles) {
      // Update status to uploading
      setFiles(prev => prev.map(f =>
        f.id === fileInfo.id ? { ...f, status: "uploading" as const, progress: 10 } : f
      ));

      try {
        // Generate unique filename
        const ext = fileInfo.file.name.split(".").pop() || "";
        const baseName = fileInfo.file.name.replace(`.${ext}`, "").replace(/[^a-zA-Z0-9-_]/g, "_");
        const uniqueId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const filename = `${baseName}_${uniqueId}.${ext}`;
        const normalizedFolder = folder.startsWith("/") ? folder : `/${folder}`;
        const dropboxPath = `${normalizedFolder}/${filename}`;

        // Read file as ArrayBuffer
        const arrayBuffer = await fileInfo.file.arrayBuffer();

        setFiles(prev => prev.map(f =>
          f.id === fileInfo.id ? { ...f, progress: 30 } : f
        ));

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

        setFiles(prev => prev.map(f =>
          f.id === fileInfo.id ? { ...f, progress: 70 } : f
        ));

        // Create shared link
        let sharedUrl: string;
        try {
          const linkResponse = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: dropboxPath,
              settings: { access: "viewer", audience: "public", requested_visibility: "public" },
            }),
          });

          if (linkResponse.ok) {
            const data = await linkResponse.json();
            sharedUrl = data.url
              .replace("www.dropbox.com", "dl.dropboxusercontent.com")
              .replace("?dl=0", "")
              .replace("&dl=0", "");
          } else {
            // Try to get existing link
            const errorData = await linkResponse.json().catch(() => ({}));
            if (errorData.error_summary?.includes("shared_link_already_exists") || linkResponse.status === 409) {
              const listResponse = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ path: dropboxPath, direct_only: true }),
              });

              if (listResponse.ok) {
                const listData = await listResponse.json();
                if (listData.links && listData.links.length > 0) {
                  sharedUrl = listData.links[0].url
                    .replace("www.dropbox.com", "dl.dropboxusercontent.com")
                    .replace("?dl=0", "")
                    .replace("&dl=0", "");
                } else {
                  throw new Error("Could not get shared link");
                }
              } else {
                throw new Error("Could not get existing shared link");
              }
            } else {
              throw new Error(errorData.error_summary || "Failed to create shared link");
            }
          }
        } catch (linkError) {
          throw new Error(`Link error: ${(linkError as Error).message}`);
        }

        uploadedUrls.push(sharedUrl);
        setFiles(prev => prev.map(f =>
          f.id === fileInfo.id
            ? { ...f, status: "success" as const, progress: 100, url: sharedUrl }
            : f
        ));
      } catch (error) {
        console.error("Upload error:", error);
        setFiles(prev => prev.map(f =>
          f.id === fileInfo.id
            ? { ...f, status: "error" as const, error: error instanceof Error ? error.message : "Error" }
            : f
        ));
      }
    }

    setIsUploading(false);

    // Notify parent of all uploaded URLs
    if (uploadedUrls.length > 0) {
      onUploadComplete(uploadedUrls);
    }
  }, [files, folder, accessToken, onUploadComplete]);

  const clearCompleted = useCallback(() => {
    setFiles(prev => {
      // Revoke URLs for completed files
      prev.filter(f => f.status === "success").forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      return prev.filter(f => f.status !== "success");
    });
  }, []);

  const pendingCount = files.filter(f => f.status === "pending").length;
  const successCount = files.filter(f => f.status === "success").length;
  const errorCount = files.filter(f => f.status === "error").length;
  const totalCount = existingImages.length + files.length;

  // Show configuration warning
  if (dropboxConfigured === false) {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-500">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Dropbox no configurado</span>
        </div>
        <p className="text-sm text-slc-muted mt-2">
          Configura Dropbox en <a href="/admin/settings/dropbox" className="text-primary hover:underline">Ajustes</a> para subir imágenes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Direct upload badge */}
      <div className="flex items-center gap-2 text-xs text-emerald-500">
        <Zap className="w-3 h-3" />
        <span>Upload directo al navegador - Sin límite de tiempo</span>
      </div>

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-slc-border hover:border-slc-muted"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            isDragOver ? "bg-primary/20" : "bg-slc-card"
          }`}>
            <FolderUp className={`w-8 h-8 ${isDragOver ? "text-primary" : "text-slc-muted"}`} />
          </div>

          <div>
            <p className="font-medium">
              {isDragOver ? "Suelta las imágenes aquí" : "Arrastra imágenes o haz clic para seleccionar"}
            </p>
            <p className="text-sm text-slc-muted mt-1">
              JPG, PNG, GIF, WebP • Máx {maxSize}MB por archivo • Hasta {maxFiles} imágenes
            </p>
          </div>
        </div>
      </div>

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slc-muted">Imágenes existentes ({existingImages.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {existingImages.map((url, index) => (
              <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-slc-card group">
                <img src={url} alt={`Imagen ${index + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(url)}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                  >
                    <ZoomIn className="w-4 h-4 text-white" />
                  </button>
                  {onRemoveExisting && (
                    <button
                      type="button"
                      onClick={() => onRemoveExisting(index)}
                      className="w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-green-500/90 rounded text-[10px] text-white font-medium">
                  Guardado
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Files Preview */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slc-muted">
              Por subir ({pendingCount})
              {successCount > 0 && <span className="text-green-500 ml-2">• {successCount} completados</span>}
              {errorCount > 0 && <span className="text-red-500 ml-2">• {errorCount} errores</span>}
            </h4>
            {successCount > 0 && (
              <button
                type="button"
                onClick={clearCompleted}
                className="text-xs text-slc-muted hover:text-white"
              >
                Limpiar completados
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {files.map((fileInfo) => (
              <div
                key={fileInfo.id}
                className={`relative aspect-square rounded-lg overflow-hidden bg-slc-card group ${
                  fileInfo.status === "error" ? "ring-2 ring-red-500" : ""
                }`}
              >
                <img src={fileInfo.preview} alt={fileInfo.file.name} className="w-full h-full object-cover" />

                {/* Status overlay */}
                {fileInfo.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-xs text-white mt-1">Subiendo...</span>
                  </div>
                )}

                {fileInfo.status === "success" && (
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-green-500/90 rounded text-[10px] text-white font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Subido
                  </div>
                )}

                {fileInfo.status === "error" && (
                  <div className="absolute inset-0 bg-red-500/30 flex flex-col items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                    <span className="text-xs text-red-300 mt-1">Error</span>
                  </div>
                )}

                {/* Actions overlay */}
                {fileInfo.status !== "uploading" && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewImage(fileInfo.preview)}
                      className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                    >
                      <ZoomIn className="w-4 h-4 text-white" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(fileInfo.id)}
                      className="w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}

                {/* Filename */}
                <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-[10px] text-white truncate">{fileInfo.file.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={uploadFiles}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Subir {pendingCount} {pendingCount === 1 ? "imagen" : "imágenes"}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              files.forEach(f => {
                if (f.preview) URL.revokeObjectURL(f.preview);
              });
              setFiles([]);
            }}
            disabled={isUploading}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Stats */}
      {totalCount > 0 && (
        <p className="text-xs text-slc-muted text-center">
          Total: {totalCount} de {maxFiles} imágenes
        </p>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
