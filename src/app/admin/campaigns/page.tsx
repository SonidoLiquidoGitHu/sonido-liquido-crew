"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Megaphone,
  Calendar,
  Users,
  Download,
  Eye,
  Star,
  LinkIcon,
} from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  campaignType: string;
  coverImageUrl: string | null;
  smartLinkUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  startDate: string | number | null;
  endDate: string | number | null;
  releaseDate: string | number | null;
  totalViews: number;
  totalConversions: number;
  totalDownloads: number;
  createdAt: string;
}

const campaignTypeLabels: Record<string, string> = {
  presave: "Pre-save",
  hyperfollow: "Hyperfollow",
  smartlink: "Smart Link",
  contest: "Concurso",
  download: "Descarga",
};

const campaignTypeColors: Record<string, string> = {
  presave: "bg-green-500/10 text-green-500",
  hyperfollow: "bg-blue-500/10 text-blue-500",
  smartlink: "bg-purple-500/10 text-purple-500",
  contest: "bg-orange-500/10 text-orange-500",
  download: "bg-cyan-500/10 text-cyan-500",
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/admin/campaigns");
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || campaign.campaignType === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateValue: string | number | null) => {
    if (!dateValue) return "-";
    // If it's a Unix timestamp (number or numeric string), convert to milliseconds
    let date: Date;
    if (typeof dateValue === "number") {
      // Unix timestamp in seconds - multiply by 1000 for milliseconds
      date = new Date(dateValue * 1000);
    } else if (!isNaN(Number(dateValue))) {
      // Numeric string (Unix timestamp)
      date = new Date(Number(dateValue) * 1000);
    } else {
      // ISO string or other date format
      date = new Date(dateValue);
    }

    // Validate the date
    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Campañas</h1>
          <p className="text-slc-muted mt-1">
            Gestiona presaves, hyperfollows y download gates
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/campaigns/new">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Campaña
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <input
            type="text"
            placeholder="Buscar campañas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
        >
          <option value="">Todos los tipos</option>
          <option value="presave">Pre-save</option>
          <option value="hyperfollow">Hyperfollow</option>
          <option value="smartlink">Smart Link</option>
          <option value="contest">Concurso</option>
          <option value="download">Descarga</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-primary">{campaigns.length}</div>
          <div className="text-xs text-slc-muted uppercase">Total</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-green-500">
            {campaigns.filter((c) => c.isActive).length}
          </div>
          <div className="text-xs text-slc-muted uppercase">Activas</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-blue-500">
            {campaigns.reduce((sum, c) => sum + c.totalViews, 0).toLocaleString()}
          </div>
          <div className="text-xs text-slc-muted uppercase">Vistas</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-purple-500">
            {campaigns.reduce((sum, c) => sum + c.totalConversions, 0).toLocaleString()}
          </div>
          <div className="text-xs text-slc-muted uppercase">Conversiones</div>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slc-muted">Cargando campañas...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-8 text-center">
            <Megaphone className="w-12 h-12 text-slc-muted mx-auto mb-4" />
            <p className="text-slc-muted">No hay campañas todavía</p>
            <Button asChild className="mt-4">
              <Link href="/admin/campaigns/new">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Campaña
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slc-border">
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Campaña
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Fechas
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Métricas
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slc-border">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slc-card/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded overflow-hidden bg-slc-card flex-shrink-0">
                          {campaign.coverImageUrl ? (
                            <SafeImage
                              src={campaign.coverImageUrl}
                              alt={campaign.title}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Megaphone className="w-6 h-6 text-slc-muted" />
                            </div>
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/admin/campaigns/${campaign.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {campaign.title}
                          </Link>
                          <p className="text-xs text-slc-muted">/{campaign.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          campaignTypeColors[campaign.campaignType] || "bg-slc-card text-slc-muted"
                        }`}
                      >
                        {campaignTypeLabels[campaign.campaignType] || campaign.campaignType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {campaign.releaseDate && (
                          <div className="flex items-center gap-1 text-slc-muted">
                            <Calendar className="w-3 h-3" />
                            <span>Release: {formatDate(campaign.releaseDate)}</span>
                          </div>
                        )}
                        {campaign.startDate && (
                          <div className="text-xs text-slc-muted mt-1">
                            Inicio: {formatDate(campaign.startDate)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-slc-muted">
                          <Eye className="w-3 h-3" />
                          <span>{campaign.totalViews}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slc-muted">
                          <Users className="w-3 h-3" />
                          <span>{campaign.totalConversions}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slc-muted">
                          <Download className="w-3 h-3" />
                          <span>{campaign.totalDownloads}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {campaign.isActive ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-500">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slc-card text-slc-muted">
                            Inactiva
                          </span>
                        )}
                        {campaign.isFeatured && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {campaign.smartLinkUrl && (
                          <Button asChild variant="ghost" size="icon">
                            <a href={campaign.smartLinkUrl} target="_blank" rel="noopener noreferrer">
                              <LinkIcon className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/c/${campaign.slug}`} target="_blank">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/admin/campaigns/${campaign.id}`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
