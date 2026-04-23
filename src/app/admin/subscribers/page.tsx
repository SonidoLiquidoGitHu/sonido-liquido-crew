"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Search,
  Trash2,
  Loader2,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: string;
  source: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: {
    label: "Activo",
    color: "bg-primary/20 text-primary",
    icon: CheckCircle,
  },
  unsubscribed: {
    label: "Desuscrito",
    color: "bg-red-500/20 text-red-400",
    icon: XCircle,
  },
  bounced: {
    label: "Rebotado",
    color: "bg-amber-500/20 text-amber-400",
    icon: AlertCircle,
  },
};

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Subscriber | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all")
        params.set("status", statusFilter);
      const res = await fetch(`/api/admin/subscribers?${params}`);
      const data = await res.json();
      setSubscribers(Array.isArray(data) ? data : []);
    } catch {
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await fetch(`/api/admin/subscribers?id=${deleting.id}`, {
        method: "DELETE",
      });
      setDeleteOpen(false);
      setDeleting(null);
      fetchSubscribers();
    } catch (error) {
      console.error("Error deleting subscriber:", error);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/subscribers");
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const headers = ["Email", "Nombre", "Estado", "Fuente", "Fecha"];
      const rows = data.map((s: Subscriber) => [
        s.email,
        s.name || "",
        s.status,
        s.source || "",
        new Date(s.createdAt).toLocaleDateString("es-MX"),
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `suscriptores_slc_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || {
      label: status,
      color: "bg-muted text-muted-foreground",
      icon: Mail,
    };
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const sourceLabel = (source: string | null) => {
    const map: Record<string, string> = {
      website: "Sitio web",
      popup: "Popup",
      manual: "Manual",
    };
    return source ? map[source] || source : "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Suscriptores</h1>
          <p className="text-muted-foreground">
            Gestiona la lista de suscriptores del newsletter
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={exporting}
          variant="outline"
          className="border-[#2a2a2a] hover:border-primary"
        >
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-[#2a2a2a] bg-[#1a1a1a] pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] border-[#2a2a2a] bg-[#1a1a1a]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="unsubscribed">Desuscrito</SelectItem>
            <SelectItem value="bounced">Rebotado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Nombre</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground">Fuente</TableHead>
                <TableHead className="text-muted-foreground">Fecha</TableHead>
                <TableHead className="text-muted-foreground text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No se encontraron suscriptores
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((sub) => (
                  <TableRow key={sub.id} className="border-[#2a2a2a]">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        {sub.email}
                      </div>
                    </TableCell>
                    <TableCell>{sub.name || "—"}</TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell>{sourceLabel(sub.source)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sub.createdAt).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => {
                          setDeleting(sub);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-[#2a2a2a] bg-[#1a1a1a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar suscriptor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al
              suscriptor &quot;{deleting?.email}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2a2a2a]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
