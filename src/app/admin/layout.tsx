"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Disc3,
  Music2,
  Calendar,
  ShoppingBag,
  Video,
  ImageIcon,
  Megaphone,
  Mail,
  Settings,
  Headphones,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Artistas", href: "/admin/artistas", icon: Users },
  { title: "Lanzamientos", href: "/admin/releases", icon: Disc3 },
  { title: "Beats", href: "/admin/beats", icon: Music2 },
  { title: "Eventos", href: "/admin/events", icon: Calendar },
  { title: "Productos", href: "/admin/products", icon: ShoppingBag },
  { title: "Videos", href: "/admin/videos", icon: Video },
  { title: "Galería", href: "/admin/gallery", icon: ImageIcon },
  { title: "Campañas", href: "/admin/campaigns", icon: Megaphone },
  { title: "Suscriptores", href: "/admin/subscribers", icon: Mail },
];

const settingsItem = {
  title: "Configuración",
  href: "/admin/settings",
  icon: Settings,
};

function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-[#2a2a2a]">
      <SidebarHeader className="p-4">
        <Link
          href="/admin"
          className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Headphones className="h-4 w-4" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold tracking-tight">SLC Admin</p>
            <p className="text-[10px] text-muted-foreground">
              Sonido Líquido Crew
            </p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Menú Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon
                          className={
                            isActive ? "text-primary" : "text-muted-foreground"
                          }
                        />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === settingsItem.href}
                  tooltip={settingsItem.title}
                >
                  <Link href={settingsItem.href}>
                    <settingsItem.icon className="text-muted-foreground" />
                    <span>{settingsItem.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/auth/check")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setStatus(data.authenticated ? "ok" : "denied");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("denied");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status === "denied") {
      router.push("/admin/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f97316] text-white animate-pulse">
            <Headphones className="h-6 w-6" />
          </div>
          <p className="text-sm text-[#888]">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (status !== "ok") {
    return null;
  }

  return <>{children}</>;
}

function AdminContent({
  children,
  onLogout,
}: {
  children: React.ReactNode;
  onLogout: () => void;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b border-[#2a2a2a] bg-[#0a0a0a] px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5 bg-[#2a2a2a]" />
          <div className="flex-1" />
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#f97316] transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
          <Separator orientation="vertical" className="h-5 bg-[#2a2a2a]" />
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Ver sitio →
          </Link>
        </header>
        <main className="flex-1 overflow-auto bg-[#0a0a0a] p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  // Login page: render children directly without sidebar layout or auth check
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <AdminContent
        onLogout={() => {
          fetch("/api/admin/auth/logout", { method: "POST" }).finally(() => {
            router.push("/admin/login");
          });
        }}
      >
        {children}
      </AdminContent>
    </AuthGuard>
  );
}
