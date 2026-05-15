"use client";

import { useState, useEffect, useRef } from "react";
import {
  Package,
  Loader2,
  Users,
  FileDown,
  X,
  ChevronDown,
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

interface PressKitDropdownSelectorProps {
  value: string[]; // Array of selected press kit IDs (max 3)
  onChange: (ids: string[]) => void;
  maxSelections?: number; // default 3
}

export function PressKitDropdownSelector({
  value,
  onChange,
  maxSelections = 3,
}: PressKitDropdownSelectorProps) {
  const [pressKits, setPressKits] = useState<PressKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPressKits();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const addKit = (kitId: string) => {
    if (value.includes(kitId)) return;
    if (value.length >= maxSelections) return;
    onChange([...value, kitId]);
  };

  const removeKit = (kitId: string) => {
    onChange(value.filter((id) => id !== kitId));
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Group press kits by artist
  const groupedByArtist: Record<
    string,
    { artistName: string; kits: PressKit[] }
  > = {};
  const ungrouped: PressKit[] = [];

  for (const kit of pressKits) {
    if (kit.artistId && kit.artistName) {
      if (!groupedByArtist[kit.artistId]) {
        groupedByArtist[kit.artistId] = {
          artistName: kit.artistName,
          kits: [],
        };
      }
      groupedByArtist[kit.artistId].kits.push(kit);
    } else {
      ungrouped.push(kit);
    }
  }

  // Get selected kit details for the pills
  const selectedKits = pressKits.filter((kit) => value.includes(kit.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-sm text-slc-muted">Cargando press kits...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-500 py-4">{error}</div>;
  }

  if (pressKits.length === 0) {
    return (
      <div className="text-sm text-slc-muted py-4">
        No hay press kits disponibles. Crea press kits desde la sección de
        artistas.
      </div>
    );
  }

  const isMaxed = value.length >= maxSelections;

  return (
    <div className="space-y-4">
      {/* Dropdown trigger */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          disabled={isMaxed}
          className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg text-left transition-colors ${
            isMaxed
              ? "bg-slc-card border border-slc-border cursor-not-allowed opacity-60"
              : "bg-slc-card border border-slc-border hover:border-primary focus:border-primary cursor-pointer"
          }`}
        >
          <span className="text-sm text-slc-muted">
            {isMaxed
              ? `Máximo ${maxSelections} press kits seleccionados`
              : value.length > 0
                ? `Seleccionar press kit (${value.length}/${maxSelections})`
                : "Seleccionar press kit..."}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slc-muted transition-transform ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown panel */}
        {dropdownOpen && (
          <div className="absolute z-50 top-full mt-1 w-full bg-slc-dark border border-slc-border rounded-lg shadow-xl max-h-72 overflow-y-auto custom-scrollbar">
            {/* Grouped by artist */}
            {Object.entries(groupedByArtist).map(
              ([artistId, group], groupIdx) => (
                <div key={artistId}>
                  {groupIdx > 0 && (
                    <div className="border-t border-slc-border/50 my-1" />
                  )}
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-slc-muted uppercase tracking-wider">
                    <Users className="w-3 h-3" />
                    <span className="font-medium">{group.artistName}</span>
                  </div>
                  {group.kits.map((kit) => {
                    const isSelected = value.includes(kit.id);
                    const isDisabled = isSelected || isMaxed;
                    return (
                      <button
                        key={kit.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (!isSelected) {
                            addKit(kit.id);
                            if (value.length + 1 >= maxSelections) {
                              setDropdownOpen(false);
                            }
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-primary cursor-default"
                            : isDisabled
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:bg-slc-card text-white cursor-pointer"
                        }`}
                      >
                        <FileDown className="w-4 h-4 text-slc-muted flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">
                            {kit.title}
                          </span>
                        </div>
                        {kit.fileSize && (
                          <span className="text-xs text-slc-muted flex-shrink-0">
                            {formatFileSize(kit.fileSize)}
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-xs text-primary font-medium flex-shrink-0">
                            Seleccionado
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* Ungrouped kits (no artist) */}
            {ungrouped.length > 0 && (
              <div>
                {Object.keys(groupedByArtist).length > 0 && (
                  <div className="border-t border-slc-border/50 my-1" />
                )}
                {Object.keys(groupedByArtist).length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-slc-muted uppercase tracking-wider">
                    <Package className="w-3 h-3" />
                    <span className="font-medium">Sin artista asignado</span>
                  </div>
                )}
                {ungrouped.map((kit) => {
                  const isSelected = value.includes(kit.id);
                  const isDisabled = isSelected || isMaxed;
                  return (
                    <button
                      key={kit.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (!isSelected) {
                          addKit(kit.id);
                          if (value.length + 1 >= maxSelections) {
                            setDropdownOpen(false);
                          }
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary cursor-default"
                          : isDisabled
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-slc-card text-white cursor-pointer"
                      }`}
                    >
                      <FileDown className="w-4 h-4 text-slc-muted flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">
                          {kit.title}
                        </span>
                      </div>
                      {kit.fileSize && (
                        <span className="text-xs text-slc-muted flex-shrink-0">
                          {formatFileSize(kit.fileSize)}
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-xs text-primary font-medium flex-shrink-0">
                          Seleccionado
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection counter */}
      <p className="text-xs text-slc-muted">
        {value.length} de {maxSelections} press kits seleccionados
      </p>

      {/* Selected press kits as removable pills/tags */}
      {selectedKits.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedKits.map((kit) => (
            <span
              key={kit.id}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-sm text-white transition-colors"
            >
              <FileDown className="w-3.5 h-3.5 text-primary" />
              <span className="truncate max-w-[180px]">
                {kit.artistName ? `${kit.artistName} — ` : ""}
                {kit.title}
              </span>
              {kit.fileSize && (
                <span className="text-xs text-slc-muted">
                  {formatFileSize(kit.fileSize)}
                </span>
              )}
              <button
                type="button"
                onClick={() => removeKit(kit.id)}
                className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 text-primary transition-colors"
                aria-label={`Eliminar ${kit.title}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
