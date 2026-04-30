"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";

interface DropboxUploaderProps {
  onUploadComplete: (url: string, filename: string, fileSize: number) => void;
  accept?: string;
  maxSize?: number; // in MB
  folder?: string; // Dropbox folder path
  label?: string;
  currentUrl?: string;
  className?: string;
}

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  message?: string;
  url?: string;
  filename?: string;
}

export function DropboxUploader({
  onUploadComplete,
  accept = "*/*",
  maxSize = 100, // 100MB default
  folder = "/uploads",
  label = "Subir archivo",
  currentUrl,
  className = "",
}: DropboxUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropboxConfigured, setDropboxConfigured] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Dropbox configuration on mount
  useEffect(() => {
    const checkDropbox = async () => {
      try {
        console.log("[DropboxUploader] Checking Dropbox configuration...");
        const res = await fetch("/api/admin/dropbox");
        const data = await res.json();
        console.log("[DropboxUploader] API Response:", data);

        // Must check BOTH configured AND connected
        // configured = token exists in DB or env
        // connected = token actually works with Dropbox API
        const hasToken = data?.data?.configured === true || data?.data?.hasDatabaseToken === true;
        const isConnected = data?.data?.connected === true;
        const hasError = data?.data?.error;

        console.log("[DropboxUploader] Has token:", hasToken, "Connected:", isConnected, "Error:", hasError);

        // Only mark as configured if BOTH token exists AND connection works
        if (hasToken && isConnected) {
          console.log("[DropboxUploader] ✓ Dropbox is ready to use");
          setDropboxConfigured(true);
        } else if (hasToken && !isConnected) {
          // Token exists but is invalid/expired
          console.error("[DropboxUploader] ✗ Token exists but connection failed:", hasError);
          setDropboxConfigured(false);
        } else {
          console.log("[DropboxUploader] ✗ No token configured");
          setDropboxConfigured(false);
        }
      } catch (error) {
        console.error("[DropboxUploader] Error checking Dropbox:", error);
        setDropboxConfigured(false);
      }
    };

    checkDropbox();
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

  const handleFileSelect = async (file: File) => {
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setUploadState({
        status: "error",
        progress: 0,
        message: `El archivo excede el límite de ${maxSize}MB`,
      });
      return;
    }

    // Warning for large files (>25MB) - might timeout on Netlify free tier
    const fileSizeMB = file.size / (1024 * 1024);
    const isLargeFile = fileSizeMB > 25;
    const isAudioFile = file.type.startsWith("audio/") ||
      /\.(mp3|wav|flac|m4a|aac|ogg)$/i.test(file.name);

    if (isLargeFile && isAudioFile) {
      console.warn(`[DropboxUploader] Large audio file detected: ${fileSizeMB.toFixed(1)}MB`);
    }

    setUploadState({
      status: "uploading",
      progress: 5,
      message: isLargeFile
        ? `Subiendo archivo grande (${fileSizeMB.toFixed(1)}MB)... esto puede tardar`
        : "Preparando archivo...",
    });

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      setUploadState({
        status: "uploading",
        progress: 30,
        message: "Subiendo a Dropbox...",
      });

      // Upload to Dropbox via API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second timeout (before Netlify's 60s)

      let response: Response;
      try {
        response = await fetch("/api/admin/dropbox/upload", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if ((fetchError as Error).name === "AbortError") {
          throw new Error("Timeout: El archivo es muy grande. Sube el archivo a Dropbox manualmente y usa la URL directa.");
        }
        throw fetchError;
      }

      // Handle non-JSON responses (server errors)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("[DropboxUploader] Non-JSON response:", text);

        // Parse common error patterns
        if (text.includes("Internal Error") || text.includes("FUNCTION_INVOCATION_TIMEOUT")) {
          throw new Error("Tiempo de espera agotado. El archivo es muy grande. Usa un archivo más pequeño o ingresa la URL directamente.");
        }
        if (text.includes("401") || text.includes("Unauthorized")) {
          throw new Error("Token de Dropbox expirado. Ve a Admin > Sincronización > Dropbox para reconectar.");
        }
        if (text.includes("503") || text.includes("Service Unavailable")) {
          throw new Error("Dropbox no está disponible. Intenta de nuevo en unos minutos.");
        }

        throw new Error("Error del servidor. Por favor intenta de nuevo o usa la URL directa.");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error al subir archivo");
      }

      setUploadState({
        status: "success",
        progress: 100,
        message: "Archivo subido exitosamente",
        url: data.data.url,
        filename: data.data.filename,
      });

      // Notify parent component
      onUploadComplete(data.data.url, data.data.filename, data.data.fileSize);

    } catch (error) {
      console.error("Upload error:", error);
      setUploadState({
        status: "error",
        progress: 0,
        message: (error as Error).message || "Error al subir archivo",
      });
    }
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
                Ve a <a href="/admin/sync" className="underline hover:no-underline">Sincronización</a> para configurar tu Access Token de Dropbox.
              </p>
            </div>
          </div>
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
          disabled={uploadState.status === "uploading" || dropboxConfigured === false}
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
            {accept?.includes("audio") && (
              <p className="text-xs text-yellow-500/80 mt-2">
                💡 Archivos grandes (&gt;25MB) pueden fallar. Usa la URL directa si hay timeout.
              </p>
            )}
          </>
        )}

        {uploadState.status === "uploading" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
            <p className="text-sm font-medium mb-1">{uploadState.message}</p>
            <div className="w-full bg-slc-border rounded-full h-2 mt-3">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
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
            {/* Show link to reconnect Dropbox if token expired */}
            {(uploadState.message?.toLowerCase().includes("token") ||
              uploadState.message?.toLowerCase().includes("expirado") ||
              uploadState.message?.toLowerCase().includes("dropbox")) && (
              <a
                href="/admin/sync"
                className="text-xs text-primary hover:underline block mb-2"
                onClick={(e) => e.stopPropagation()}
              >
                Ir a Sincronización → Dropbox
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

// Compact version for inline use
export function DropboxUploadButton({
  onUploadComplete,
  accept = "*/*",
  maxSize = 100,
  folder = "/uploads",
  label = "Subir a Dropbox",
  disabled = false,
}: Omit<DropboxUploaderProps, "currentUrl" | "className"> & { disabled?: boolean }) {
  const [isUploading, setIsUploading] = useState(false);
  const [dropboxConfigured, setDropboxConfigured] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Dropbox configuration on mount
  useEffect(() => {
    fetch("/api/admin/dropbox")
      .then(res => res.json())
      .then(data => {
        setDropboxConfigured(data?.data?.configured ?? false);
      })
      .catch(() => setDropboxConfigured(false));
  }, []);

  const isDisabled = disabled || isUploading || dropboxConfigured === false;

  const handleFileSelect = async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      alert(`El archivo excede el límite de ${maxSize}MB`);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await fetch("/api/admin/dropbox/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error al subir archivo");
      }

      onUploadComplete(data.data.url, data.data.filename, data.data.fileSize);
    } catch (error) {
      console.error("Upload error:", error);
      alert((error as Error).message || "Error al subir archivo");
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
        disabled={isDisabled}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isDisabled}
        title={dropboxConfigured === false ? "Dropbox no configurado. Ve a Configuración." : undefined}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {dropboxConfigured === false ? "Dropbox no configurado" : isUploading ? "Subiendo..." : label}
      </Button>
    </>
  );
}
