"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as musicMetadata from "music-metadata-browser";
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Music,
  FolderUp,
  FileAudio,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  FileText,
  Wand2,
  User,
  Check,
} from "lucide-react";

interface AudioFileInfo {
  id: string;
  file: File;
  title: string;
  artist: string;
  duration: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  url?: string;
  error?: string;
  trackNumber?: number;
}

interface BulkAudioUploaderProps {
  onUploadComplete: (tracks: { title: string; artist?: string; url: string; duration: string; trackNumber?: number }[]) => void;
  folder?: string;
  maxSize?: number;
  maxFiles?: number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getAudioDuration(file: File): Promise<string> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      if (audio.duration && isFinite(audio.duration)) {
        resolve(formatDuration(audio.duration));
      } else {
        resolve("");
      }
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      resolve("");
    };
    audio.src = URL.createObjectURL(file);
  });
}

interface ID3Tags {
  title?: string;
  artist?: string;
  track?: string;
}

async function readID3Tags(file: File): Promise<ID3Tags> {
  try {
    const metadata = await musicMetadata.parseBlob(file);
    const common = metadata.common;
    return {
      title: common.title || undefined,
      artist: common.artist || undefined,
      track: common.track?.no?.toString() || undefined,
    };
  } catch (error) {
    console.warn("Could not read ID3 tags:", error);
    return {};
  }
}

function cleanFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/^(mp3|wav|flac|m4a|aac|ogg|wma|aiff)[\s_-]*/gi, "")
    .replace(/^(mp3|wav|flac|m4a)[_\s-]*(mp3|wav|flac|m4a)[_\s-]*(mp3|wav|flac|m4a)[_\s-]*/gi, "")
    .replace(/\b(\w+)(\s+\1)+\b/gi, "$1")
    .replace(/^\d+[\s._-]+/, "")
    .replace(/[\s_-]*(master|final|mix|mastered|v\d+)[\s_-]*$/gi, "")
    .replace(/[\s_-]*\d+\s*bpm[\s_-]*(master|final|mix)?[\s_-]*(pe)?$/gi, "")
    .replace(/[\s_-]*\d*\s*bpm\s*master\s*pe$/gi, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function BulkAudioUploader({
  onUploadComplete,
  folder = "/media-releases/tracks",
  maxSize = 150,
  maxFiles = 30,
}: BulkAudioUploaderProps) {
  const [files, setFiles] = useState<AudioFileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamePattern, setRenamePattern] = useState("{n}. {title}");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const processFiles = useCallback(async (selectedFiles: FileList | File[]) => {
    const audioFiles = Array.from(selectedFiles).filter(
      (f) => f.type.startsWith("audio/") ||
             /\.(mp3|wav|flac|m4a|aac|ogg|wma|aiff)$/i.test(f.name)
    );

    if (audioFiles.length === 0) {
      alert("No se encontraron archivos de audio válidos");
      return;
    }

    if (files.length + audioFiles.length > maxFiles) {
      alert(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    // Sort files by name first
    audioFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // Process files with ID3 tags
    const newFiles: AudioFileInfo[] = await Promise.all(
      audioFiles.map(async (file, index) => {
        const [duration, id3] = await Promise.all([
          getAudioDuration(file),
          readID3Tags(file),
        ]);

        // Extract track number from filename if not in ID3
        const filenameMatch = file.name.match(/^(\d+)/);
        const trackNum = id3.track ? parseInt(id3.track) : (filenameMatch ? parseInt(filenameMatch[1]) : undefined);

        return {
          id: generateId(),
          file,
          title: id3.title || cleanFilename(file.name),
          artist: id3.artist || "",
          duration,
          status: "pending" as const,
          progress: 0,
          trackNumber: trackNum,
        };
      })
    );

    // Sort by track number if available
    newFiles.sort((a, b) => {
      if (a.trackNumber && b.trackNumber) return a.trackNumber - b.trackNumber;
      if (a.trackNumber) return -1;
      if (b.trackNumber) return 1;
      return 0;
    });

    setFiles((prev) => [...prev, ...newFiles]);
  }, [files.length, maxFiles]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFile = (id: string, updates: Partial<AudioFileInfo>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    setFiles((prev) => {
      const draggedIndex = prev.findIndex((f) => f.id === draggedId);
      const targetIndex = prev.findIndex((f) => f.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newFiles = [...prev];
      const [draggedFile] = newFiles.splice(draggedIndex, 1);
      newFiles.splice(targetIndex, 0, draggedFile);
      return newFiles;
    });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const moveFile = (id: string, direction: "up" | "down") => {
    setFiles((prev) => {
      const index = prev.findIndex((f) => f.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;

      const newFiles = [...prev];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
      return newFiles;
    });
  };

  const togglePlay = (id: string) => {
    const audio = audioRefs.current[id];
    if (!audio) return;

    if (playingId === id) {
      audio.pause();
      setPlayingId(null);
    } else {
      if (playingId && audioRefs.current[playingId]) {
        audioRefs.current[playingId]?.pause();
      }
      audio.play();
      setPlayingId(id);
    }
  };

  // Pattern renaming
  const applyRenamePattern = () => {
    setFiles((prev) =>
      prev.map((f, index) => {
        if (f.status !== "pending") return f;

        let newTitle = renamePattern
          .replace("{n}", String(index + 1).padStart(2, "0"))
          .replace("{N}", String(index + 1))
          .replace("{title}", f.title)
          .replace("{artist}", f.artist || "")
          .replace("{filename}", cleanFilename(f.file.name));

        return { ...f, title: newTitle.trim() };
      })
    );
    setShowRenameModal(false);
  };

  // Export tracklist
  const getExportText = () => {
    return files
      .map((f, i) => {
        const num = String(i + 1).padStart(2, "0");
        const artistPart = f.artist ? ` - ${f.artist}` : "";
        return `${num}. ${f.title}${artistPart} (${f.duration})`;
      })
      .join("\n");
  };

  const copyExportText = async () => {
    try {
      await navigator.clipboard.writeText(getExportText());
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Helper to add delay between uploads
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const uploadFile = async (fileInfo: AudioFileInfo, retryCount = 0): Promise<{ title: string; artist?: string; url: string; duration: string; trackNumber?: number } | null> => {
    if (fileInfo.file.size > maxSize * 1024 * 1024) {
      updateFile(fileInfo.id, { status: "error", error: `Archivo excede ${maxSize}MB` });
      return null;
    }

    // Warn about large WAV files that may timeout
    const isLargeWav = fileInfo.file.name.toLowerCase().endsWith('.wav') && fileInfo.file.size > 15 * 1024 * 1024;
    if (isLargeWav && retryCount === 0) {
      console.warn(`[BulkUpload] Large WAV file detected (${(fileInfo.file.size / 1024 / 1024).toFixed(1)}MB): ${fileInfo.file.name}. Consider converting to MP3.`);
    }

    updateFile(fileInfo.id, { status: "uploading", progress: 10 });

    try {
      const formData = new FormData();
      formData.append("file", fileInfo.file);
      formData.append("folder", folder);

      updateFile(fileInfo.id, { progress: 30 });

      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      let response: Response;
      try {
        response = await fetch("/api/admin/dropbox/upload", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      updateFile(fileInfo.id, { progress: 80 });

      // Check if response is ok first
      if (!response.ok) {
        // Try to get error message from response
        let errorMsg = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          // If we can't parse JSON, use the status text
          errorMsg = response.statusText || errorMsg;
        }

        // Check if we should retry (rate limiting or server error)
        if ((response.status === 429 || response.status >= 500) && retryCount < 4) {
          // Exponential backoff: 4s, 8s, 16s, 32s for rate limiting/server errors
          const delayMs = Math.pow(2, retryCount) * 4000;
          console.log(`[BulkUpload] Error ${response.status}, retrying ${fileInfo.file.name} in ${delayMs}ms (attempt ${retryCount + 1}/4)`);
          updateFile(fileInfo.id, { status: "uploading", progress: 5, error: undefined });
          await delay(delayMs);
          return uploadFile(fileInfo, retryCount + 1);
        }

        throw new Error(errorMsg);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // Server might have timed out or returned HTML error
        if (retryCount < 3) {
          const delayMs = Math.pow(2, retryCount) * 3000;
          console.log(`[BulkUpload] Non-JSON response, retrying ${fileInfo.file.name} in ${delayMs}ms`);
          updateFile(fileInfo.id, { status: "pending", progress: 0, error: `Servidor ocupado, reintentando en ${delayMs/1000}s...` });
          await delay(delayMs);
          return uploadFile(fileInfo, retryCount + 1);
        }
        throw new Error("El servidor no respondió correctamente. Intenta con menos archivos a la vez.");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Error al subir archivo");
      }

      updateFile(fileInfo.id, { status: "success", progress: 100, url: data.data.url });

      return {
        title: fileInfo.title,
        artist: fileInfo.artist || undefined,
        url: data.data.url,
        duration: fileInfo.duration,
        trackNumber: fileInfo.trackNumber,
      };
    } catch (error) {
      const errMsg = (error as Error).message;

      // Handle abort error (timeout)
      if (errMsg === "The operation was aborted." || errMsg.includes("abort")) {
        if (retryCount < 2) {
          const delayMs = 3000;
          console.log(`[BulkUpload] Upload timed out, retrying ${fileInfo.file.name}`);
          updateFile(fileInfo.id, { status: "pending", progress: 0, error: "Tiempo agotado, reintentando..." });
          await delay(delayMs);
          return uploadFile(fileInfo, retryCount + 1);
        }
        const isWav = fileInfo.file.name.toLowerCase().endsWith('.wav');
        const errorMsg = isWav
          ? "Timeout. Convierte a MP3 para evitar este error."
          : "Tiempo agotado. El archivo puede ser muy grande.";
        updateFile(fileInfo.id, { status: "error", error: errorMsg });
        return null;
      }

      // Add helpful message for HTTP 500 errors with large files
      if (errMsg.includes("500")) {
        const fileSizeMB = fileInfo.file.size / (1024 * 1024);
        const isWav = fileInfo.file.name.toLowerCase().endsWith('.wav');

        if (fileSizeMB > 5) {
          const suggestion = isWav
            ? "Archivo grande. Convierte a MP3 o intenta de nuevo."
            : "Archivo grande (~" + fileSizeMB.toFixed(1) + "MB). Intenta de nuevo con 'Reintentar'.";
          updateFile(fileInfo.id, { status: "error", error: suggestion });
          return null;
        }

        // For smaller files, suggest retry
        updateFile(fileInfo.id, { status: "error", error: "Error temporal. Haz clic en 'Reintentar'." });
        return null;
      }

      updateFile(fileInfo.id, { status: "error", error: errMsg });
      return null;
    }
  };

  const retryFile = (id: string) => {
    updateFile(id, { status: "pending", error: undefined, progress: 0 });
  };

  const uploadAll = async () => {
    setIsUploading(true);
    const results: { title: string; artist?: string; url: string; duration: string; trackNumber?: number }[] = [];

    const pendingFiles = files.filter(f => f.status === "pending");
    console.log(`[BulkAudioUploader] Starting upload of ${pendingFiles.length} files`);

    for (let i = 0; i < pendingFiles.length; i++) {
      const fileInfo = pendingFiles[i];

      // Add a delay between uploads to avoid rate limiting (except for first file)
      // Using 2.5s to better handle Dropbox rate limits
      if (i > 0) {
        await delay(2500);
      }

      console.log(`[BulkAudioUploader] Uploading file ${i + 1}/${pendingFiles.length}: ${fileInfo.file.name}`);
      const result = await uploadFile(fileInfo);
      if (result) {
        console.log(`[BulkAudioUploader] File ${i + 1} uploaded successfully:`, result.title);
        results.push(result);
      } else {
        console.log(`[BulkAudioUploader] File ${i + 1} failed to upload`);
      }
    }

    setIsUploading(false);
    console.log(`[BulkAudioUploader] Upload complete. ${results.length}/${pendingFiles.length} successful`);

    if (results.length > 0) {
      console.log(`[BulkAudioUploader] Calling onUploadComplete with ${results.length} tracks:`, results);
      onUploadComplete(results);
    } else {
      console.warn(`[BulkAudioUploader] No tracks to add - all uploads failed`);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setPlayingId(null);
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "success"));
  };

  const retryAllFailed = async () => {
    // Reset all failed files to pending
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "error" ? { ...f, status: "pending" as const, error: undefined, progress: 0 } : f
      )
    );
    // Then trigger upload
    setTimeout(() => {
      uploadAll();
    }, 100);
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragOver
            ? "border-spotify bg-spotify/5"
            : "border-slc-border hover:border-spotify/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.wma,.aiff"
          onChange={handleFileSelect}
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <FolderUp className="w-12 h-12 mx-auto mb-4 text-spotify" />
        <h3 className="font-oswald text-lg uppercase mb-2">
          Subir Múltiples Tracks
        </h3>
        <p className="text-sm text-slc-muted mb-2">
          Arrastra archivos de audio o haz clic para seleccionar
        </p>
        <p className="text-xs text-slc-muted">
          MP3, WAV, FLAC, M4A, AAC • Máximo {maxSize}MB • Hasta {maxFiles} archivos
        </p>
        <p className="text-xs text-yellow-500 mt-2">
          Recomendado: Usa MP3 en lugar de WAV para evitar timeouts
        </p>
        <p className="text-xs text-primary mt-2">
          Los metadatos ID3 (título, artista) se detectan automáticamente
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slc-border">
            <div className="flex items-center gap-4">
              <span className="font-oswald text-lg uppercase">
                {files.length} Track{files.length !== 1 ? "s" : ""}
              </span>
              {successCount > 0 && (
                <span className="text-sm text-green-500">{successCount} subido{successCount !== 1 ? "s" : ""}</span>
              )}
              {errorCount > 0 && (
                <span className="text-sm text-red-500">{errorCount} error{errorCount !== 1 ? "es" : ""}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Retry failed button */}
              {errorCount > 0 && !isUploading && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={retryAllFailed}
                  className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reintentar ({errorCount})
                </Button>
              )}
              {/* Rename button */}
              {pendingCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRenameModal(true)}
                >
                  <Wand2 className="w-4 h-4 mr-1" />
                  Renombrar
                </Button>
              )}
              {/* Export button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowExportModal(true)}
              >
                <FileText className="w-4 h-4 mr-1" />
                Exportar
              </Button>
              {successCount > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={clearCompleted}>
                  Limpiar completados
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={isUploading}>
                <Trash2 className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            </div>
          </div>

          {/* Files */}
          <div className="divide-y divide-slc-border max-h-[500px] overflow-y-auto">
            {files.map((fileInfo, index) => (
              <div
                key={fileInfo.id}
                draggable={fileInfo.status === "pending"}
                onDragStart={(e) => handleDragStart(e, fileInfo.id)}
                onDragOver={(e) => handleDragOver(e, fileInfo.id)}
                onDragEnd={handleDragEnd}
                className={`p-4 transition-all ${
                  fileInfo.status === "success"
                    ? "bg-green-500/5"
                    : fileInfo.status === "error"
                    ? "bg-red-500/5"
                    : ""
                } ${draggedId === fileInfo.id ? "opacity-50 bg-primary/10" : ""} ${
                  fileInfo.status === "pending" ? "cursor-grab active:cursor-grabbing" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Drag handle & track number */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    {fileInfo.status === "pending" && (
                      <GripVertical className="w-4 h-4 text-slc-muted" />
                    )}
                    <span className="w-8 h-8 rounded-full bg-slc-card flex items-center justify-center font-oswald text-sm text-slc-muted">
                      {index + 1}
                    </span>
                    {fileInfo.status === "pending" && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveFile(fileInfo.id, "up")}
                          disabled={index === 0}
                          className="p-0.5 text-slc-muted hover:text-white disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFile(fileInfo.id, "down")}
                          disabled={index === files.length - 1}
                          className="p-0.5 text-slc-muted hover:text-white disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Status icon */}
                  <div className="w-8 flex-shrink-0 pt-2">
                    {fileInfo.status === "pending" && <FileAudio className="w-6 h-6 text-slc-muted" />}
                    {fileInfo.status === "uploading" && <Loader2 className="w-6 h-6 text-spotify animate-spin" />}
                    {fileInfo.status === "success" && <CheckCircle className="w-6 h-6 text-green-500" />}
                    {fileInfo.status === "error" && <AlertTriangle className="w-6 h-6 text-red-500" />}
                  </div>

                  {/* File info & editable fields */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Title and Duration row */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={fileInfo.title}
                        onChange={(e) => updateFile(fileInfo.id, { title: e.target.value })}
                        className="flex-1 h-9 text-sm font-medium bg-slc-card"
                        placeholder="Título del track"
                        disabled={fileInfo.status === "uploading" || fileInfo.status === "success"}
                      />
                      <Input
                        type="text"
                        value={fileInfo.duration}
                        onChange={(e) => updateFile(fileInfo.id, { duration: e.target.value })}
                        className="w-16 h-9 text-sm text-center bg-slc-card"
                        placeholder="0:00"
                        disabled={fileInfo.status === "uploading" || fileInfo.status === "success"}
                      />
                    </div>

                    {/* Artist row */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-slc-muted">
                        <User className="w-3 h-3" />
                      </div>
                      <Input
                        type="text"
                        value={fileInfo.artist}
                        onChange={(e) => updateFile(fileInfo.id, { artist: e.target.value })}
                        className="flex-1 h-8 text-xs bg-slc-card"
                        placeholder="Artista / Featuring (opcional)"
                        disabled={fileInfo.status === "uploading" || fileInfo.status === "success"}
                      />
                    </div>

                    {/* Original filename & size */}
                    <div className="flex items-center gap-2 text-xs text-slc-muted">
                      <span className="truncate max-w-[250px]">{fileInfo.file.name}</span>
                      <span>•</span>
                      <span>{(fileInfo.file.size / 1024 / 1024).toFixed(1)} MB</span>
                      {fileInfo.trackNumber && (
                        <>
                          <span>•</span>
                          <span className="text-primary">Track #{fileInfo.trackNumber}</span>
                        </>
                      )}
                    </div>

                    {/* Error message */}
                    {fileInfo.status === "error" && fileInfo.error && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-red-500">{fileInfo.error}</p>
                        <button
                          type="button"
                          onClick={() => retryFile(fileInfo.id)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reintentar
                        </button>
                      </div>
                    )}

                    {/* Upload progress */}
                    {fileInfo.status === "uploading" && (
                      <div className="w-full bg-slc-border rounded-full h-1.5">
                        <div
                          className="bg-spotify h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${fileInfo.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Audio preview */}
                  {fileInfo.status === "pending" && (
                    <div className="flex-shrink-0">
                      <audio
                        ref={(el) => { audioRefs.current[fileInfo.id] = el; }}
                        src={URL.createObjectURL(fileInfo.file)}
                        onEnded={() => setPlayingId(null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePlay(fileInfo.id)}
                        className="text-slc-muted hover:text-spotify"
                      >
                        {playingId === fileInfo.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}

                  {/* Audio player for successful uploads */}
                  {fileInfo.status === "success" && fileInfo.url && (
                    <audio controls src={fileInfo.url} className="h-8 w-36 flex-shrink-0" />
                  )}

                  {/* Remove button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(fileInfo.id)}
                    disabled={fileInfo.status === "uploading"}
                    className="text-slc-muted hover:text-red-500 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload button */}
          {pendingCount > 0 && (
            <div className="p-4 border-t border-slc-border bg-slc-card/50">
              <Button
                type="button"
                onClick={uploadAll}
                disabled={isUploading}
                className="w-full bg-spotify hover:bg-spotify/90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir {pendingCount} Track{pendingCount !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Manual track add button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full"
      >
        <Music className="w-4 h-4 mr-2" />
        Agregar Track Manualmente
      </Button>

      {/* Rename Pattern Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowRenameModal(false)}>
          <div className="bg-slc-dark border border-slc-border rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Renombrar Tracks
            </h3>
            <p className="text-sm text-slc-muted mb-4">
              Usa un patrón para renombrar todos los tracks pendientes:
            </p>
            <div className="space-y-3 mb-4">
              <Input
                value={renamePattern}
                onChange={(e) => setRenamePattern(e.target.value)}
                placeholder="{n}. {title}"
                className="bg-slc-card"
              />
              <div className="text-xs text-slc-muted space-y-1">
                <p><code className="text-primary">{"{n}"}</code> - Número con cero (01, 02...)</p>
                <p><code className="text-primary">{"{N}"}</code> - Número sin cero (1, 2...)</p>
                <p><code className="text-primary">{"{title}"}</code> - Título actual</p>
                <p><code className="text-primary">{"{artist}"}</code> - Artista</p>
                <p><code className="text-primary">{"{filename}"}</code> - Nombre de archivo limpio</p>
              </div>
              <div className="p-3 bg-slc-card rounded-lg">
                <p className="text-xs text-slc-muted mb-1">Vista previa (primer track):</p>
                <p className="text-sm font-medium">
                  {files[0] && renamePattern
                    .replace("{n}", "01")
                    .replace("{N}", "1")
                    .replace("{title}", files[0].title)
                    .replace("{artist}", files[0].artist || "")
                    .replace("{filename}", cleanFilename(files[0].file.name))}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyRenamePattern} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Aplicar
              </Button>
              <Button variant="outline" onClick={() => setShowRenameModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowExportModal(false)}>
          <div className="bg-slc-dark border border-slc-border rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Exportar Tracklist
            </h3>
            <textarea
              readOnly
              value={getExportText()}
              className="w-full h-64 p-3 bg-slc-card border border-slc-border rounded-lg text-sm font-mono resize-none focus:outline-none"
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={copyExportText} className="flex-1">
                {exportCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar al portapapeles
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowExportModal(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
