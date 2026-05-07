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
  Trash2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

interface UploadedFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  url?: string;
  filename?: string;
  error?: string;
}

interface MultiFileDropboxUploaderProps {
  onFilesUploaded: (files: { url: string; filename: string; fileSize: number; originalName: string }[]) => void;
  accept?: string;
  maxSize?: number; // in MB per file
  maxFiles?: number; // max number of files
  folder?: string; // Dropbox folder path
  label?: string;
  className?: string;
}

// Generate unique ID without crypto
function generateUniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function MultiFileDropboxUploader({
  onFilesUploaded,
  accept = "*/*",
  maxSize = 500, // 500MB default per file
  maxFiles = 20,
  folder = "/uploads",
  label = "Subir archivos",
  className = "",
}: MultiFileDropboxUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropboxConfigured, setDropboxConfigured] = useState<boolean | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check Dropbox configuration and get token
  useEffect(() => {
    const initDropbox = async () => {
      try {
        const statusRes = await fetch("/api/admin/dropbox");
        const statusData = await statusRes.json();

        if (!statusData?.data?.connected) {
          setDropboxConfigured(false);
          return;
        }

        const tokenRes = await fetch("/api/admin/dropbox/token");
        const tokenData = await tokenRes.json();

        if (tokenData.success && tokenData.data?.token) {
          setAccessToken(tokenData.data.token);
          setDropboxConfigured(true);
        } else {
          setDropboxConfigured(false);
        }
      } catch (error) {
        console.error("[MultiDropbox] Init error:", error);
        setDropboxConfigured(false);
      }
    };

    initDropbox();
  }, []);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    if (mimeType.startsWith("audio/")) return <Music className="w-4 h-4" />;
    if (mimeType.startsWith("application/pdf")) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const filesToAdd: UploadedFile[] = [];

    for (let i = 0; i < newFiles.length && files.length + filesToAdd.length < maxFiles; i++) {
      const file = newFiles[i];

      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        continue; // Skip files that are too large
      }

      // Check for duplicates
      const isDuplicate = files.some(f => f.file.name === file.name && f.file.size === file.size);
      if (isDuplicate) continue;

      filesToAdd.push({
        id: generateUniqueId(),
        file,
        status: "pending",
        progress: 0,
      });
    }

    if (filesToAdd.length > 0) {
      setFiles(prev => [...prev, ...filesToAdd]);
    }
  }, [files, maxFiles, maxSize]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const retryFile = useCallback((id: string) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, status: "pending" as const, progress: 0, error: undefined } : f
    ));
  }, []);

  const uploadFile = async (uploadFile: UploadedFile): Promise<{ url: string; filename: string } | null> => {
    if (!accessToken) return null;

    const file = uploadFile.file;
    const ext = file.name.split(".").pop() || "";
    const baseName = file.name.replace(`.${ext}`, "").replace(/[^a-zA-Z0-9-_]/g, "_");
    const uniqueId = generateUniqueId();
    const filename = `${baseName}_${uniqueId}.${ext}`;
    const normalizedFolder = folder.startsWith("/") ? folder : `/${folder}`;
    const dropboxPath = `${normalizedFolder}/${filename}`;

    // Update status to uploading
    setFiles(prev => prev.map(f =>
      f.id === uploadFile.id ? { ...f, status: "uploading" as const, progress: 10 } : f
    ));

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Update progress
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, progress: 30 } : f
      ));

      // Upload to Dropbox
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

      // Update progress
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, progress: 70 } : f
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
            settings: {
              access: "viewer",
              audience: "public",
              requested_visibility: "public",
            },
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

      // Update to success
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: "success" as const, progress: 100, url: sharedUrl, filename } : f
      ));

      return { url: sharedUrl, filename };
    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: "error" as const, error: (error as Error).message } : f
      ));
      return null;
    }
  };

  const uploadAllFiles = async () => {
    if (!accessToken || isUploading) return;

    setIsUploading(true);
    setIsPaused(false);

    const pendingFiles = files.filter(f => f.status === "pending" || f.status === "error");
    const results: { url: string; filename: string; fileSize: number; originalName: string }[] = [];

    for (const file of pendingFiles) {
      if (isPaused) break;

      const result = await uploadFile(file);
      if (result) {
        results.push({
          url: result.url,
          filename: result.filename,
          fileSize: file.file.size,
          originalName: file.file.name,
        });
      }
    }

    setIsUploading(false);

    if (results.length > 0) {
      onFilesUploaded(results);
    }
  };

  const pauseUpload = () => {
    setIsPaused(true);
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== "success"));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
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
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  const pendingCount = files.filter(f => f.status === "pending").length;
  const uploadingCount = files.filter(f => f.status === "uploading").length;
  const successCount = files.filter(f => f.status === "success").length;
  const errorCount = files.filter(f => f.status === "error").length;

  return (
    <div className={`space-y-4 ${className}`}>
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
          <span>Upload múltiple directo - Hasta {maxFiles} archivos de {maxSize}MB cada uno</span>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-slc-border hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading || dropboxConfigured === false}
        />

        <Cloud className="w-12 h-12 mx-auto mb-4 text-slc-muted" />
        <p className="text-sm font-medium mb-1">{label}</p>
        <p className="text-xs text-slc-muted">
          Arrastra múltiples archivos o haz clic para seleccionar
        </p>
        <p className="text-xs text-slc-muted mt-1">
          Máximo {maxFiles} archivos, {maxSize}MB por archivo
        </p>
      </div>

      {/* Files list */}
      {files.length > 0 && (
        <div className="space-y-3">
          {/* Stats bar */}
          <div className="flex items-center justify-between text-xs text-slc-muted">
            <div className="flex items-center gap-4">
              <span>{files.length} archivo(s)</span>
              {pendingCount > 0 && <span className="text-yellow-500">{pendingCount} pendientes</span>}
              {uploadingCount > 0 && <span className="text-primary">{uploadingCount} subiendo</span>}
              {successCount > 0 && <span className="text-green-500">{successCount} completados</span>}
              {errorCount > 0 && <span className="text-red-500">{errorCount} errores</span>}
            </div>
            <div className="flex items-center gap-2">
              {successCount > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={clearCompleted}>
                  Limpiar completados
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                <Trash2 className="w-3 h-3 mr-1" />
                Limpiar todo
              </Button>
            </div>
          </div>

          {/* Files grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  file.status === "success"
                    ? "border-green-500/30 bg-green-500/5"
                    : file.status === "error"
                    ? "border-red-500/30 bg-red-500/5"
                    : file.status === "uploading"
                    ? "border-primary/30 bg-primary/5"
                    : "border-slc-border bg-slc-card"
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {file.status === "uploading" ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : file.status === "success" ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : file.status === "error" ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : (
                    getFileIcon(file.file.type)
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{file.file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-slc-muted">
                    <span>{formatFileSize(file.file.size)}</span>
                    {file.status === "uploading" && (
                      <span className="text-primary">{file.progress}%</span>
                    )}
                    {file.status === "error" && (
                      <span className="text-red-500 truncate">{file.error}</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  {file.status === "uploading" && (
                    <div className="w-full bg-slc-border rounded-full h-1 mt-1">
                      <div
                        className="bg-primary h-1 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {file.status === "error" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => retryFile(file.id)}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  )}
                  {file.status !== "uploading" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Upload button */}
          {(pendingCount > 0 || errorCount > 0) && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={uploadAllFiles}
                disabled={isUploading || !accessToken}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subiendo {uploadingCount > 0 ? `(${uploadingCount}/${pendingCount + uploadingCount})` : "..."}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir {pendingCount + errorCount} archivo(s)
                  </>
                )}
              </Button>
              {isUploading && (
                <Button type="button" variant="outline" onClick={pauseUpload}>
                  <Pause className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
