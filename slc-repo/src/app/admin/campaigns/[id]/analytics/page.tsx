"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Download,
  Eye,
  Users,
  MousePointerClick,
  TrendingUp,
  Calendar,
  RefreshCw,
  Mail,
  CheckCircle,
  Music,
  ExternalLink,
  Loader2,
  BarChart3,
  Globe,
} from "lucide-react";

interface CampaignAnalytics {
  campaign: {
    id: string;
    title: string;
    slug: string;
    type: string;
    isActive: boolean;
    totalViews: number;
    totalConversions: number;
    totalDownloads: number;
  };
  stats: {
    totalActions: number;
    uniqueEmails: number;
    totalPresaves: number;
    totalFollows: number;
    totalDownloads: number;
    conversionRate: string;
  };
  dailyStats: Array<{
    date: string;
    views: number;
    conversions: number;
    downloads: number;
  }>;
  sources: Array<{
    source: string;
    count: number;
  }>;
  recentActions: Array<{
    id: string;
    email: string | null;
    presave: boolean;
    follow: boolean;
    download: boolean;
    date: string;
    source: string;
  }>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampaignAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<CampaignAnalytics | null>(null);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  useEffect(() => {
    fetchAnalytics();
  }, [resolvedParams.id]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      let url = `/api/admin/campaigns/${resolvedParams.id}/analytics`;
      const params = new URLSearchParams();
      if (dateRange.start) params.set("startDate", dateRange.start);
      if (dateRange.end) params.set("endDate", dateRange.end);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  async function exportEmails() {
    setExporting(true);
    try {
      let url = `/api/admin/campaigns/${resolvedParams.id}/analytics?export=emails`;
      if (dateRange.start) url += `&startDate=${dateRange.start}`;
      if (dateRange.end) url += `&endDate=${dateRange.end}`;

      const res = await fetch(url);
      const blob = await res.blob();

      // Download the CSV
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${data?.campaign.slug || "campaign"}-emails.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error exporting emails:", error);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
          <h2 className="font-oswald text-2xl mb-2">Error al cargar analytics</h2>
          <Button asChild>
            <Link href="/admin/campaigns">Volver a Campañas</Link>
          </Button>
        </div>
      </div>
    );
  }

  const maxDailyValue = Math.max(
    ...data.dailyStats.map((d) => Math.max(d.views, d.conversions, d.downloads)),
    1
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/admin/campaigns/${resolvedParams.id}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              Analytics
            </h1>
            <p className="text-slc-muted mt-1">{data.campaign.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href={`/c/${data.campaign.slug}`} target="_blank">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Campaña
            </Link>
          </Button>
          <Button onClick={exportEmails} disabled={exporting}>
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar Emails (CSV)
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-slc-card border border-slc-border rounded-xl">
        <Calendar className="w-5 h-5 text-slc-muted" />
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            className="w-40"
          />
          <span className="text-slc-muted">a</span>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            className="w-40"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
        {(dateRange.start || dateRange.end) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateRange({ start: "", end: "" });
              fetchAnalytics();
            }}
          >
            Limpiar filtro
          </Button>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-slc-muted">Vistas</span>
          </div>
          <div className="font-oswald text-3xl text-blue-500">
            {data.campaign.totalViews.toLocaleString()}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/5 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="w-5 h-5 text-green-500" />
            <span className="text-sm text-slc-muted">Conversiones</span>
          </div>
          <div className="font-oswald text-3xl text-green-500">
            {data.campaign.totalConversions.toLocaleString()}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-slc-muted">Descargas</span>
          </div>
          <div className="font-oswald text-3xl text-purple-500">
            {data.campaign.totalDownloads.toLocaleString()}
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/5 border border-cyan-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-5 h-5 text-cyan-500" />
            <span className="text-sm text-slc-muted">Emails</span>
          </div>
          <div className="font-oswald text-3xl text-cyan-500">
            {data.stats.uniqueEmails.toLocaleString()}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-slc-muted">Presaves</span>
          </div>
          <div className="font-oswald text-3xl text-orange-500">
            {data.stats.totalPresaves.toLocaleString()}
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-sm text-slc-muted">Tasa Conv.</span>
          </div>
          <div className="font-oswald text-3xl text-primary">{data.stats.conversionRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-slc-dark border border-slc-border rounded-xl p-6">
          <h2 className="font-oswald text-xl uppercase mb-6">Últimos 30 días</h2>

          {/* Simple bar chart */}
          <div className="h-64 flex items-end gap-1">
            {data.dailyStats.map((day, i) => (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
                title={`${formatDate(day.date)}: ${day.conversions} conv.`}
              >
                <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: "200px" }}>
                  {/* Conversions bar */}
                  <div
                    className="w-full bg-green-500 rounded-t transition-all hover:bg-green-400"
                    style={{
                      height: `${(day.conversions / maxDailyValue) * 100}%`,
                      minHeight: day.conversions > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                {i % 5 === 0 && (
                  <span className="text-[10px] text-slc-muted whitespace-nowrap">
                    {formatDate(day.date)}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-sm text-slc-muted">Conversiones</span>
            </div>
          </div>
        </div>

        {/* Sources */}
        <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
          <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Fuentes de Tráfico
          </h2>

          {data.sources.length === 0 ? (
            <div className="text-center py-8 text-slc-muted">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Sin datos de fuentes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.sources.map((source) => {
                const total = data.sources.reduce((sum, s) => sum + s.count, 0);
                const percent = ((source.count / total) * 100).toFixed(1);
                return (
                  <div key={source.source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm truncate">{source.source}</span>
                      <span className="text-sm text-slc-muted">{source.count}</span>
                    </div>
                    <div className="h-2 bg-slc-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Actions Table */}
      <div className="mt-8 bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slc-border">
          <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Acciones Recientes
          </h2>
        </div>

        {data.recentActions.length === 0 ? (
          <div className="p-8 text-center text-slc-muted">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay acciones registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slc-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slc-muted uppercase">
                    Email
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slc-muted uppercase">
                    Presave
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slc-muted uppercase">
                    Follow
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slc-muted uppercase">
                    Download
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slc-muted uppercase">
                    Fuente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slc-muted uppercase">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slc-border">
                {data.recentActions.map((action) => (
                  <tr key={action.id} className="hover:bg-slc-card/50">
                    <td className="px-4 py-3">
                      <span className="text-sm">{action.email || "-"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {action.presave ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-slc-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {action.follow ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-slc-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {action.download ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-slc-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slc-muted">{action.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slc-muted">{formatDateTime(action.date)}</span>
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
