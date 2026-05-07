"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Check,
  Loader2,
  Users,
  FileDown,
} from "lucide-react";

interface PressKit {
  id: string;
  title: string;
  description: string | null;
  downloadUrl: string;
  fileSize: number | null;
  artistId: string | null;
  artistName: string | null;
}

interface PressKitMultiSelectorProps {
  value: string[]; // Array of selected press kit IDs
  onChange: (ids: string[]) => void;
}

export function PressKitMultiSelector({ value, onChange }: PressKitMultiSelectorProps) {
  const [pressKits, setPressKits] = useState<PressKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPressKits();
  }, []);

  const fetchPressKits = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/press-kits/list");
      const data = await res.json();
      if (data.success) {
        setPressKits(data.data || []);
      } else {
        setError("Error al cargar press kits");
      }
    } catch (err) {
      console.error("Error fetching press kits:", err);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const toggleKit = (kitId: string) => {
    if (value.includes(kitId)) {
      onChange(value.filter(id => id !== kitId));
    } else {
      onChange([...value, kitId]);
    }
  };

  // Group press kits by artist
  const groupedByArtist: Record<string, { artistName: string; kits: PressKit[] }> = {};
  const ungrouped: PressKit[] = [];

  for (const kit of pressKits) {
    if (kit.artistId && kit.artistName) {
      if (!groupedByArtist[kit.artistId]) {
        groupedByArtist[kit.artistId] = { artistName: kit.artistName, kits: [] };
      }
      groupedByArtist[kit.artistId].kits.push(kit);
    } else {
      ungrouped.push(kit);
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-sm text-slc-muted">Cargando press kits...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 py-4">{error}</div>
    );
  }

  if (pressKits.length === 0) {
    return (
      <div className="text-sm text-slc-muted py-4">
        No hay press kits disponibles. Crea press kits desde la sección de artistas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <p className="text-xs text-primary">
          {value.length} press kit{value.length !== 1 ? "s" : ""} seleccionado{value.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Grouped by artist */}
      {Object.entries(groupedByArtist).map(([artistId, group]) => (
        <div key={artistId} className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slc-muted uppercase tracking-wider mb-2">
            <Users className="w-3 h-3" />
            <span className="font-medium">{group.artistName}</span>
          </div>
          <div className="space-y-1 ml-5">
            {group.kits.map((kit) => {
              const isSelected = value.includes(kit.id);
              return (
                <label
                  key={kit.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-slc-card border border-slc-border hover:border-slc-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleKit(kit.id)}
                    className="w-4 h-4 rounded border-slc-border text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-slc-muted flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{kit.title}</span>
                    </div>
                    {kit.description && (
                      <p className="text-xs text-slc-muted mt-0.5 truncate">{kit.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {kit.fileSize && (
                      <span className="text-xs text-slc-muted">
                        {formatFileSize(kit.fileSize)}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Ungrouped kits (no artist) */}
      {ungrouped.length > 0 && (
        <div className="space-y-1">
          {Object.keys(groupedByArtist).length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slc-muted uppercase tracking-wider mb-2">
              <Package className="w-3 h-3" />
              <span className="font-medium">Sin artista asignado</span>
            </div>
          )}
          <div className={Object.keys(groupedByArtist).length > 0 ? "ml-5 space-y-1" : "space-y-1"}>
            {ungrouped.map((kit) => {
              const isSelected = value.includes(kit.id);
              return (
                <label
                  key={kit.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-slc-card border border-slc-border hover:border-slc-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleKit(kit.id)}
                    className="w-4 h-4 rounded border-slc-border text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-slc-muted flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{kit.title}</span>
                    </div>
                    {kit.description && (
                      <p className="text-xs text-slc-muted mt-0.5 truncate">{kit.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {kit.fileSize && (
                      <span className="text-xs text-slc-muted">
                        {formatFileSize(kit.fileSize)}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
