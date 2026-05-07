"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  Trash2,
  Play,
  Pause,
  RotateCcw,
  FolderUp,
  Archive,
} from "lucide-react";

// Comprehensive file type support
export const AUDIO_TYPES = ".mp3,.wav,.flac,.aac,.m4a,.ogg,.wma,.aiff,.alac,.opus,.webm";
export const IMAGE_TYPES = ".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tiff,.ico";
export const VIDEO_TYPES = ".mp4,.mov,.avi,.mkv,.wmv,.flv,.webm";
export const DOCUMENT_TYPES = ".pdf,.doc,.docx,.txt";
export const ARCHIVE_TYPES = ".zip,.rar,.7z,.tar,.gz";
export const ALL_MEDIA_TYPES = `${AUDIO_TYPES},${IMAGE_TYPES},${VIDEO_TYPES}`;
export const ALL_TYPES = `${ALL_MEDIA_TYPES},${DOCUMENT_TYPES},${ARCHIVE_TYPES}`;

interface FileUpload {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  url?: string;
  error?: string;
}

interface BulkDropboxUploaderProps {
  onUploadComplete?: (files: { url: string; filename: string; fileSize: number }[]) => void;
  onFileUploaded?: (url: string, filename: string, fileSize: number) => void;
  accept?: string;
  maxSize?: number; // in MB per file
  maxFiles?: number;
  folder?: string;
  label?: string;
  className?: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
  if (mimeType.startsWith("audio/")) return <Music className="w-4 h-4" />;
  if (mimeType.startsWith("video/")) return <Play className="w-4 h-4" />;
  if (mimeType.includes("pdf")) return <FileText className="w-4 h-4" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("archive")) {
    return <Archive className="w-4 h-4" />;
  }
  return <File className="w-4 h-4" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function BulkDropboxUploader({
  onUploadComplete,
  onFileUploaded,
  accept = ALL_TYPES,
  maxSize = 150,
  maxFiles = 20,
  folder = "/uploads",
  label = "Subir archivos",
  className = "",
}: BulkDropboxUploaderProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dropboxConfigured, setDropboxConfigured] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check Dropbox configuration on mount
  useEffect(() => {
    const checkDropbox = async () => {
      try {
        console.log("[BulkDropboxUploader] Checking Dropbox configuration...");
        const res = await fetch("/api/admin/dropbox");
        const data = await res.json();

        // Must check BOTH configured AND connected
        const hasToken = data?.data?.configured === true || data?.data?.hasDatabaseToken === true;
        const isConnected = data?.data?.connected === true;

        console.log("[BulkDropboxUploader] Has token:", hasToken, "Connected:", isConnected);
        setDropboxConfigured(hasToken && isConnected);
      } catch (error) {
        console.error("[BulkDropboxUploader] Error checking Dropbox:", error);
        setDropboxConfigured(false);
      }
    };

    checkDropbox();
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const filesToAdd = Array.from(newFiles).slice(0, maxFiles - files.length);

    const newUploads: FileUpload[] = filesToAdd.map(file => ({
      id: generateId(),
      file,
      status: "pending",
      progress: 0,
    }));

    // Validate file sizes
    for (const upload of newUploads) {
      if (upload.file.size > maxSize * 1024 * 1024) {
        upload.status = "error";
        upload.error = `Excede el límite de ${maxSize}MB`;
      }
    }

    setFiles(prev => [...prev, ...newUploads]);
  }, [files.length, maxFiles, maxSize]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setFiles([]);
    setIsUploading(false);
  };

  const uploadFile = async (upload: FileUpload): Promise<FileUpload> => {
    const formData = new FormData();
    formData.append("file", upload.file);
    formData.append("folder", folder);

    try {
      const response = await fetch("/api/admin/dropbox/upload", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current?.signal,
      });

      // Handle non-JSON responses (server errors)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("[BulkUploader] Non-JSON response:", text);
        throw new Error(text.slice(0, 100) || "Error del servidor");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error al subir archivo");
      }

      // Notify parent of individual upload
      if (onFileUploaded) {
        onFileUploaded(data.data.url, data.data.filename, data.data.fileSize);
      }

      return {
        ...upload,
        status: "success",
        progress: 100,
        url: data.data.url,
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return { ...upload, status: "pending", progress: 0 };
      }
      return {
        ...upload,
        status: "error",
        progress: 0,
        error: (error as Error).message,
      };
    }
  };

  const startUpload = async () => {
    const pendingFiles = files.filter(f => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    abortControllerRef.current = new AbortController();

    const completedFiles: { url: string; filename: string; fileSize: number }[] = [];

    // Upload files sequentially to avoid overwhelming the server
    for (const upload of pendingFiles) {
      // Update status to uploading
      setFiles(prev =>
        prev.map(f => (f.id === upload.id ? { ...f, status: "uploading", progress: 50 } : f))
      );

      const result = await uploadFile(upload);

      // Update file status
      setFiles(prev => prev.map(f => (f.id === upload.id ? result : f)));

      if (result.status === "success" && result.url) {
        completedFiles.push({
          url: result.url,
          filename: result.file.name,
          fileSize: result.file.size,
        });
      }
    }

    setIsUploading(false);

    // Notify parent of all completed uploads
    if (onUploadComplete && completedFiles.length > 0) {
      onUploadComplete(completedFiles);
    }
  };

  const retryFailed = () => {
    setFiles(prev =>
      prev.map(f => (f.status === "error" ? { ...f, status: "pending", progress: 0, error: undefined } : f))
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
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
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const pendingCount = files.filter(f => f.status === "pending").length;
  const successCount = files.filter(f => f.status === "success").length;
  const errorCount = files.filter(f => f.status === "error").length;
  const uploadingCount = files.filter(f => f.status === "uploading").length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Dropbox not configured warning */}
      {dropboxConfigured === false && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-yellow-500 font-medium">Dropbox no configurado</p>
              <p className="text-yellow-500/80 text-xs mt-1">
                Ve a <a href="/admin/sync" className="underline hover:no-underline">Sincronización</a> para configurar tu Access Token de Dropbox.
              </p>
              <p className="text-yellow-500/60 text-xs mt-1">
                Nota: Los tokens de Dropbox expiran cada 4 horas. Si recibes "Unauthorized", genera un nuevo token.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dropboxConfigured === false
            ? "border-yellow-500/50 bg-yellow-500/5 opacity-50 cursor-not-allowed"
            : isDragOver
            ? "border-primary bg-primary/5"
            : "border-slc-border hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          multiple
          disabled={isUploading || files.length >= maxFiles || dropboxConfigured === false}
        />

        <FolderUp className="w-12 h-12 mx-auto mb-4 text-slc-muted" />
        <p className="text-lg font-medium mb-2">{label}</p>
        <p className="text-sm text-slc-muted">
          Arrastra archivos aquí o haz clic para seleccionar
        </p>
        <p className="text-xs text-slc-muted mt-2">
          Máximo {maxFiles} archivos, {maxSize}MB cada uno
        </p>
        <div className="mt-3 flex flex-wrap gap-1 justify-center">
          <span className="px-2 py-1 text-xs bg-slc-card rounded text-slc-muted">Audio</span>
          <span className="px-2 py-1 text-xs bg-slc-card rounded text-slc-muted">Imágenes</span>
          <span className="px-2 py-1 text-xs bg-slc-card rounded text-slc-muted">Video</span>
          <span className="px-2 py-1 text-xs bg-slc-card rounded text-slc-muted">ZIP</span>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slc-card/50 border-b border-slc-border">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">{files.length} archivo{files.length !== 1 ? "s" : ""}</span>
              {pendingCount > 0 && (
                <span className="text-yellow-500">{pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}</span>
              )}
              {uploadingCount > 0 && (
                <span className="text-blue-500">{uploadingCount} subiendo...</span>
              )}
              {successCount > 0 && (
                <span className="text-green-500">{successCount} completado{successCount !== 1 ? "s" : ""}</span>
              )}
              {errorCount > 0 && (
                <span className="text-red-500">{errorCount} error{errorCount !== 1 ? "es" : ""}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {errorCount > 0 && !isUploading && (
                <Button variant="ghost" size="sm" onClick={retryFailed}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reintentar
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <Trash2 className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            </div>
          </div>

          {/* File list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slc-border">
            {files.map((upload) => (
              <div
                key={upload.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  upload.status === "error" ? "bg-red-500/5" : ""
                }`}
              >
                {/* File icon */}
                <div className={`w-8 h-8 rounded flex items-center justify-center ${
                  upload.status === "success"
                    ? "bg-green-500/20 text-green-500"
                    : upload.status === "error"
                    ? "bg-red-500/20 text-red-500"
                    : upload.status === "uploading"
                    ? "bg-blue-500/20 text-blue-500"
                    : "bg-slc-card text-slc-muted"
                }`}>
                  {upload.status === "uploading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : upload.status === "success" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : upload.status === "error" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    getFileIcon(upload.file.type)
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{upload.file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-slc-muted">
                    <span>{formatFileSize(upload.file.size)}</span>
                    {upload.error && (
                      <span className="text-red-500">{upload.error}</span>
                    )}
                    {upload.url && (
                      <a
                        href={upload.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Ver archivo
                      </a>
                    )}
                  </div>
                </div>

                {/* Progress / Remove */}
                {upload.status === "uploading" && (
                  <div className="w-20 bg-slc-border rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}

                {upload.status !== "uploading" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(upload.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Upload button */}
          {pendingCount > 0 && (
            <div className="px-4 py-3 bg-slc-card/50 border-t border-slc-border">
              <Button
                onClick={startUpload}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subiendo {uploadingCount} de {pendingCount + uploadingCount}...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir {pendingCount} archivo{pendingCount !== 1 ? "s" : ""} a Dropbox
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BulkDropboxUploader;
