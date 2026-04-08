"use client";

import { useState } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ARTIST_ROLES, getRolesFromString, type RoleConfig } from "@/lib/roles";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Loader2,
  Check,
  X,
  Tags,
} from "lucide-react";

interface Artist {
  id: string;
  name: string;
  slug: string;
  role: string | null;
  profileImageUrl: string | null;
  verificationStatus: string;
  isFeatured: boolean;
  identityConflictFlag: boolean;
}

interface ArtistsListClientProps {
  artists: Artist[];
}

const statusColors = {
  verified: { bg: "bg-green-500/10", text: "text-green-500", icon: CheckCircle },
  pending: { bg: "bg-yellow-500/10", text: "text-yellow-500", icon: Clock },
  rejected: { bg: "bg-red-500/10", text: "text-red-500", icon: AlertTriangle },
};

export default function ArtistsListClient({ artists: initialArtists }: ArtistsListClientProps) {
  const router = useRouter();
  const [artists, setArtists] = useState(initialArtists);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkRoles, setBulkRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter artists
  const filteredArtists = artists.filter((artist) => {
    const matchesSearch = artist.name.toLowerCase().includes(searchQuery.toLowerCase());
    const artistRoles = artist.role?.split(",").filter(Boolean) || [];
    const matchesRole = !roleFilter || artistRoles.includes(roleFilter);
    const matchesStatus = !statusFilter || artist.verificationStatus === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Toggle artist selection
  const toggleSelection = (id: string) => {
    setSelectedArtists((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  // Select all visible artists
  const selectAll = () => {
    if (selectedArtists.length === filteredArtists.length) {
      setSelectedArtists([]);
    } else {
      setSelectedArtists(filteredArtists.map((a) => a.id));
    }
  };

  // Toggle bulk role
  const toggleBulkRole = (roleValue: string) => {
    setBulkRoles((prev) =>
      prev.includes(roleValue)
        ? prev.filter((r) => r !== roleValue)
        : [...prev, roleValue]
    );
  };

  // Apply bulk roles
  const applyBulkRoles = async () => {
    if (selectedArtists.length === 0 || bulkRoles.length === 0) return;

    setIsLoading(true);
    try {
      // Update each selected artist
      const updates = selectedArtists.map(async (artistId) => {
        const response = await fetch(`/api/admin/artists/${artistId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: bulkRoles.join(",") }),
        });
        return response.json();
      });

      await Promise.all(updates);

      // Update local state
      setArtists((prev) =>
        prev.map((artist) =>
          selectedArtists.includes(artist.id)
            ? { ...artist, role: bulkRoles.join(",") }
            : artist
        )
      );

      // Reset selection
      setSelectedArtists([]);
      setBulkRoles([]);
      setIsBulkEditing(false);

      router.refresh();
    } catch (error) {
      console.error("Error applying bulk roles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete artist
  const handleDelete = async (artist: Artist) => {
    if (!confirm(`¿Eliminar a "${artist.name}"?`)) return;

    setDeletingId(artist.id);
    try {
      const response = await fetch(`/api/admin/artists/${artist.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setArtists((prev) => prev.filter((a) => a.id !== artist.id));
        setSelectedArtists((prev) => prev.filter((id) => id !== artist.id));
      }
    } catch (error) {
      console.error("Error deleting artist:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Render role badges
  const RoleBadges = ({ roleString }: { roleString: string | null }) => {
    const roles = getRolesFromString(roleString);
    if (roles.length === 0) {
      return <span className="text-sm text-slc-muted">Sin rol</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <span
              key={role.value}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${role.bgColor} ${role.color} border ${role.borderColor}`}
            >
              <Icon className="w-3 h-3" />
              {role.shortLabel}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Artistas</h1>
          <p className="text-slc-muted mt-1">
            Gestiona el roster de artistas del crew
          </p>
        </div>
        <div className="flex gap-2">
          {selectedArtists.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkEditing(!isBulkEditing);
                if (!isBulkEditing) {
                  // Pre-populate with common roles from selection
                  const selectedArtistsData = artists.filter((a) =>
                    selectedArtists.includes(a.id)
                  );
                  const allRoles = new Set<string>();
                  selectedArtistsData.forEach((a) => {
                    a.role?.split(",").forEach((r) => r && allRoles.add(r));
                  });
                  setBulkRoles(Array.from(allRoles));
                }
              }}
            >
              <Tags className="w-4 h-4 mr-2" />
              Editar Roles ({selectedArtists.length})
            </Button>
          )}
          <Button asChild>
            <Link href="/admin/artists/new">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Artista
            </Link>
          </Button>
        </div>
      </div>

      {/* Bulk Edit Panel */}
      {isBulkEditing && (
        <div className="mb-6 p-4 bg-slc-dark border border-primary/30 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-oswald text-lg uppercase">
              Editar Roles - {selectedArtists.length} artistas seleccionados
            </h3>
            <button
              onClick={() => {
                setIsBulkEditing(false);
                setBulkRoles([]);
              }}
              className="text-slc-muted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slc-muted mb-4">
            Selecciona los roles que se aplicarán a todos los artistas seleccionados:
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {ARTIST_ROLES.map((role) => {
              const isSelected = bulkRoles.includes(role.value);
              const Icon = role.icon;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => toggleBulkRole(role.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    isSelected
                      ? `${role.bgColor} ${role.color} ${role.borderColor} border`
                      : "bg-slc-card text-slc-muted border-slc-border hover:border-slc-muted/50 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {role.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={applyBulkRoles}
              disabled={isLoading || bulkRoles.length === 0}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Aplicar a {selectedArtists.length} artistas
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkEditing(false);
                setBulkRoles([]);
                setSelectedArtists([]);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <input
            type="text"
            placeholder="Buscar artistas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">Todos los roles</option>
            {ARTIST_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">Todos los estados</option>
            <option value="verified">Verificado</option>
            <option value="pending">Pendiente</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>
      </div>

      {/* Artists Table */}
      <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slc-border">
                <th className="text-left px-4 py-4">
                  <input
                    type="checkbox"
                    checked={
                      selectedArtists.length === filteredArtists.length &&
                      filteredArtists.length > 0
                    }
                    onChange={selectAll}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                </th>
                <th className="text-left px-4 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Artista
                </th>
                <th className="text-left px-4 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Roles
                </th>
                <th className="text-left px-4 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-left px-4 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Destacado
                </th>
                <th className="text-left px-4 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Conflicto
                </th>
                <th className="text-right px-4 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slc-border">
              {filteredArtists.map((artist) => {
                const status =
                  statusColors[artist.verificationStatus as keyof typeof statusColors];
                const StatusIcon = status?.icon || Clock;
                const isSelected = selectedArtists.includes(artist.id);

                return (
                  <tr
                    key={artist.id}
                    className={`hover:bg-slc-card/50 ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(artist.id)}
                        className="w-4 h-4 rounded border-slc-border"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slc-card flex-shrink-0">
                          {artist.profileImageUrl ? (
                            <SafeImage
                              src={artist.profileImageUrl}
                              alt={artist.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-5 h-5 text-slc-muted" />
                            </div>
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/admin/artists/${artist.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {artist.name}
                          </Link>
                          <p className="text-xs text-slc-muted">/{artist.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <RoleBadges roleString={artist.role} />
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status?.bg} ${status?.text}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {artist.verificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {artist.isFeatured ? (
                        <span className="text-yellow-500">★</span>
                      ) : (
                        <span className="text-slc-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {artist.identityConflictFlag ? (
                        <span className="inline-flex items-center gap-1 text-orange-500">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="text-slc-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/artistas/${artist.slug}`} target="_blank">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/admin/artists/${artist.id}`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-400"
                          onClick={() => handleDelete(artist)}
                          disabled={deletingId === artist.id}
                        >
                          {deletingId === artist.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slc-border">
          <p className="text-sm text-slc-muted">
            Mostrando {filteredArtists.length} de {artists.length} artistas
            {selectedArtists.length > 0 && (
              <span className="ml-2 text-primary">
                ({selectedArtists.length} seleccionados)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled>
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
