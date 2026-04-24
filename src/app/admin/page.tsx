"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Disc3,
  Music2,
  Calendar,
  ShoppingBag,
  Mail,
  Video,
  ImageIcon,
  Megaphone,
  TrendingUp,
  Loader2,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  counts: {
    artists: number;
    releases: number;
    beats: number;
    events: number;
    products: number;
    subscribers: number;
    videos: number;
    campaigns: number;
    galleryItems: number;
  };
  recentActivity: {
    type: string;
    id: string;
    title: string;
    subtitle: string | null;
    createdAt: string;
  }[];
}

const statCards = [
  { key: "artists" as const, label: "Artistas", icon: Users, href: "/admin/artistas" },
  { key: "releases" as const, label: "Lanzamientos", icon: Disc3, href: "/admin/releases" },
  { key: "beats" as const, label: "Beats", icon: Music2, href: "/admin/beats" },
  { key: "events" as const, label: "Eventos", icon: Calendar, href: "/admin/events" },
  { key: "products" as const, label: "Productos", icon: ShoppingBag, href: "/admin/products" },
  { key: "subscribers" as const, label: "Suscriptores", icon: Mail, href: "/admin/subscribers" },
];

const activityTypeConfig: Record<string, { label: string; color: string }> = {
  lanzamiento: { label: "Lanzamiento", color: "bg-primary/20 text-primary" },
  beat: { label: "Beat", color: "bg-blue-500/20 text-blue-400" },
  evento: { label: "Evento", color: "bg-amber-500/20 text-amber-400" },
  suscriptor: { label: "Suscriptor", color: "bg-purple-500/20 text-purple-400" },
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard/summary")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          Panel de Administración
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bienvenido al panel de gestión de Sonido Líquido Crew
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const count = data?.counts[card.key] ?? 0;
          return (
            <Link key={card.key} href={card.href}>
              <Card className="border-[#2a2a2a] bg-[#1a1a1a] transition-colors hover:border-primary/30 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <card.icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black">{count}</span>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-lg font-bold">Acciones Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/releases?action=new">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Lanzamiento
            </Button>
          </Link>
          <Link href="/admin/beats?action=new">
            <Button
              size="sm"
              variant="outline"
              className="border-[#2a2a2a] hover:border-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Beat
            </Button>
          </Link>
          <Link href="/admin/events?action=new">
            <Button
              size="sm"
              variant="outline"
              className="border-[#2a2a2a] hover:border-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Evento
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-3 text-lg font-bold">Actividad Reciente</h2>
        <Card className="border-[#2a2a2a] bg-[#1a1a1a]">
          <CardContent className="p-0">
            {data?.recentActivity && data.recentActivity.length > 0 ? (
              <div className="divide-y divide-[#2a2a2a]">
                {data.recentActivity.map((item) => {
                  const config = activityTypeConfig[item.type] || {
                    label: item.type,
                    color: "bg-muted text-muted-foreground",
                  };
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="secondary"
                          className={config.color}
                        >
                          {config.label}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground">
                No hay actividad reciente
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Extra Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#2a2a2a] bg-[#1a1a1a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Videos
            </CardTitle>
            <Video className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-black">
              {data?.counts.videos ?? 0}
            </span>
          </CardContent>
        </Card>
        <Card className="border-[#2a2a2a] bg-[#1a1a1a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Campañas
            </CardTitle>
            <Megaphone className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-black">
              {data?.counts.campaigns ?? 0}
            </span>
          </CardContent>
        </Card>
        <Card className="border-[#2a2a2a] bg-[#1a1a1a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Galería
            </CardTitle>
            <ImageIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-black">
              {data?.counts.galleryItems ?? 0}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
