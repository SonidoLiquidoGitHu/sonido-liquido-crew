"use client";

import { useState, useMemo } from "react";
import { ReleaseCard } from "@/components/public/cards/ReleaseCard";
import { Disc3, Search, SlidersHorizontal, X } from "lucide-react";
import type { Release, ReleaseType } from "@/types";

// ===========================================
// RELEASE TYPE LABELS
// ===========================================
const RELEASE_TYPES: { value: ReleaseType | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "album", label: "Álbumes" },
  { value: "single", label: "Singles" },
  { value: "ep", label: "EPs" },
  { value: "maxi-single", label: "Maxi-Singles" },
  { value: "compilation", label: "Compilaciones" },
  { value: "mixtape", label: "Mixtapes" },
];

type SortOption = "newest" | "oldest" | "title";

interface DiscografiaClientProps {
  releases: Release[];
}

export function DiscografiaClient({ releases }: DiscografiaClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ReleaseType | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Extract available years from releases
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    releases.forEach((r) => {
      if (r.releaseDate) {
        years.add(new Date(r.releaseDate).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [releases]);

  const [selectedYear, setSelectedYear] = useState<number | "all">("all");

  // Filter and sort releases
  const filteredReleases = useMemo(() => {
    let result = [...releases];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) =>
        r.title.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (selectedType !== "all") {
      result = result.filter((r) => r.releaseType === selectedType);
    }

    // Year filter
    if (selectedYear !== "all") {
      result = result.filter(
        (r) => new Date(r.releaseDate).getFullYear() === selectedYear
      );
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
        );
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [releases, searchQuery, selectedType, selectedYear, sortBy]);

  // Count releases per type for badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: releases.length };
    releases.forEach((r) => {
      counts[r.releaseType] = (counts[r.releaseType] || 0) + 1;
    });
    return counts;
  }, [releases]);

  const hasActiveFilters = selectedType !== "all" || selectedYear !== "all" || searchQuery.trim() !== "";

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedYear("all");
    setSearchQuery("");
    setSortBy("newest");
  };

  if (releases.length === 0) {
    return (
      <div className="text-center py-20">
        <Disc3 className="w-16 h-16 text-slc-muted mx-auto mb-4" />
        <h3 className="text-xl font-oswald uppercase mb-2">
          Cargando Discografía...
        </h3>
        <p className="text-slc-muted">
          No hay lanzamientos disponibles en este momento.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="mb-8 space-y-4">
        {/* Search + Filter Toggle Row */}
        <div className="flex gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar lanzamiento..."
              className="w-full pl-10 pr-4 py-2.5 bg-slc-card border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slc-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle Button (mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors lg:hidden ${
              hasActiveFilters
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-slc-card border-slc-border text-slc-muted hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {/* Type Filter Chips + Sort - always visible on desktop, toggleable on mobile */}
        <div
          className={`space-y-4 ${
            showFilters ? "block" : "hidden lg:block"
          }`}
        >
          {/* Release Type Chips */}
          <div className="flex flex-wrap gap-2">
            {RELEASE_TYPES.map((type) => {
              const count = typeCounts[type.value] || 0;
              if (type.value !== "all" && count === 0) return null;
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-colors ${
                    selectedType === type.value
                      ? "bg-primary text-white"
                      : "bg-slc-card border border-slc-border text-slc-muted hover:text-white hover:border-slc-muted"
                  }`}
                >
                  {type.label}
                  <span className="ml-1.5 text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Year Filter + Sort Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Year Dropdown */}
            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(
                  e.target.value === "all" ? "all" : parseInt(e.target.value)
                )
              }
              className="px-3 py-1.5 bg-slc-card border border-slc-border rounded-lg text-xs text-slc-muted focus:outline-none focus:border-primary transition-colors"
            >
              <option value="all">Todos los años</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 bg-slc-card border border-slc-border rounded-lg text-xs text-slc-muted focus:outline-none focus:border-primary transition-colors"
            >
              <option value="newest">Más reciente</option>
              <option value="oldest">Más antiguo</option>
              <option value="title">A - Z</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-primary hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar filtros
              </button>
            )}

            {/* Results Count */}
            <span className="text-xs text-slc-muted ml-auto">
              {filteredReleases.length} lanzamiento
              {filteredReleases.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Releases Grid */}
      {filteredReleases.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
          {filteredReleases.map((release) => (
            <ReleaseCard key={release.id} release={release} showArtist={false} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Disc3 className="w-12 h-12 text-slc-muted mx-auto mb-4" />
          <h3 className="font-oswald text-lg uppercase mb-2">
            Sin resultados
          </h3>
          <p className="text-slc-muted text-sm mb-4">
            No se encontraron lanzamientos con estos filtros.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
