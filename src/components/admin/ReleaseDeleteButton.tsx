"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

interface ReleaseDeleteButtonProps {
  releaseId: string;
  releaseTitle: string;
  onDelete?: () => void;
}

export function ReleaseDeleteButton({
  releaseId,
  releaseTitle,
  onDelete,
}: ReleaseDeleteButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        onDelete?.();
        // Refresh the page to reflect the deletion
        window.location.reload();
      } else {
        setError(data.error || "Error al eliminar el lanzamiento");
      }
    } catch (err) {
      console.error("Error deleting release:", err);
      setError("Error de conexión al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-red-500 hover:text-red-400"
        title="Eliminar"
        onClick={() => setDialogOpen(true)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Lanzamiento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar{" "}
              <span className="font-semibold text-foreground">
                {releaseTitle}
              </span>
              ? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
