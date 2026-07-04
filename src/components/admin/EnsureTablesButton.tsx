"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Database, Loader2 } from "lucide-react";
import { useState } from "react";

interface EnsureTablesButtonProps {
  connected?: boolean;
}

export function EnsureTablesButton({
  connected = true,
}: EnsureTablesButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const runEnsureTables = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/ensure-tables", {
        method: "POST",
      });
      const data = await res.json();

      setResult({
        success: data.success,
        message:
          data.message ||
          (data.success ? "Tablas aseguradas" : "Error al asegurar tablas"),
      });
    } catch (error) {
      setResult({
        success: false,
        message: "Error de conexión",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={runEnsureTables}
        disabled={isRunning || !connected}
        variant="outline"
        size="sm"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Asegurando...
          </>
        ) : result ? (
          result.success ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Tablas OK
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
              Reintentar
            </>
          )
        ) : (
          <>
            <Database className="w-4 h-4 mr-2" />
            Asegurar Tablas
          </>
        )}
      </Button>
      {result && (
        <span
          className={`text-xs ${result.success ? "text-green-500" : "text-yellow-500"}`}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}
