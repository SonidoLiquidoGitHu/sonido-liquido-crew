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
 * "Is Dropbox connected?" is determined from the **status** endpoint
 * (`GET /api/admin/dropbox`), which is the same source of truth the Sync page
 * uses. The token is fetched lazily on click — this avoids prematurely
 * disabling the button in cases where the status endpoint says "connected"
 * but the token endpoint transiently fails (e.g., a network blip during
 * auto-refresh). If the token endpoint does fail at click time, we surface
 * the actual error message so the user knows what to do next.
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Dropbox connection status on mount using the SAME endpoint the Sync
  // page uses. This is the source of truth for "is Dropbox connected" — it
  // handles all configurations (DB token, env token, OAuth, manual token) and
  // auto-refreshes expired tokens on the server side. We deliberately do NOT
  // use the token endpoint here: that endpoint returns 401/500 in several
  // transient scenarios where status still reports "connected", which would
  // cause the button to incorrectly disable.
  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        console.log("[DropboxUploadButton] Checking Dropbox status...");
        const res = await fetch("/api/admin/dropbox");
        const data = await res.json();

        if (cancelled) return;

        // Match the same "connected" logic used by other Dropbox components
        // and the Sync page UI.
        const isConnected =
          data?.success &&
          (data?.data?.connected === true ||
            data?.data?.hasEnvToken === true ||
            data?.data?.hasDatabaseToken === true ||
            data?.data?.hasRefreshToken === true ||
            data?.data?.configured === true);

        console.log("[DropboxUploadButton] Status check result:", {
          success: data?.success,
          connected: data?.data?.connected,
          hasEnvToken: data?.data?.hasEnvToken,
          hasDatabaseToken: data?.data?.hasDatabaseToken,
          hasRefreshToken: data?.data?.hasRefreshToken,
          configured: data?.data?.configured,
          isConnected,
        });

        setDropboxConfigured(isConnected);
      } catch (error) {
        console.error("[DropboxUploadButton] Status check error:", error);
        if (!cancelled) setDropboxConfigured(false);
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Fetch a fresh access token from the server. The token endpoint
   * auto-refreshes expired tokens using the stored refresh_token, so each
   * call returns a usable token (or a clear error).
   *
   * Returns null on failure; the caller surfaces the error to the user.
   */
  const fetchAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/admin/dropbox/token");
      const data = await res.json();
      if (data?.success && data?.data?.token) {
        return data.data.token as string;
      }
      console.warn("[DropboxUploadButton] Token endpoint returned no token:", data);
      return null;
    } catch (error) {
      console.error("[DropboxUploadButton] Token fetch error:", error);
      return null;
    }
  }, []);

  /**
   * Create (or fetch an existing) public shared link for a file at `path`.
   * Returns a direct-download URL (with ?raw=1).
   */
  const createSharedLink = useCallback(
    async (path: string, token: string): Promise<string> => {
      const createRes = await fetch(
        "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
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
              Authorization: `Bearer ${token}`,
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
    []
  );

  const uploadFile = useCallback(
    async (file: File) => {
      // Validate file size first — no point fetching a token for an oversized file.
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
      setMessage("Conectando con Dropbox...");

      // Lazily fetch a fresh access token at click time. This is more reliable
      // than caching it on mount because the token endpoint auto-refreshes
      // expired tokens server-side. If this fails, we surface a specific error.
      let token = await fetchAccessToken();
      if (!token) {
        setStatus("error");
        setMessage(
          "No se pudo obtener el token de Dropbox. Ve a Sincronización → Dropbox y verifica la conexión."
        );
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 5000);
        return;
      }

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

        setMessage("Subiendo...");

        // Upload directly to Dropbox Content API from the browser.
        let uploadResponse = await fetch(
          "https://content.dropboxapi.com/2/files/upload",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
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

        // If the token expired mid-upload, fetch a fresh one and retry once.
        if (
          uploadResponse.status === 401 ||
          (await uploadResponse
            .json()
            .catch(() => ({}))
            .then((d) =>
              (d?.error_summary || "").includes("invalid_access_token") ||
              (d?.error_summary || "").includes("expired")
            ))
        ) {
          console.log("[DropboxUploadButton] Token expired mid-upload, refreshing and retrying...");
          const refreshedToken = await fetchAccessToken();
          if (refreshedToken) {
            token = refreshedToken;
            uploadResponse = await fetch(
              "https://content.dropboxapi.com/2/files/upload",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
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
          }
        }

        if (!uploadResponse.ok) {
          const errData = await uploadResponse.json().catch(() => ({}));
          const summary = errData?.error_summary || `HTTP ${uploadResponse.status}`;
          throw new Error(summary);
        }

        setMessage("Creando enlace...");

        // Create a public shared link for the uploaded file.
        const sharedUrl = await createSharedLink(dropboxPath, token);

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
            : errMessage.slice(0, 120)
        );
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 5000);
      }
    },
    [createSharedLink, fetchAccessToken, folderPath, maxSize, onUploadComplete]
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

  // Show warning if Dropbox is definitively NOT configured (status endpoint
  // returned connected=false). While status is still loading (null), we render
  // the normal button disabled so the UI doesn't flicker to the warning state.
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
