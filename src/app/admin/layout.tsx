"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b border-[#2a2a2a] bg-[#0a0a0a] px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5 bg-[#2a2a2a]" />
          <div className="flex-1" />
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
