"use client";

import { useState, useEffect, useRef } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";
import {
  User,
  ChevronDown,
  X,
  Check,
  Search,
  Loader2,
  Music,
} from "lucide-react";

export interface Artist {
  id: string;
  name: string;
  profileImageUrl?: string | null;
  role?: string;
}

interface ArtistSelectorProps {
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showRole?: boolean;
  filterRole?: string;
  initialArtists?: Artist[]; // Pre-loaded artists from server
}

// Role badge colors
const roleColors: Record<string, string> = {
  mc: "bg-orange-500/10 text-orange-500",
  dj: "bg-purple-500/10 text-purple-500",
  producer: "bg-blue-500/10 text-blue-500",
  cantante: "bg-pink-500/10 text-pink-500",
};

const roleLabels: Record<string, string> = {
  mc: "MC",
  dj: "DJ",
  producer: "Productor",
  cantante: "Cantante",
};

export function ArtistSelector({
  value,
  onChange,
  multiple = false,
  label,
  placeholder = "Seleccionar artista...",
  disabled = false,
  className = "",
  showRole = true,
  filterRole,
  initialArtists,
}: ArtistSelectorProps) {
  const [artists, setArtists] = useState<Artist[]>(initialArtists || []);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert value to array for consistent handling
  const selectedIds = Array.isArray(value) ? value : value ? [value] : [];

  // Fetch artists on mount - always fetch to ensure fresh data
  useEffect(() => {
    // If we have initial artists from props, use them but still allow refresh
    if (initialArtists && initialArtists.length > 0) {
      console.log(`[ArtistSelector] Using ${initialArtists.length} initial artists from props`);
      setArtists(initialArtists);
      setLoading(false);
      return;
    }

    // Otherwise fetch from API
    const fetchArtists = async () => {
      setLoading(true);
      console.log("[ArtistSelector] Fetching artists from API...");
      try {
        // Try public endpoint first for broader compatibility
        let res = await fetch("/api/artists");
        let data = await res.json();

        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setArtists(data.data);
          console.log(`[ArtistSelector] Loaded ${data.data.length} artists from public API`);
        } else {
          // Try admin endpoint as fallback
          console.log("[ArtistSelector] Public endpoint empty, trying admin...");
          res = await fetch("/api/admin/artists");
          data = await res.json();

          if (data.success && Array.isArray(data.data)) {
            setArtists(data.data);
            console.log(`[ArtistSelector] Loaded ${data.data.length} artists from admin API`);
          } else if (Array.isArray(data)) {
            setArtists(data);
            console.log(`[ArtistSelector] Loaded ${data.length} artists (direct array)`);
          } else {
            console.warn("[ArtistSelector] No artists found in response:", data);
          }
        }
      } catch (error) {
        console.error("[ArtistSelector] Failed to fetch artists:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArtists();
  }, [initialArtists]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter artists by search and role
  const filteredArtists = artists.filter((artist) => {
    const matchesSearch = artist.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !filterRole || artist.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Get selected artists
  const selectedArtists = artists.filter((a) => selectedIds.includes(a.id));

  // Handle selection
  const handleSelect = (artistId: string) => {
    if (multiple) {
      const newIds = selectedIds.includes(artistId)
        ? selectedIds.filter((id) => id !== artistId)
        : [...selectedIds, artistId];
      onChange(newIds);
    } else {
      onChange(artistId);
      setIsOpen(false);
    }
  };

  // Remove from selection
  const handleRemove = (artistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      onChange(selectedIds.filter((id) => id !== artistId));
    } else {
      onChange("");
    }
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {label && (
        <label className="block text-sm text-slc-muted mb-2">{label}</label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 bg-slc-card border border-slc-border rounded-lg transition-colors text-left min-h-[42px]",
          isOpen && "border-primary",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "hover:border-slc-muted"
        )}
      >
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {loading ? (
            <span className="text-slc-muted flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando artistas...
            </span>
          ) : selectedArtists.length === 0 ? (
            <span className="text-slc-muted">{placeholder}</span>
          ) : multiple ? (
            // Multiple selection - show chips
            selectedArtists.map((artist) => (
              <span
                key={artist.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm"
              >
                {artist.profileImageUrl && (
                  <SafeImage
                    src={artist.profileImageUrl}
                    alt={artist.name}
                    width={16}
                    height={16}
                    className="w-4 h-4 rounded-full object-cover"
                    unoptimized
                  />
                )}
                <span className="truncate max-w-[100px]">{artist.name}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemove(artist.id, e)}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            // Single selection - show artist with image
            <div className="flex items-center gap-2">
              {selectedArtists[0]?.profileImageUrl ? (
                <SafeImage
                  src={selectedArtists[0].profileImageUrl}
                  alt={selectedArtists[0].name}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slc-border flex items-center justify-center">
                  <User className="w-3 h-3 text-slc-muted" />
                </div>
              )}
              <span>{selectedArtists[0]?.name}</span>
              {showRole && selectedArtists[0]?.role && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] uppercase",
                  roleColors[selectedArtists[0].role] || "bg-slc-border text-slc-muted"
                )}>
                  {roleLabels[selectedArtists[0].role] || selectedArtists[0].role}
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-slc-muted transition-transform flex-shrink-0 ml-2",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slc-dark border border-slc-border rounded-lg shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slc-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar artista..."
                className="w-full pl-9 pr-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
          </div>

          {/* Artist List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredArtists.length === 0 ? (
              <div className="p-4 text-center text-slc-muted text-sm">
                {searchQuery ? "No se encontraron artistas" : "No hay artistas disponibles"}
              </div>
            ) : (
              filteredArtists.map((artist) => {
                const isSelected = selectedIds.includes(artist.id);
                return (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => handleSelect(artist.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-slc-card"
                    )}
                  >
                    {/* Artist Image */}
                    <div className="relative flex-shrink-0">
                      {artist.profileImageUrl ? (
                        <SafeImage
                          src={artist.profileImageUrl}
                          alt={artist.name}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slc-card flex items-center justify-center">
                          <User className="w-4 h-4 text-slc-muted" />
                        </div>
                      )}
                      {/* Spotify indicator */}
                      {artist.profileImageUrl?.includes("spotify") && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-spotify rounded-full flex items-center justify-center">
                          <Music className="w-2.5 h-2.5 text-black" />
                        </div>
                      )}
                    </div>

                    {/* Artist Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{artist.name}</span>
                        {showRole && artist.role && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] uppercase flex-shrink-0",
                            roleColors[artist.role] || "bg-slc-border text-slc-muted"
                          )}>
                            {roleLabels[artist.role] || artist.role}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Check indicator */}
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with count */}
          <div className="px-3 py-2 border-t border-slc-border bg-slc-card/50 text-xs text-slc-muted">
            {filteredArtists.length} artista{filteredArtists.length !== 1 ? "s" : ""}
            {selectedIds.length > 0 && ` • ${selectedIds.length} seleccionado${selectedIds.length !== 1 ? "s" : ""}`}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
export function ArtistSelectorCompact({
  value,
  onChange,
  placeholder = "Artista...",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <ArtistSelector
      value={value}
      onChange={(v) => onChange(Array.isArray(v) ? v[0] || "" : v)}
      multiple={false}
      placeholder={placeholder}
      className={className}
      showRole={false}
    />
  );
}

export default ArtistSelector;
