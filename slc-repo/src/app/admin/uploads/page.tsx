"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropboxUploader } from "@/components/admin/DropboxUploader";
import {
  BulkDropboxUploader,
  AUDIO_TYPES,
  IMAGE_TYPES,
  VIDEO_TYPES,
  ALL_TYPES
} from "@/components/admin/BulkDropboxUploader";
import {
  ArrowLeft,
  Cloud,
  Music,
  Image as ImageIcon,
  Video,
  FileText,
  Archive,
  CheckCircle,
  ExternalLink,
  Copy,
  Trash2,
} from "lucide-react";

interface UploadedFile {
  id: string;
  url: string;
  filename: string;
  fileSize: number;
  timestamp: Date;
  type: "single" | "bulk";
}

export default function UploadsTestPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleSingleUpload = (url: string, filename: string, fileSize: number) => {
    setUploadedFiles(prev => [{
      id: Math.random().toString(36).substring(7),
      url,
      filename,
      fileSize,
      timestamp: new Date(),
      type: "single",
    }, ...prev]);
  };

  const handleBulkUploadComplete = (files: { url: string; filename: string; fileSize: number }[]) => {
    const newFiles = files.map(f => ({
      id: Math.random().toString(36).substring(7),
      url: f.url,
      filename: f.filename,
      fileSize: f.fileSize,
      timestamp: new Date(),
      type: "bulk" as const,
    }));
    setUploadedFiles(prev => [...newFiles, ...prev]);
  };

  const handleFileUploaded = (url: string, filename: string, fileSize: number) => {
    // Individual file callback for bulk uploads - already handled in handleBulkUploadComplete
    console.log(`[Uploads Test] File uploaded: ${filename} -> ${url}`);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setUploadedFiles([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
            <Cloud className="w-8 h-8 text-blue-500" />
            Test de Uploads a Dropbox
          </h1>
          <p className="text-slc-muted mt-1">
            Prueba la subida de archivos y revisa los logs en la consola del servidor
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("single")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "single"
                  ? "bg-primary text-white"
                  : "bg-slc-card text-slc-muted hover:text-white"
              }`}
            >
              Upload Individual
            </button>
            <button
              onClick={() => setActiveTab("bulk")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "bulk"
                  ? "bg-primary text-white"
                  : "bg-slc-card text-slc-muted hover:text-white"
              }`}
            >
              Bulk Upload
            </button>
          </div>

          {/* Single Upload */}
          {activeTab === "single" && (
            <div className="space-y-6">
              {/* Audio Upload */}
              <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                <h2 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                  <Music className="w-5 h-5 text-spotify" />
                  Audio
                </h2>
                <p className="text-sm text-slc-muted mb-4">
                  Soporta: MP3, WAV, FLAC, AAC, M4A, OGG, WMA, AIFF, ALAC, OPUS
                </p>
                <DropboxUploader
                  onUploadComplete={handleSingleUpload}
                  accept={AUDIO_TYPES}
                  maxSize={150}
                  folder="/test/audio"
                  label="Subir audio"
                />
              </div>

              {/* Image Upload */}
              <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                <h2 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-500" />
                  Imágenes
                </h2>
                <p className="text-sm text-slc-muted mb-4">
                  Soporta: JPG, PNG, GIF, WebP, SVG, BMP, TIFF, ICO
                </p>
                <DropboxUploader
                  onUploadComplete={handleSingleUpload}
                  accept={IMAGE_TYPES}
                  maxSize={20}
                  folder="/test/images"
                  label="Subir imagen"
                />
              </div>

              {/* Video Upload */}
              <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                <h2 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-red-500" />
                  Video
                </h2>
                <p className="text-sm text-slc-muted mb-4">
                  Soporta: MP4, MOV, AVI, MKV, WMV, FLV, WebM
                </p>
                <DropboxUploader
                  onUploadComplete={handleSingleUpload}
                  accept={VIDEO_TYPES}
                  maxSize={150}
                  folder="/test/videos"
                  label="Subir video"
                />
              </div>

              {/* Archive Upload */}
              <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                <h2 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-yellow-500" />
                  Archivos ZIP
                </h2>
                <p className="text-sm text-slc-muted mb-4">
                  Soporta: ZIP, RAR, 7z, TAR, GZ
                </p>
                <DropboxUploader
                  onUploadComplete={handleSingleUpload}
                  accept=".zip,.rar,.7z,.tar,.gz"
                  maxSize={150}
                  folder="/test/archives"
                  label="Subir archivo"
                />
              </div>
            </div>
          )}

          {/* Bulk Upload */}
          {activeTab === "bulk" && (
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                Bulk Upload
              </h2>
              <p className="text-sm text-slc-muted mb-4">
                Sube múltiples archivos a la vez. Soporta todos los tipos de archivo.
              </p>
              <BulkDropboxUploader
                onUploadComplete={handleBulkUploadComplete}
                onFileUploaded={handleFileUploaded}
                accept={ALL_TYPES}
                maxSize={150}
                maxFiles={20}
                folder="/test/bulk"
                label="Subir múltiples archivos"
              />
            </div>
          )}

          {/* Supported formats info */}
          <div className="bg-slc-card/50 border border-slc-border rounded-xl p-6">
            <h3 className="font-oswald text-lg uppercase mb-4">Formatos Soportados</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slc-muted mb-1">Audio:</p>
                <p className="text-green-500">MP3, WAV, FLAC, AAC, M4A, OGG, WMA, AIFF, OPUS</p>
              </div>
              <div>
                <p className="text-slc-muted mb-1">Imágenes:</p>
                <p className="text-purple-500">JPG, PNG, GIF, WebP, SVG, BMP, TIFF</p>
              </div>
              <div>
                <p className="text-slc-muted mb-1">Video:</p>
                <p className="text-red-500">MP4, MOV, AVI, MKV, WMV, FLV, WebM</p>
              </div>
              <div>
                <p className="text-slc-muted mb-1">Otros:</p>
                <p className="text-yellow-500">ZIP, RAR, 7z, PDF, DOC</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slc-border">
              <h2 className="font-oswald text-lg uppercase">
                Archivos Subidos ({uploadedFiles.length})
              </h2>
              {uploadedFiles.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>

            {uploadedFiles.length === 0 ? (
              <div className="p-12 text-center">
                <Cloud className="w-12 h-12 mx-auto mb-4 text-slc-muted opacity-50" />
                <p className="text-slc-muted">
                  Los archivos subidos aparecerán aquí
                </p>
                <p className="text-sm text-slc-muted mt-2">
                  Revisa los logs en la consola del servidor para ver el progreso
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slc-border max-h-[600px] overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="p-4 hover:bg-slc-card/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.filename}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slc-muted">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            file.type === "bulk"
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-green-500/20 text-green-500"
                          }`}>
                            {file.type === "bulk" ? "Bulk" : "Single"}
                          </span>
                          <span>{file.timestamp.toLocaleTimeString()}</span>
                        </div>
                        <div className="mt-2 p-2 bg-slc-card rounded text-xs font-mono break-all text-slc-muted">
                          {file.url}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyUrl(file.url)}
                            className="h-7"
                          >
                            {copiedUrl === file.url ? (
                              <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3 mr-1" />
                            )}
                            {copiedUrl === file.url ? "Copiado" : "Copiar URL"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-7"
                          >
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Abrir
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="h-7 text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
            <h3 className="font-oswald text-lg uppercase mb-3 text-blue-500">
              Ver Logs del Servidor
            </h3>
            <p className="text-sm text-blue-300">
              Para ver los logs detallados de cada upload, abre la terminal donde
              está corriendo el servidor de desarrollo. Verás información como:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-blue-300">
              <li>• Nombre y tamaño del archivo</li>
              <li>• Ruta en Dropbox</li>
              <li>• Tiempo de upload</li>
              <li>• URL del archivo compartido</li>
              <li>• Errores (si los hay)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
