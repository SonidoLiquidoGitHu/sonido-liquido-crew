import Link from "next/link";
import Image from "next/image";
import { releasesService } from "@/lib/services";
import { formatDate, getReleaseTypeDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeduplicateButton } from "@/components/admin/DeduplicateButton";
import { ReleaseDeleteButton } from "@/components/admin/ReleaseDeleteButton";
import {
  Plus,
  Search,
  Edit,
  ExternalLink,
  Disc3,
  Calendar,
  Star,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lanzamientos | Admin - Sonido Líquido Crew",
};

const releaseTypeColors = {
  album: "bg-blue-500/10 text-blue-500",
  ep: "bg-green-500/10 text-green-500",
  single: "bg-purple-500/10 text-purple-500",
  "maxi-single": "bg-cyan-500/10 text-cyan-500",
  compilation: "bg-orange-500/10 text-orange-500",
  mixtape: "bg-pink-500/10 text-pink-500",
};

export default async function AdminReleasesPage() {
  const [releases, stats] = await Promise.all([
    releasesService.getAll({ limit: 100 }),
    releasesService.getStats(),
  ]);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Lanzamientos</h1>
          <p className="text-slc-muted mt-1">
            Gestiona la discografía del crew
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DeduplicateButton />
          <Button asChild>
            <Link href="/admin/releases/new">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Lanzamiento
            </Link>
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <input
            type="text"
            placeholder="Buscar lanzamientos..."
            className="w-full pl-10 pr-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <select className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary">
            <option value="">Todos los tipos</option>
            <option value="album">Álbum</option>
            <option value="ep">EP</option>
            <option value="single">Single</option>
            <option value="maxi-single">Maxi-Single</option>
            <option value="compilation">Compilación</option>
            <option value="mixtape">Mixtape</option>
          </select>
          <select className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary">
            <option value="">Todos los años</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-primary">{stats.total}</div>
          <div className="text-xs text-slc-muted uppercase">Total</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-blue-500">{stats.albums}</div>
          <div className="text-xs text-slc-muted uppercase">Álbumes</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-green-500">{stats.eps}</div>
          <div className="text-xs text-slc-muted uppercase">EPs</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-purple-500">{stats.singles}</div>
          <div className="text-xs text-slc-muted uppercase">Singles</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-cyan-500">{stats.maxiSingles}</div>
          <div className="text-xs text-slc-muted uppercase">Maxi-Singles</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-orange-500">{stats.compilations}</div>
          <div className="text-xs text-slc-muted uppercase">Compilaciones</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-pink-500">{stats.mixtapes}</div>
          <div className="text-xs text-slc-muted uppercase">Mixtapes</div>
        </div>
      </div>

      {/* Releases Grid */}
      <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slc-border">
                <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Lanzamiento
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Tipo
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Fecha
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Spotify
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Destacado
                </th>
                <th className="text-right px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slc-border">
              {releases.map((release) => (
                <tr key={release.id} className="hover:bg-slc-card/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded overflow-hidden bg-slc-card flex-shrink-0">
                        {release.coverImageUrl ? (
                          <Image
                            src={release.coverImageUrl}
                            alt={release.title}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Disc3 className="w-6 h-6 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/admin/releases/${release.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {release.title}
                        </Link>
                        <p className="text-xs text-slc-muted">/{release.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      releaseTypeColors[release.releaseType as keyof typeof releaseTypeColors] || "bg-slc-card text-slc-muted"
                    }`}>
                      {getReleaseTypeDisplay(release.releaseType)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-slc-muted">
                      <Calendar className="w-3 h-3" />
                      <span suppressHydrationWarning>
                        {formatDate(release.releaseDate, { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {release.spotifyUrl ? (
                      <a
                        href={release.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-spotify hover:underline text-sm"
                      >
                        Conectado
                      </a>
                    ) : (
                      <span className="text-slc-muted text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {release.isFeatured ? (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <span className="text-slc-muted">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/lanzamientos/${release.slug}`} target="_blank">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/admin/releases/${release.id}`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <ReleaseDeleteButton
                        releaseId={release.id}
                        releaseTitle={release.title}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slc-border">
          <p className="text-sm text-slc-muted">
            Mostrando {releases.length} de {stats.total} lanzamientos
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
