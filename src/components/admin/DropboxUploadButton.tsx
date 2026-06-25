"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Cloud,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact Dropbox upload button.
 *
 * Uploads files DIRECTLY from the browser to Dropbox's Content API using an
 * access token fetched from `/api/admin/dropbox/token`. This mirrors the
 * approach used by `DirectDropboxUploader` (the working uploader used on the
 * beats page) and avoids the need for a server-side upload route — which
 * previously did not exist, causing "Error de conexión con Dropbox" whenever
 * the user tried to upload.
 *
 * The props contract is unchanged from the previous version, so all existing
 * consumers (releases, EPK, products, upcoming-releases download gate, etc.)
 * keep working without modification.
 */

interface DropboxUploadButtonProps {
  onUploadComplete: (url: string, filename?: string, fileSize?: number) => void;
  accept?: string;
  maxSize?: number; // in MB
  folder?: string; // Dropbox folder path
  uploadPath?: string; // Alias for folder
  buttonText?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg" | "icon";
  disabled?: boolean;
}

// Generate a short unique ID without relying on the Web Crypto API
function generateUniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Convert a Dropbox shared-link URL into a direct-download URL (?raw=1 works
// with both legacy /s/... and new /scl/fi/...?rlkey=... link formats).
function convertToDirectLink(url: string): string {
  const result = url
    .replace("?dl=0", "?raw=1")
    .replace("&dl=0", "&raw=1");
  if (!result.includes("raw=1")) {
    return `${result}${result.includes("?") ? "&" : "?"}raw=1`;
  }
  return result;
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
  const folderPath = folder || uploadPath || "/uploads";
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [dropboxConfigured, setDropboxConfigured] = useState<boolean | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch a fresh access token on mount. The token endpoint auto-refreshes
  // expired tokens using the stored refresh_token, so we don't need to do
  // any refresh logic here.
  useEffect(() => {
    const initDropbox = async () => {
      try {
        console.log("[DropboxUploadButton] Fetching Dropbox access token...");
        const tokenRes = await fetch("/api/admin/dropbox/token");
        const tokenData = await tokenRes.json();

        if (tokenData.success && tokenData.data?.token) {
          setAccessToken(tokenData.data.token);
          setDropboxConfigured(true);
          console.log("[DropboxUploadButton] Ready for direct browser upload");
          return;
        }

        // Token endpoint couldn't give us a token. Check status so we can
        // distinguish "not configured" from "expired/needs reconnect".
        console.log("[DropboxUploadButton] Token endpoint failed, checking status...");
        try {
          const statusRes = await fetch("/api/admin/dropbox");
          const statusData = await statusRes.json();
          const connected =
            statusData?.data?.connected ||
            statusData?.data?.hasRefreshToken ||
            statusData?.data?.hasEnvToken;
          if (connected) {
            // Status says connected — retry the token endpoint once more.
            const retryRes = await fetch("/api/admin/dropbox/token");
            const retryData = await retryRes.json();
            if (retryData.success && retryData.data?.token) {
              setAccessToken(retryData.data.token);
              setDropboxConfigured(true);
              return;
            }
          }
        } catch {
          // Ignore status-check errors — we'll fall through to "not configured".
        }
        setDropboxConfigured(false);
      } catch (error) {
        console.error("[DropboxUploadButton] Init error:", error);
        setDropboxConfigured(false);
      }
    };

    initDropbox();
  }, []);

  /**
   * Create (or fetch an existing) public shared link for a file at `path`.
   * Returns a direct-download URL (with ?raw=1).
   */
  const createSharedLink = useCallback(
    async (path: string): Promise<string> => {
      if (!accessToken) throw new Error("No hay token de Dropbox disponible");

      const createRes = await fetch(
        "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
        {
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
        }
      );

      if (createRes.ok) {
        const data = await createRes.json();
        return convertToDirectLink(data.url);
      }

      // 409 = shared_link_already_exists → list existing links for this path
      const errorData = await createRes.json().catch(() => ({}));
      if (
        createRes.status === 409 ||
        errorData?.error_summary?.includes("shared_link_already_exists")
      ) {
        const listRes = await fetch(
          "https://api.dropboxapi.com/2/sharing/list_shared_links",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path, direct_only: true }),
          }
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData.links && listData.links.length > 0) {
            return convertToDirectLink(listData.links[0].url);
          }
        }
      }

      throw new Error(
        errorData?.error_summary || `Failed to create shared link (HTTP ${createRes.status})`
      );
    },
    [accessToken]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!accessToken) {
        setStatus("error");
        setMessage("Dropbox no está conectado");
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 3000);
        return;
      }

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
        // Build a unique Dropbox path so re-uploads with the same filename
        // don't collide.
        const ext = file.name.split(".").pop() || "";
        const baseName = file.name
          .replace(`.${ext}`, "")
          .replace(/[^a-zA-Z0-9-_]/g, "_")
          .slice(0, 60); // keep path reasonable
        const uniqueId = generateUniqueId();
        const filename = `${baseName}_${uniqueId}.${ext}`;
        const normalizedFolder = folderPath.startsWith("/")
          ? folderPath
          : `/${folderPath}`;
        const dropboxPath = `${normalizedFolder}/${filename}`;

        const arrayBuffer = await file.arrayBuffer();

        // Upload directly to Dropbox Content API from the browser.
        const uploadResponse = await fetch(
          "https://content.dropboxapi.com/2/files/upload",
          {
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
          }
        );

        if (!uploadResponse.ok) {
          const errData = await uploadResponse.json().catch(() => ({}));
          const summary = errData?.error_summary || `HTTP ${uploadResponse.status}`;
          // If the token expired mid-upload, surface a clear message and
          // attempt a one-shot refresh so the next click works.
          if (
            uploadResponse.status === 401 ||
            summary.includes("invalid_access_token") ||
            summary.includes("expired")
          ) {
            try {
              const refreshRes = await fetch("/api/admin/dropbox/token");
              const refreshData = await refreshRes.json();
              if (refreshData.success && refreshData.data?.token) {
                setAccessToken(refreshData.data.token);
              }
            } catch {
              // ignore — we'll surface the original error
            }
            throw new Error("Token expirado. Intenta de nuevo.");
          }
          throw new Error(summary);
        }

        // Create a public shared link for the uploaded file.
        const sharedUrl = await createSharedLink(dropboxPath);

        setStatus("success");
        setMessage("¡Listo!");

        // Preserve the original callback contract: (url, filename, fileSize)
        onUploadComplete(sharedUrl, file.name, file.size);

        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 2000);
      } catch (error) {
        console.error("[DropboxUploadButton] Upload error:", error);
        const errMessage = (error as Error).message || "Error al subir archivo";
        setStatus("error");
        setMessage(
          errMessage.includes("401") || errMessage.includes("expired")
            ? "Token expirado. Reconecta Dropbox en Sincronización."
            : errMessage.slice(0, 100)
        );
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 4000);
      }
    },
    [accessToken, createSharedLink, folderPath, maxSize, onUploadComplete]
  );

  const handleClick = () => {
    if (status === "uploading" || dropboxConfigured === false || disabled) return;
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
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
