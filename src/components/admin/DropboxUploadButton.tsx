"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Cloud,
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DropboxUploadButtonProps {
  onUploadComplete: (url: string, filename?: string, fileSize?: number) => void;
  accept?: string;
  maxSize?: number; // in MB
  folder?: string; // Dropbox folder path
  uploadPath?: string; // Alias for folder
  buttonText?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg" | "icon"; // Button size
  disabled?: boolean;
}

export function DropboxUploadButton({
  onUploadComplete,
  accept = "image/*",
  maxSize = 50, // 50MB default
  folder,
  uploadPath,
  buttonText = "Subir archivo",
  className = "",
  variant = "outline",
  size = "default",
  disabled = false,
}: DropboxUploadButtonProps) {
  // Use uploadPath as alias for folder
  const folderPath = folder || uploadPath || "/uploads";
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [dropboxConfigured, setDropboxConfigured] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Dropbox configuration on mount
  useEffect(() => {
    const checkDropbox = async () => {
      try {
        console.log("[DropboxUploadButton] Checking Dropbox configuration...");
        const res = await fetch("/api/admin/dropbox");
        const data = await res.json();
        console.log("[DropboxUploadButton] API Response:", data);

        // Handle different response structures
        const isConfigured = data?.data?.configured === true ||
                            data?.configured === true ||
                            data?.data?.connected === true;

        console.log("[DropboxUploadButton] Is configured:", isConfigured);
        setDropboxConfigured(isConfigured);
      } catch (error) {
        console.error("[DropboxUploadButton] Error checking Dropbox:", error);
        setDropboxConfigured(false);
      }
    };

    checkDropbox();
  }, []);

  const handleClick = () => {
    if (status === "uploading" || dropboxConfigured === false || disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (file: File) => {
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setStatus("error");
      setMessage(`El archivo excede ${maxSize}MB`);
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 3000);
      return;
    }

    setStatus("uploading");
    setMessage("Subiendo...");

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folderPath);

      // Upload to Dropbox via API
      const response = await fetch("/api/admin/dropbox/upload", {
        method: "POST",
        body: formData,
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Server returned non-JSON response:", text.substring(0, 200));
        throw new Error("Error de conexión con Dropbox. Reconecta tu cuenta en Sincronización.");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error al subir archivo");
      }

      setStatus("success");
      setMessage("¡Listo!");

      // Notify parent component
      onUploadComplete(data.data.url, data.data.filename, data.data.fileSize);

      // Reset after 2 seconds
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 2000);

    } catch (error) {
      console.error("Upload error:", error);
      setStatus("error");
      setMessage((error as Error).message || "Error");

      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 3000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Show warning if Dropbox not configured
  if (dropboxConfigured === false) {
    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled
        className={cn("text-yellow-500 border-yellow-500/50", className)}
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Configura Dropbox
      </Button>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={status === "uploading" || disabled}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={status === "uploading" || dropboxConfigured === null || disabled}
        className={cn(
          status === "success" && "border-green-500 text-green-500",
          status === "error" && "border-red-500 text-red-500",
          className
        )}
      >
        {status === "idle" && (
          <>
            <Cloud className="w-4 h-4 mr-2" />
            {buttonText}
          </>
        )}
        {status === "uploading" && (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {message}
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            {message}
          </>
        )}
        {status === "error" && (
          <>
            <AlertTriangle className="w-4 h-4 mr-2" />
            {message}
          </>
        )}
      </Button>
    </>
  );
}
