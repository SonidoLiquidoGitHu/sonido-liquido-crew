"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slc-black flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="font-oswald text-2xl uppercase mb-2">
          Error en Admin
        </h1>

        <p className="text-slc-muted mb-6">
          Ha ocurrido un error al cargar esta página. Esto puede deberse a un problema
          de conexión con la base de datos o un error temporal.
        </p>

        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
            <p className="text-xs text-red-400 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-400/60 mt-2">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Intentar de nuevo
          </Button>
          <Button asChild>
            <a href="/">
              <Home className="w-4 h-4 mr-2" />
              Volver al inicio
            </a>
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-slc-border">
          <p className="text-xs text-slc-muted">
            Si el problema persiste, verifica que la base de datos esté configurada correctamente
            o contacta a soporte.
          </p>
        </div>
      </div>
    </div>
  );
}
