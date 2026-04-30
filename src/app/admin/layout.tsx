"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Disc3,
  Video,
  ShoppingBag,
  Calendar,
  Mail,
  Settings,
  RefreshCw,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  Megaphone,
  Music,
  Newspaper,
  FileText,
  Image,
  Cloud,
  Youtube,
  Rocket,
  MessageCircle,
  Palette,
  ListMusic,
  Download,
  Brush,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/artists", label: "Artistas", icon: Users },
  { href: "/admin/releases", label: "Lanzamientos", icon: Disc3 },
  { href: "/admin/upcoming-releases", label: "Próximos Lanzamientos", icon: Rocket },
  { href: "/admin/campaigns", label: "Campañas", icon: Megaphone },
  { href: "/admin/beats", label: "Beats", icon: Music },
  { href: "/admin/press-kits", label: "Press Kits", icon: FileText },
  { href: "/admin/media-releases", label: "Media Releases", icon: Newspaper },
  { href: "/admin/styles", label: "Estilos", icon: Palette },
  { href: "/admin/videos", label: "Videos", icon: Video },
  { href: "/admin/youtube-channels", label: "Canales YouTube", icon: Youtube },
  { href: "/admin/curated-channels", label: "Canales Spotify", icon: ListMusic },
  { href: "/admin/gallery", label: "Galería", icon: Image },
  { href: "/admin/uploads", label: "Test Uploads", icon: Cloud },
  { href: "/admin/products", label: "Productos", icon: ShoppingBag },
  { href: "/admin/events", label: "Eventos", icon: Calendar },
  { href: "/admin/subscribers", label: "Suscriptores", icon: Mail },
  { href: "/admin/community", label: "Comunidad", icon: MessageCircle },
  { href: "/admin/sync", label: "Sincronización", icon: RefreshCw },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
  { href: "/admin/themes", label: "Temas", icon: Brush },
  { href: "/admin/export", label: "Exportar", icon: Download },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b border-slc-border bg-slc-dark">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-primary" />
          </div>
          <span className="font-oswald text-lg uppercase">Admin</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed top-16 left-0 z-50 w-64 h-[calc(100vh-4rem)] bg-slc-dark border-r border-slc-border transform transition-transform duration-200",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="p-4 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slc-muted hover:text-white hover:bg-slc-card"
                )}
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden lg:flex flex-col sticky top-0 h-screen border-r border-slc-border bg-slc-dark transition-all duration-200",
            isSidebarOpen ? "w-64" : "w-20"
          )}
        >
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slc-border">
            {isSidebarOpen && (
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <span className="font-oswald text-sm uppercase">Sonido Líquido</span>
                  <span className="block text-[10px] text-primary uppercase">Admin</span>
                </div>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="ml-auto"
            >
              <ChevronLeft className={cn(
                "w-4 h-4 transition-transform",
                !isSidebarOpen && "rotate-180"
              )} />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href ||
                (link.href !== "/admin" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-slc-muted hover:text-white hover:bg-slc-card",
                    !isSidebarOpen && "justify-center px-2"
                  )}
                  title={!isSidebarOpen ? link.label : undefined}
                >
                  <link.icon className="w-5 h-5 flex-shrink-0" />
                  {isSidebarOpen && <span>{link.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slc-border">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-slc-muted hover:text-white hover:bg-slc-card transition-colors",
                !isSidebarOpen && "justify-center px-2"
              )}
              title={!isSidebarOpen ? "Volver al sitio" : undefined}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span>Volver al sitio</span>}
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
