"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Copy, Loader2 } from "lucide-react";
import { useState } from "react";

interface DedupResult {
  kept: string;
  removed: string;
}

export function DeduplicateButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DedupResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDedup = async () => {
    if (
      !confirm(
        "¿Deduplicar lanzamientos? Esto buscará y eliminará entradas duplicadas (ej: 'y' vs '&'), manteniendo la versión con Spotify ID.",
      )
    ) {
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/admin/deduplicate-releases", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setResults(data.results || []);
        if (data.duplicatesFound === 0) {
          setError("No se encontraron duplicados.");
        }
      } else {
        setError(data.error || "Error al deduplicar");
      }
    } catch (err) {
      setError("Error de conexión al intentar deduplicar");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDedup}
        disabled={isRunning}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Deduplicando...
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" />
            Deduplicar
          </>
        )}
      </Button>

      {results && results.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm max-w-sm">
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">
              {results.length} duplicado(s) eliminado(s)
            </span>
          </div>
          {results.map((r, i) => (
            <div key={i} className="text-xs text-slc-muted ml-6">
              Eliminado &quot;{r.removed}&quot; → Mantenido &quot;{r.kept}&quot;
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          className={`flex items-center gap-2 text-xs rounded-lg p-2 max-w-sm ${
            error === "No se encontraron duplicados."
              ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
