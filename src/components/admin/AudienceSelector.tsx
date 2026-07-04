"use client";

import { Loader2, Mail, Search, Tag, Users, X } from "lucide-react";
import { useState } from "react";

// ===========================================
// TYPES
// ===========================================

export interface AudienceTag {
  id: number;
  name: string;
  count: number;
}

export interface AudienceSelectorProps {
  /** Available tags from Mailchimp */
  tags: AudienceTag[];
  /** Currently selected tag names */
  selectedTags: string[];
  /** Callback when tag selection changes */
  onSelectedTagsChange: (tags: string[]) => void;
  /** Total subscriber count (entire audience) */
  audienceMemberCount: number;
  /** Whether tags are currently loading */
  tagsLoading?: boolean;
  /** Compact mode — uses pill buttons instead of checkbox list */
  variant?: "checkbox" | "pill";
  /** Whether to show the reach summary box at the bottom */
  showReachSummary?: boolean;
  /** Whether to show the search/filter bar */
  showSearch?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Optional className for the container */
  className?: string;
}

// ===========================================
// COMPONENT
// ===========================================

export function AudienceSelector({
  tags,
  selectedTags,
  onSelectedTagsChange,
  audienceMemberCount,
  tagsLoading = false,
  variant = "checkbox",
  showReachSummary = true,
  showSearch = true,
  disabled = false,
  className = "",
}: AudienceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tags by search query
  const filteredTags = searchQuery.trim()
    ? tags.filter((tag) =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : tags;

  // Toggle a tag on/off
  const toggleTag = (tagName: string) => {
    if (disabled) return;
    onSelectedTagsChange(
      selectedTags.includes(tagName)
        ? selectedTags.filter((t) => t !== tagName)
        : [...selectedTags, tagName],
    );
  };

  // Clear all selected tags
  const clearAll = () => {
    if (disabled) return;
    onSelectedTagsChange([]);
  };

  // Select all tags
  const selectAll = () => {
    if (disabled) return;
    onSelectedTagsChange(tags.map((t) => t.name));
  };

  // Calculate reach (with NaN protection)
  const safeAudienceCount = audienceMemberCount || 0;
  const selectedReach =
    selectedTags.length > 0
      ? tags
          .filter((t) => selectedTags.includes(t.name))
          .reduce((sum, t) => sum + (t.count || 0), 0)
      : safeAudienceCount;

  const reachLabel =
    selectedTags.length > 0
      ? `~${selectedReach.toLocaleString()} contacto${selectedReach !== 1 ? "s" : ""}`
      : `${safeAudienceCount.toLocaleString()} contacto${safeAudienceCount !== 1 ? "s" : ""}`;

  return (
    <div
      className={`p-4 bg-slc-card rounded-lg border border-slc-border space-y-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Audiencia</p>
          <p className="text-xs text-slc-muted">
            Selecciona qué suscriptores recibirán este email
          </p>
        </div>
        {audienceMemberCount > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-primary">
              {audienceMemberCount.toLocaleString()}
            </p>
            <p className="text-[10px] text-slc-muted">suscriptores totales</p>
          </div>
        )}
      </div>

      {/* Search / Filter Bar */}
      {showSearch && tags.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slc-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tag..."
            disabled={disabled}
            className="w-full pl-9 pr-8 py-2 bg-slc-dark border border-slc-border rounded-md text-xs focus:border-primary focus:outline-none disabled:opacity-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slc-muted hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {tags.length > 3 && (
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            disabled={disabled || selectedTags.length === tags.length}
            className="text-[10px] text-primary hover:underline disabled:opacity-40 disabled:no-underline"
          >
            Seleccionar todos
          </button>
          <span className="text-[10px] text-slc-muted">·</span>
          <button
            onClick={clearAll}
            disabled={disabled || selectedTags.length === 0}
            className="text-[10px] text-primary hover:underline disabled:opacity-40 disabled:no-underline"
          >
            Limpiar selección
          </button>
          {selectedTags.length > 0 && (
            <>
              <span className="text-[10px] text-slc-muted">·</span>
              <span className="text-[10px] text-primary font-medium">
                {selectedTags.length} seleccionado
                {selectedTags.length > 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      )}

      {/* Tags List */}
      {tagsLoading ? (
        <div className="flex items-center gap-2 py-3">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-xs text-slc-muted">
            Cargando tags de audiencia...
          </span>
        </div>
      ) : filteredTags.length > 0 ? (
        variant === "checkbox" ? (
          /* ── Checkbox variant ── */
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {filteredTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <label
                  key={tag.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-md cursor-pointer transition-all ${
                    isSelected
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-slc-dark/50 border border-transparent"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTag(tag.name)}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slc-border accent-primary flex-shrink-0"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Tag
                      className={`w-3 h-3 flex-shrink-0 ${isSelected ? "text-primary" : "text-slc-muted"}`}
                    />
                    <span
                      className={`text-sm truncate ${isSelected ? "font-medium" : ""}`}
                    >
                      {tag.name}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium flex-shrink-0 ${
                      isSelected ? "text-primary" : "text-slc-muted"
                    }`}
                  >
                    {tag.count > 0
                      ? `${tag.count.toLocaleString()} contacto${tag.count !== 1 ? "s" : ""}`
                      : "0 contactos"}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          /* ── Pill variant ── */
          <div className="flex flex-wrap gap-2">
            {filteredTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.name)}
                  disabled={disabled}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors inline-flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-slc-dark border-slc-border text-slc-muted hover:border-primary/50"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Tag className="w-3 h-3" />
                  {tag.name}
                  <span
                    className={`font-medium ${isSelected ? "text-primary" : ""}`}
                  >
                    {tag.count}
                  </span>
                </button>
              );
            })}
          </div>
        )
      ) : tags.length > 0 && searchQuery ? (
        <p className="text-xs text-slc-muted py-2 text-center">
          No se encontraron tags que coincidan con &quot;{searchQuery}&quot;
        </p>
      ) : (
        <p className="text-xs text-slc-muted py-2">
          No se encontraron tags. Se enviará a todos los suscriptores.
        </p>
      )}

      {/* Reach Summary */}
      {showReachSummary && (
        <div
          className={`p-3 rounded-lg border transition-colors ${
            selectedTags.length > 0
              ? "bg-primary/5 border-primary/20"
              : "bg-slc-dark border-slc-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-xs font-medium">
                {selectedTags.length > 0
                  ? `Se enviará a suscriptores con ${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} seleccionado${selectedTags.length > 1 ? "s" : ""}`
                  : "Se enviará a TODOS los suscriptores"}
              </span>
            </div>
            <span className="text-xs font-bold text-primary flex-shrink-0 ml-2">
              {reachLabel}
            </span>
          </div>
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedTags.map((tagName) => {
                const tagData = tags.find((t) => t.name === tagName);
                return (
                  <span
                    key={tagName}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-full text-[10px] text-primary"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tagName} ({tagData?.count?.toLocaleString() || 0})
                    <button
                      onClick={() => toggleTag(tagName)}
                      disabled={disabled}
                      className="ml-0.5 hover:text-white disabled:cursor-not-allowed"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
