"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Search,
  Trash2,
  RefreshCw,
  Download,
  Users,
  UserCheck,
  UserX,
  Calendar,
  Globe,
  User,
  MoreVertical,
  CheckCircle,
  XCircle,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  source: string | null;
  subscribedAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
}

interface SubscribersMeta {
  total: number;
  active: number;
  inactive: number;
}

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [meta, setMeta] = useState<SubscribersMeta>({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "suspicious">("all");
  const [selectedSubscribers, setSelectedSubscribers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscribers");
      const data = await res.json();
      if (data.success) {
        setSubscribers(data.data || []);
        setMeta(data.meta || { total: 0, active: 0, inactive: 0 });
      }
    } catch (error) {
      console.error("Error fetching subscribers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`¿Eliminar permanentemente a ${email}?`)) return;

    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permanent: true }),
      });

      if ((await res.json()).success) {
        fetchSubscribers();
      }
    } catch (error) {
      console.error("Error deleting subscriber:", error);
    }
  };

  const handleUnsubscribe = async (email: string) => {
    if (!confirm(`¿Dar de baja a ${email}?`)) return;

    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permanent: false }),
      });

      if ((await res.json()).success) {
        fetchSubscribers();
      }
    } catch (error) {
      console.error("Error unsubscribing:", error);
    }
  };

  const handleBulkUnsubscribe = async () => {
    if (selectedSubscribers.size === 0) return;
    if (!confirm(`¿Dar de baja a ${selectedSubscribers.size} suscriptores?`)) return;

    let done = 0;
    for (const id of selectedSubscribers) {
      const subscriber = subscribers.find((s) => s.id === id);
      if (subscriber) {
        const res = await fetch("/api/admin/subscribers", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: subscriber.email, permanent: false }),
        });
        if ((await res.json()).success) done++;
      }
    }

    alert(`Se dieron de baja ${done} suscriptores.`);
    setSelectedSubscribers(new Set());
    fetchSubscribers();
  };

  const handleBulkDelete = async () => {
    if (selectedSubscribers.size === 0) return;
    if (!confirm(`¿ELIMINAR PERMANENTEMENTE a ${selectedSubscribers.size} suscriptores? Esta acción no se puede deshacer.`)) return;

    let done = 0;
    for (const id of selectedSubscribers) {
      const subscriber = subscribers.find((s) => s.id === id);
      if (subscriber) {
        const res = await fetch("/api/admin/subscribers", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: subscriber.email, permanent: true }),
        });
        if ((await res.json()).success) done++;
      }
    }

    alert(`Se eliminaron permanentemente ${done} suscriptores.`);
    setSelectedSubscribers(new Set());
    fetchSubscribers();
  };

  const exportSubscribers = () => {
    const activeSubscribers = subscribers.filter((s) => s.isActive);
    const csv = [
      ["Email", "Name", "Source", "Subscribed At"].join(","),
      ...activeSubscribers.map((s) =>
        [
          s.email,
          s.name || "",
          s.source || "website",
          new Date(s.subscribedAt).toISOString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suscriptores-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Known spam domains
  const SPAM_DOMAINS = [
    "chameleongroup.co", "a7g.ru", "mailinator.com", "guerrillamail.com",
    "sharklasers.com", "guerrillamailblock.com", "grr.la", "dispostable.com",
    "trashmail.com", "tempmail.com", "throwaway.email",
  ];

  // Valid subscription sources on the public site
  const VALID_SOURCES = [
    "website", "newsletter-form", "homepage", "newsletter-page",
    "newsletter-cta", "popup_time", "popup_scroll", "popup_exit-intent",
    "download-gate",
  ];

  // Human-readable source labels
  const SOURCE_LABELS: Record<string, string> = {
    website: "Sitio web",
    "newsletter-form": "Formulario",
    homepage: "Homepage",
    "newsletter-page": "Página Newsletter",
    "newsletter-cta": "CTA Newsletter",
    popup_time: "Popup (tiempo)",
    popup_scroll: "Popup (scroll)",
    "popup_exit-intent": "Popup (salida)",
    "download-gate": "Descarga",
  };

  const isLikelyBot = (subscriber: Subscriber): boolean => {
    const email = subscriber.email.toLowerCase();
    const name = subscriber.name || "";
    const source = subscriber.source || "website";

    // Check spam domains
    const domain = email.split("@")[1];
    if (domain && SPAM_DOMAINS.includes(domain)) return true;

    // Obfuscated email (4+ dots in local part)
    const localPart = email.split("@")[0];
    if ((localPart.match(/\./g) || []).length >= 4) return true;

    // Gibberish name (15+ chars, only letters, multiple consonant clusters)
    if (name.length >= 15 && /^[a-zA-Z]+$/.test(name)) {
      const clusters = name.match(/[^aeiouAEIOU]{4,}/g);
      if (clusters && clusters.length >= 2) return true;
    }

    // Invalid source (doesn't exist on public site)
    if (!VALID_SOURCES.includes(source) && !source.startsWith("download-gate:") && !source.startsWith("popup_")) {
      return true;
    }

    return false;
  };

  const suspiciousCount = subscribers.filter(isLikelyBot).length;

  const filteredSubscribers = subscribers.filter((subscriber) => {
    const matchesSearch =
      subscriber.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (subscriber.name && subscriber.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && subscriber.isActive && !isLikelyBot(subscriber)) ||
      (statusFilter === "inactive" && !subscriber.isActive) ||
      (statusFilter === "suspicious" && isLikelyBot(subscriber));
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedSubscribers.size === filteredSubscribers.length) {
      setSelectedSubscribers(new Set());
    } else {
      setSelectedSubscribers(new Set(filteredSubscribers.map((s) => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedSubscribers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSubscribers(newSelected);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCleanBots = async () => {
    const bots = subscribers.filter(isLikelyBot);
    if (bots.length === 0) return;
    if (!confirm(`Se eliminarán ${bots.length} suscriptores sospechosos de ser bots. ¿Continuar?`)) return;

    let deleted = 0;
    for (const bot of bots) {
      try {
        const res = await fetch("/api/admin/subscribers", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: bot.email, permanent: true }),
        });
        if ((await res.json()).success) deleted++;
      } catch {}
    }

    alert(`Se eliminaron ${deleted} suscriptores sospechosos.`);
    setSelectedSubscribers(new Set());
    fetchSubscribers();
  };

  const getSourceBadge = (source: string | null, subscriber: Subscriber) => {
    const colors: Record<string, string> = {
      website: "bg-blue-500/10 text-blue-500",
      "newsletter-form": "bg-cyan-500/10 text-cyan-500",
      homepage: "bg-green-500/10 text-green-500",
      "newsletter-page": "bg-emerald-500/10 text-emerald-500",
      "newsletter-cta": "bg-teal-500/10 text-teal-500",
      popup_time: "bg-purple-500/10 text-purple-500",
      popup_scroll: "bg-violet-500/10 text-violet-500",
      "popup_exit-intent": "bg-fuchsia-500/10 text-fuchsia-500",
      "download-gate": "bg-amber-500/10 text-amber-500",
      footer: "bg-green-500/10 text-green-500",
      landing: "bg-orange-500/10 text-orange-500",
      import: "bg-gray-500/10 text-gray-500",
    };

    const src = source || "website";
    const isBot = isLikelyBot(subscriber);
    const label = SOURCE_LABELS[src] || src;

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs ${isBot ? "bg-red-500/10 text-red-500" : (colors[src] || "bg-yellow-500/10 text-yellow-500")}`}>
        {isBot && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
        {isBot ? `⚠ ${src}` : label}
      </span>
    );
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Suscriptores</h1>
          <p className="text-slc-muted mt-1">
            Gestiona los suscriptores del newsletter
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {suspiciousCount > 0 && (
            <Button variant="outline" onClick={handleCleanBots} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <Shield className="w-4 h-4 mr-2" />
              Eliminar {suspiciousCount} bots
            </Button>
          )}
          <Button variant="outline" onClick={fetchSubscribers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button variant="outline" onClick={exportSubscribers}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="w-5 h-5 text-slc-muted" />
          </div>
          <div className="font-oswald text-2xl text-primary">{meta.total}</div>
          <div className="text-xs text-slc-muted uppercase">Total</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <UserCheck className="w-5 h-5 text-green-500" />
          </div>
          <div className="font-oswald text-2xl text-green-500">{meta.active}</div>
          <div className="text-xs text-slc-muted uppercase">Activos</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <UserX className="w-5 h-5 text-red-500" />
          </div>
          <div className="font-oswald text-2xl text-red-500">{meta.inactive}</div>
          <div className="text-xs text-slc-muted uppercase">Inactivos</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="font-oswald text-2xl text-yellow-500">{suspiciousCount}</div>
          <div className="text-xs text-slc-muted uppercase">Sospechosos</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <Input
            type="text"
            placeholder="Buscar por email o nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive" | "suspicious")}
          className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg"
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="suspicious">⚠ Sospechosos ({suspiciousCount})</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedSubscribers.size > 0 && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">
            {selectedSubscribers.size} suscriptor{selectedSubscribers.size !== 1 ? "es" : ""} seleccionado{selectedSubscribers.size !== 1 ? "s" : ""}
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="destructive" onClick={handleBulkUnsubscribe}>
            <UserX className="w-4 h-4 mr-1" />
            Dar de baja
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedSubscribers(new Set())}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Subscribers Table */}
      <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slc-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Cargando suscriptores...
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 text-slc-muted mx-auto mb-4" />
            <p className="text-slc-muted">No hay suscriptores {searchQuery ? "que coincidan" : "todavía"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slc-border">
                  <th className="text-left px-6 py-4 w-8">
                    <input
                      type="checkbox"
                      checked={selectedSubscribers.size === filteredSubscribers.length && filteredSubscribers.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slc-border"
                    />
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Fuente
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Fecha
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
                {filteredSubscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="hover:bg-slc-card/50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedSubscribers.has(subscriber.id)}
                        onChange={() => toggleSelect(subscriber.id)}
                        className="w-4 h-4 rounded border-slc-border"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <Mail className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{subscriber.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slc-muted">
                      {subscriber.name || "-"}
                    </td>
                    <td className="px-6 py-4">
                      {getSourceBadge(subscriber.source, subscriber)}
                    </td>
                    <td className="px-6 py-4 text-slc-muted text-sm">
                      {formatDate(subscriber.subscribedAt)}
                    </td>
                    <td className="px-6 py-4">
                      {subscriber.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-500">
                          <CheckCircle className="w-3 h-3" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/10 text-red-500">
                          <XCircle className="w-3 h-3" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {subscriber.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-400"
                          onClick={() => handleUnsubscribe(subscriber.email)}
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-sm text-slc-muted text-center">
        {filteredSubscribers.length > 0 && (
          <p>
            Mostrando {filteredSubscribers.length} de {meta.total} suscriptores
          </p>
        )}
      </div>
    </div>
  );
}
