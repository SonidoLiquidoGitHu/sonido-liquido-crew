"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertTriangle, Music } from "lucide-react";

export function SpotifySyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [syncingReleases, setSyncingReleases] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSyncArtists = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sync" }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({
          type: "success",
          message: data.message || `Synced ${data.processed} artists`,
        });
      } else {
        setResult({
          type: "error",
          message: data.error?.message || data.error || "Sync failed",
        });
      }
    } catch (error) {
      setResult({
        type: "error",
        message: "Network error - please try again",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncReleases = async () => {
    setSyncingReleases(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync/spotify-releases", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setResult({
          type: "success",
          message:
            data.message ||
            `Synced ${data.newReleasesCreated} new releases from ${data.totalArtistsProcessed} artists`,
        });
      } else {
        setResult({
          type: "error",
          message: data.error || "Releases sync failed",
        });
      }
    } catch (error) {
      setResult({
        type: "error",
        message: "Network error - please try again",
      });
    } finally {
      setSyncingReleases(false);
    }
  };

  const isSyncing = syncing || syncingReleases;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={handleSyncArtists}
          disabled={isSyncing}
          variant="outline"
        >
          {syncing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Music className="w-4 h-4 mr-2" />
          )}
          Sync Imágenes
        </Button>
        <Button
          size="sm"
          onClick={handleSyncReleases}
          disabled={isSyncing}
          variant="outline"
        >
          {syncingReleases ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Music className="w-4 h-4 mr-2" />
          )}
          Sync Lanzamientos
        </Button>
      </div>

      {result && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            result.type === "success"
              ? "bg-green-500/10 text-green-500 border border-green-500/20"
              : "bg-red-500/10 text-red-500 border border-red-500/20"
          }`}
        >
          {result.type === "success" ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}
