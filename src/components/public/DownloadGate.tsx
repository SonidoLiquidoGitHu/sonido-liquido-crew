"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Check,
  Mail,
  Lock,
  Unlock,
  ExternalLink,
  Image as ImageIcon,
  Music,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadFile {
  name: string;
  type: "remix" | "wallpaper" | "acapella" | "beat" | "stems" | "other";
  url: string;
  fileName: string;
  fileSize?: string;
}

interface DownloadGateProps {
  releaseId: string;
  releaseTitle: string;
  files: DownloadFile[];
  spotifyPresaveUrl?: string | null;
  hyperfollowUrl?: string | null;
  requirePresave: boolean;
  requireHyperfollow: boolean;
  requireEmail: boolean;
}

const fileTypeLabels: Record<string, string> = {
  remix: "Remix",
  wallpaper: "Wallpaper",
  acapella: "Acapella",
  beat: "Beat",
  stems: "Stems",
  other: "Otro",
};

const fileTypeIcons: Record<string, typeof Music> = {
  remix: Music,
  wallpaper: ImageIcon,
  acapella: Music,
  beat: Music,
  stems: Music,
  other: Download,
};

export function DownloadGate({
  releaseId,
  releaseTitle,
  files,
  spotifyPresaveUrl,
  hyperfollowUrl,
  requirePresave,
  requireHyperfollow,
  requireEmail,
}: DownloadGateProps) {
  const [presaveCompleted, setPresaveCompleted] = useState(false);
  const [hyperfollowCompleted, setHyperfollowCompleted] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const allActionsCompleted =
    (!requirePresave || presaveCompleted) &&
    (!requireHyperfollow || hyperfollowCompleted) &&
    (!requireEmail || emailSubmitted);

  const handlePresave = () => {
    if (spotifyPresaveUrl) {
      window.open(spotifyPresaveUrl, "_blank");
      setTimeout(() => setPresaveCompleted(true), 2000);
    }
  };

  const handleHyperfollow = () => {
    if (hyperfollowUrl) {
      window.open(hyperfollowUrl, "_blank");
      setTimeout(() => setHyperfollowCompleted(true), 2000);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email) return;
    setSubmitting(true);
    try {
      // Subscribe the email
      await fetch("/api/upcoming-releases/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId, email }),
      });
      setEmailSubmitted(true);
    } catch {
      // Still mark as completed even if API fails
      setEmailSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = () => {
    if (allActionsCompleted) {
      setUnlocked(true);
    }
  };

  if (files.length === 0) return null;

  return (
    <div className="mt-12 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            {unlocked ? (
              <Unlock className="w-6 h-6 text-primary" />
            ) : (
              <Lock className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-oswald text-xl uppercase">
              Contenido Exclusivo
            </h2>
            <p className="text-sm text-slc-muted">
              {unlocked
                ? "Descarga el contenido exclusivo de este lanzamiento"
                : "Completa las acciones para desbloquear descargas exclusivas"}
            </p>
          </div>
        </div>
      </div>

      {/* Files Preview */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {files.map((file, index) => {
            const Icon = fileTypeIcons[file.type] || Download;
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  unlocked
                    ? "bg-primary/10 border-primary/20"
                    : "bg-slc-dark/50 border-slc-border/50 opacity-60"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-slc-muted">{fileTypeLabels[file.type] || file.type}</p>
                </div>
                {unlocked && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-primary hover:text-primary/80 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {!unlocked && (
          <>
            {/* Action Steps */}
            <div className="space-y-3 mb-6">
              {/* Presave Action */}
              {requirePresave && spotifyPresaveUrl && (
                <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        presaveCompleted ? "bg-green-500" : "bg-primary/20"
                      )}>
                        {presaveCompleted ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-sm">Haz Pre-save en Spotify</span>
                    </div>
                    <Button
                      onClick={handlePresave}
                      variant={presaveCompleted ? "outline" : "default"}
                      size="sm"
                      disabled={presaveCompleted}
                      className={presaveCompleted ? "border-green-500 text-green-500" : ""}
                    >
                      {presaveCompleted ? "Hecho" : "Pre-save"}
                    </Button>
                  </div>
                </div>
              )}

              {/* HyperFollow Action */}
              {requireHyperfollow && hyperfollowUrl && (
                <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        hyperfollowCompleted ? "bg-green-500" : "bg-orange-500/20"
                      )}>
                        {hyperfollowCompleted ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <ExternalLink className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                      <span className="font-medium text-sm">Sigue en HyperFollow</span>
                    </div>
                    <Button
                      onClick={handleHyperfollow}
                      variant={hyperfollowCompleted ? "outline" : "default"}
                      size="sm"
                      disabled={hyperfollowCompleted}
                      className={hyperfollowCompleted ? "border-green-500 text-green-500" : "bg-orange-500 hover:bg-orange-600"}
                    >
                      {hyperfollowCompleted ? "Hecho" : "Seguir"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Email Action */}
              {requireEmail && (
                <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      emailSubmitted ? "bg-green-500" : "bg-slc-border"
                    )}>
                      {emailSubmitted ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Mail className="w-4 h-4 text-slc-muted" />
                      )}
                    </div>
                    <span className="font-medium text-sm">Ingresa tu email</span>
                  </div>
                  {emailSubmitted ? (
                    <p className="text-xs text-green-500">Email registrado</p>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="flex-1 px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                      />
                      <Button
                        onClick={handleEmailSubmit}
                        disabled={!email || submitting}
                        size="sm"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Unlock Button */}
            <Button
              onClick={handleUnlock}
              disabled={!allActionsCompleted}
              className="w-full h-12 bg-primary hover:bg-primary/90 font-bold uppercase tracking-wide gap-2"
            >
              {allActionsCompleted ? (
                <>
                  <Unlock className="w-5 h-5" />
                  Desbloquear Descargas
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Completa las acciones para desbloquear
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
