"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save,
  Settings,
  Globe,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Music,
  Video,
  ShoppingBag,
  Cloud,
  Eye,
  EyeOff,
  HardDrive,
  Trash2,
  Plug,
  Bell,
  Timer,
  Percent,
  MousePointerClick,
  TestTube,
  Image,
  Plus,
  X,
  BarChart3,
  RotateCcw,
} from "lucide-react";

interface SiteSetting {
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "json";
}

interface Benefit {
  icon: string;
  title: string;
  color: string;
  imageUrl?: string;
}

interface PopupSettings {
  delaySeconds: number;
  showOnScroll: boolean;
  scrollPercentage: number;
  exitIntentEnabled: boolean;
  exitIntentDelay: number;
  benefits: Benefit[];
  headline: string;
  subheadline: string;
  badgeText: string;
  buttonText: string;
  successTitle: string;
  successMessage: string;
  abTestEnabled: boolean;
  variantAHeadline: string;
  variantBHeadline: string;
  variantAButtonText: string;
  variantBButtonText: string;
  popupImageUrl: string;
  dismissDays: number;
}

interface PopupAnalytics {
  variantA: { shown: number; closed: number; converted: number };
  variantB: { shown: number; closed: number; converted: number };
  bySource: {
    time: { shown: number; converted: number };
    scroll: { shown: number; converted: number };
    "exit-intent": { shown: number; converted: number };
  };
  conversionRates: { variantA: string; variantB: string };
  lastUpdated: string;
}

const defaultPopupSettings: PopupSettings = {
  delaySeconds: 8,
  showOnScroll: true,
  scrollPercentage: 50,
  exitIntentEnabled: true,
  exitIntentDelay: 2000,
  benefits: [
    { icon: "download", title: "Descargas exclusivas", color: "primary" },
    { icon: "music", title: "Adelantos de releases", color: "green-500" },
    { icon: "calendar", title: "Info de eventos", color: "cyan-500" },
  ],
  headline: "¡APÚNTATE!",
  subheadline: "Suscríbete y obtén acceso a contenido exclusivo del crew.",
  badgeText: "Contenido Exclusivo",
  buttonText: "Suscribirme Gratis",
  successTitle: "¡Bienvenido al Crew!",
  successMessage: "Revisa tu correo para confirmar tu suscripción y recibir tu contenido exclusivo.",
  abTestEnabled: false,
  variantAHeadline: "",
  variantBHeadline: "",
  variantAButtonText: "",
  variantBButtonText: "",
  popupImageUrl: "", // Leave empty to use default icon
  dismissDays: 7,
};

const iconOptions = [
  { value: "download", label: "Descarga" },
  { value: "music", label: "Música" },
  { value: "calendar", label: "Calendario" },
  { value: "gift", label: "Regalo" },
  { value: "sparkles", label: "Destellos" },
  { value: "headphones", label: "Audífonos" },
  { value: "star", label: "Estrella" },
];

const colorOptions = [
  { value: "primary", label: "Naranja", class: "bg-primary" },
  { value: "green-500", label: "Verde", class: "bg-green-500" },
  { value: "cyan-500", label: "Cyan", class: "bg-cyan-500" },
  { value: "yellow-500", label: "Amarillo", class: "bg-yellow-500" },
  { value: "red-500", label: "Rojo", class: "bg-red-500" },
  { value: "purple-500", label: "Púrpura", class: "bg-purple-500" },
  { value: "pink-500", label: "Rosa", class: "bg-pink-500" },
];

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dropbox state
  const [dropboxToken, setDropboxToken] = useState("");
  const [showDropboxToken, setShowDropboxToken] = useState(false);
  const [dropboxStatus, setDropboxStatus] = useState<{
    configured: boolean;
    connected: boolean;
    accountName?: string;
    email?: string;
    storage?: { used: number; allocated: number };
    tokenPreview?: string;
    error?: string;
  } | null>(null);
  const [dropboxLoading, setDropboxLoading] = useState(false);
  const [dropboxTesting, setDropboxTesting] = useState(false);

  // Newsletter Popup state
  const [popupSettings, setPopupSettings] = useState<PopupSettings>(defaultPopupSettings);
  const [popupAnalytics, setPopupAnalytics] = useState<PopupAnalytics | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupSaving, setPopupSaving] = useState(false);

  const [settings, setSettings] = useState({
    // General
    site_name: "Sonido Líquido Crew",
    site_tagline: "Hip Hop México desde 1999",
    founded_year: "1999",

    // Contact
    contact_email: "prensasonidoliquido@gmail.com",
    contact_phone: "5528011881",
    location: "Ciudad de México, CDMX",

    // Social
    spotify_playlist_url: "https://open.spotify.com/playlist/5qHTKCZIwi3GM3mhPq45Ab",
    youtube_channel_url: "https://www.youtube.com/@sonidoliquidocrew",
    instagram_url: "https://www.instagram.com/sonidoliquido/",
    facebook_url: "https://www.facebook.com/sonidoliquidocrew/",
    twitter_url: "",
    tiktok_url: "",

    // API Keys (masked)
    spotify_client_id: "d43c***8",
    spotify_client_secret: "d3c***b6",
    youtube_api_key: "",

    // Store
    store_enabled: true,
    store_currency: "MXN",
    stripe_enabled: false,

    // Features
    newsletter_enabled: true,
    events_enabled: true,
    downloads_enabled: true,
  });

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            // Merge fetched settings with defaults
            const fetched = data.data.reduce((acc: any, s: SiteSetting) => {
              acc[s.key] = s.value;
              return acc;
            }, {});
            setSettings(prev => ({ ...prev, ...fetched }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
    fetchDropboxStatus();
    fetchPopupSettings();
  }, []);

  // Fetch Dropbox status
  const fetchDropboxStatus = async () => {
    setDropboxLoading(true);
    try {
      const res = await fetch("/api/admin/dropbox");
      const data = await res.json();
      if (data.success) {
        setDropboxStatus(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch Dropbox status:", error);
    } finally {
      setDropboxLoading(false);
    }
  };

  // Fetch Newsletter Popup settings
  const fetchPopupSettings = async () => {
    setPopupLoading(true);
    try {
      const [settingsRes, analyticsRes] = await Promise.all([
        fetch("/api/newsletter/popup-settings"),
        fetch("/api/newsletter/popup-analytics"),
      ]);

      const settingsData = await settingsRes.json();
      const analyticsData = await analyticsRes.json();

      if (settingsData.success && settingsData.settings) {
        setPopupSettings(settingsData.settings);
      }

      if (analyticsData.success && analyticsData.analytics) {
        setPopupAnalytics(analyticsData.analytics);
      }
    } catch (error) {
      console.error("Failed to fetch popup settings:", error);
    } finally {
      setPopupLoading(false);
    }
  };

  // Save Newsletter Popup settings
  const savePopupSettings = async () => {
    setPopupSaving(true);
    try {
      const res = await fetch("/api/newsletter/popup-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(popupSettings),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Configuración del popup guardada" });
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setPopupSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Reset A/B test analytics
  const resetAnalytics = async () => {
    if (!confirm("¿Estás seguro de que quieres reiniciar las estadísticas del A/B test?")) {
      return;
    }

    try {
      const res = await fetch("/api/newsletter/popup-analytics", {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Estadísticas reiniciadas" });
        fetchPopupSettings();
      } else {
        setMessage({ type: "error", text: data.error || "Error al reiniciar" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  // Update popup setting
  const updatePopupSetting = <K extends keyof PopupSettings>(key: K, value: PopupSettings[K]) => {
    setPopupSettings(prev => ({ ...prev, [key]: value }));
  };

  // Add benefit
  const addBenefit = () => {
    if (popupSettings.benefits.length >= 5) return;
    setPopupSettings(prev => ({
      ...prev,
      benefits: [...prev.benefits, { icon: "gift", title: "Nuevo beneficio", color: "primary" }],
    }));
  };

  // Remove benefit
  const removeBenefit = (index: number) => {
    setPopupSettings(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  // Update benefit
  const updateBenefit = (index: number, field: keyof Benefit, value: string) => {
    setPopupSettings(prev => ({
      ...prev,
      benefits: prev.benefits.map((b, i) => i === index ? { ...b, [field]: value } : b),
    }));
  };

  // Test Dropbox token
  const testDropboxToken = async () => {
    if (!dropboxToken.trim()) {
      setMessage({ type: "error", text: "Por favor ingresa un token de Dropbox" });
      return;
    }

    setDropboxTesting(true);
    try {
      const res = await fetch("/api/admin/dropbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: dropboxToken, action: "test" }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `Token válido. Cuenta: ${data.data.accountName} (${data.data.email})`
        });
      } else {
        setMessage({ type: "error", text: data.error || "Token inválido" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al probar el token" });
    } finally {
      setDropboxTesting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Save Dropbox token
  const saveDropboxToken = async () => {
    if (!dropboxToken.trim()) {
      setMessage({ type: "error", text: "Por favor ingresa un token de Dropbox" });
      return;
    }

    setDropboxTesting(true);
    try {
      const res = await fetch("/api/admin/dropbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: dropboxToken, action: "save" }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message || "Token guardado exitosamente" });
        setDropboxToken("");
        fetchDropboxStatus();
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar el token" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al guardar el token" });
    } finally {
      setDropboxTesting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Clear Dropbox token
  const clearDropboxToken = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar el token de Dropbox?")) {
      return;
    }

    setDropboxTesting(true);
    try {
      const res = await fetch("/api/admin/dropbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Token de Dropbox eliminado" });
        fetchDropboxStatus();
      } else {
        setMessage({ type: "error", text: data.error || "Error al eliminar el token" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al eliminar el token" });
    } finally {
      setDropboxTesting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "Configuración guardada exitosamente" });
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const updateSetting = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Configuración</h1>
          <p className="text-slc-muted mt-1">
            Gestiona la configuración general del sitio
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === "success"
            ? "bg-green-500/10 border border-green-500/20 text-green-500"
            : "bg-red-500/10 border border-red-500/20 text-red-500"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-slc-muted" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* General Settings */}
          <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h2 className="font-oswald text-xl uppercase">General</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slc-muted mb-2">Nombre del Sitio</label>
                <Input
                  value={settings.site_name}
                  onChange={(e) => updateSetting("site_name", e.target.value)}
                  placeholder="Sonido Líquido Crew"
                />
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-2">Tagline</label>
                <Input
                  value={settings.site_tagline}
                  onChange={(e) => updateSetting("site_tagline", e.target.value)}
                  placeholder="Hip Hop México desde 1999"
                />
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-2">Año de Fundación</label>
                <Input
                  value={settings.founded_year}
                  onChange={(e) => updateSetting("founded_year", e.target.value)}
                  placeholder="1999"
                  type="number"
                />
              </div>
            </div>
          </div>

          {/* Contact Settings */}
          <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="font-oswald text-xl uppercase">Contacto</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slc-muted mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
                  <Input
                    value={settings.contact_email}
                    onChange={(e) => updateSetting("contact_email", e.target.value)}
                    placeholder="email@example.com"
                    type="email"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-2">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
                  <Input
                    value={settings.contact_phone}
                    onChange={(e) => updateSetting("contact_phone", e.target.value)}
                    placeholder="+52 55 1234 5678"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-2">Ubicación</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
                  <Input
                    value={settings.location}
                    onChange={(e) => updateSetting("location", e.target.value)}
                    placeholder="Ciudad de México, CDMX"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <LinkIcon className="w-5 h-5" />
              </div>
              <h2 className="font-oswald text-xl uppercase">Redes Sociales</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slc-muted mb-2">Spotify Playlist</label>
                <Input
                  value={settings.spotify_playlist_url}
                  onChange={(e) => updateSetting("spotify_playlist_url", e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                />
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-2">YouTube</label>
                <Input
                  value={settings.youtube_channel_url}
                  onChange={(e) => updateSetting("youtube_channel_url", e.target.value)}
                  placeholder="https://www.youtube.com/..."
                />
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-2">Instagram</label>
                <Input
                  value={settings.instagram_url}
                  onChange={(e) => updateSetting("instagram_url", e.target.value)}
                  placeholder="https://www.instagram.com/..."
                />
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-2">Facebook</label>
                <Input
                  value={settings.facebook_url}
                  onChange={(e) => updateSetting("facebook_url", e.target.value)}
                  placeholder="https://www.facebook.com/..."
                />
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-2">Twitter/X</label>
                <Input
                  value={settings.twitter_url}
                  onChange={(e) => updateSetting("twitter_url", e.target.value)}
                  placeholder="https://twitter.com/..."
                />
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-2">TikTok</label>
                <Input
                  value={settings.tiktok_url}
                  onChange={(e) => updateSetting("tiktok_url", e.target.value)}
                  placeholder="https://www.tiktok.com/..."
                />
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <h2 className="font-oswald text-xl uppercase">Funcionalidades</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-slc-card rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-slc-muted" />
                  <span>Tienda en línea</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.store_enabled}
                  onChange={(e) => updateSetting("store_enabled", e.target.checked)}
                  className="w-5 h-5 rounded border-slc-border"
                />
              </label>
              <label className="flex items-center justify-between p-4 bg-slc-card rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slc-muted" />
                  <span>Newsletter</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.newsletter_enabled}
                  onChange={(e) => updateSetting("newsletter_enabled", e.target.checked)}
                  className="w-5 h-5 rounded border-slc-border"
                />
              </label>
              <label className="flex items-center justify-between p-4 bg-slc-card rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-slc-muted" />
                  <span>Eventos</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.events_enabled}
                  onChange={(e) => updateSetting("events_enabled", e.target.checked)}
                  className="w-5 h-5 rounded border-slc-border"
                />
              </label>
              <label className="flex items-center justify-between p-4 bg-slc-card rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-slc-muted" />
                  <span>Descargas</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.downloads_enabled}
                  onChange={(e) => updateSetting("downloads_enabled", e.target.checked)}
                  className="w-5 h-5 rounded border-slc-border"
                />
              </label>
            </div>
          </div>

          {/* Newsletter Popup Settings - Full Width */}
          <div className="bg-slc-dark border border-slc-border rounded-xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-oswald text-xl uppercase">Newsletter Popup</h2>
                  <p className="text-xs text-slc-muted">Configura el popup de suscripción</p>
                </div>
              </div>
              <Button onClick={savePopupSettings} disabled={popupSaving} size="sm">
                {popupSaving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar Popup
              </Button>
            </div>

            {popupLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-slc-muted" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Timing Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slc-card p-4 rounded-lg border border-slc-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Timer className="w-4 h-4 text-primary" />
                      <label className="text-sm font-medium">Retraso (segundos)</label>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      value={popupSettings.delaySeconds}
                      onChange={(e) => updatePopupSetting("delaySeconds", parseInt(e.target.value) || 8)}
                      className="text-center"
                    />
                    <p className="text-xs text-slc-muted mt-2">Tiempo antes de mostrar el popup</p>
                  </div>

                  <div className="bg-slc-card p-4 rounded-lg border border-slc-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Percent className="w-4 h-4 text-green-500" />
                      <label className="text-sm font-medium">Scroll (%)</label>
                    </div>
                    <Input
                      type="number"
                      min="10"
                      max="100"
                      value={popupSettings.scrollPercentage}
                      onChange={(e) => updatePopupSetting("scrollPercentage", parseInt(e.target.value) || 50)}
                      className="text-center"
                      disabled={!popupSettings.showOnScroll}
                    />
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={popupSettings.showOnScroll}
                        onChange={(e) => updatePopupSetting("showOnScroll", e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-xs text-slc-muted">Activar por scroll</span>
                    </label>
                  </div>

                  <div className="bg-slc-card p-4 rounded-lg border border-slc-border">
                    <div className="flex items-center gap-2 mb-3">
                      <MousePointerClick className="w-4 h-4 text-cyan-500" />
                      <label className="text-sm font-medium">Exit Intent</label>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max="10000"
                      step="500"
                      value={popupSettings.exitIntentDelay}
                      onChange={(e) => updatePopupSetting("exitIntentDelay", parseInt(e.target.value) || 2000)}
                      className="text-center"
                      disabled={!popupSettings.exitIntentEnabled}
                    />
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={popupSettings.exitIntentEnabled}
                        onChange={(e) => updatePopupSetting("exitIntentEnabled", e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-xs text-slc-muted">Detectar salida</span>
                    </label>
                  </div>

                  <div className="bg-slc-card p-4 rounded-lg border border-slc-border">
                    <div className="flex items-center gap-2 mb-3">
                      <RotateCcw className="w-4 h-4 text-purple-500" />
                      <label className="text-sm font-medium">Días de espera</label>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={popupSettings.dismissDays}
                      onChange={(e) => updatePopupSetting("dismissDays", parseInt(e.target.value) || 7)}
                      className="text-center"
                    />
                    <p className="text-xs text-slc-muted mt-2">Días antes de volver a mostrar</p>
                  </div>
                </div>

                {/* Content Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Titular</label>
                    <Input
                      value={popupSettings.headline}
                      onChange={(e) => updatePopupSetting("headline", e.target.value)}
                      placeholder="¡APÚNTATE!"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Subtítulo</label>
                    <Input
                      value={popupSettings.subheadline}
                      onChange={(e) => updatePopupSetting("subheadline", e.target.value)}
                      placeholder="Suscríbete y obtén acceso..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Badge</label>
                    <Input
                      value={popupSettings.badgeText}
                      onChange={(e) => updatePopupSetting("badgeText", e.target.value)}
                      placeholder="Contenido Exclusivo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Texto del Botón</label>
                    <Input
                      value={popupSettings.buttonText}
                      onChange={(e) => updatePopupSetting("buttonText", e.target.value)}
                      placeholder="Suscribirme Gratis"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Título de Éxito</label>
                    <Input
                      value={popupSettings.successTitle}
                      onChange={(e) => updatePopupSetting("successTitle", e.target.value)}
                      placeholder="¡Bienvenido al Crew!"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Mensaje de Éxito</label>
                    <Input
                      value={popupSettings.successMessage}
                      onChange={(e) => updatePopupSetting("successMessage", e.target.value)}
                      placeholder="Revisa tu correo..."
                    />
                  </div>
                </div>

                {/* Popup Image */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Image className="w-4 h-4 text-slc-muted" />
                    <label className="text-sm text-slc-muted">Imagen del Popup</label>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="flex-1">
                      <Input
                        value={popupSettings.popupImageUrl}
                        onChange={(e) => updatePopupSetting("popupImageUrl", e.target.value)}
                        placeholder="https://..."
                      />
                      <p className="text-xs text-slc-muted mt-1">URL de la imagen (PNG o SVG recomendado)</p>
                    </div>
                    {popupSettings.popupImageUrl && (
                      <div className="w-20 h-20 bg-slc-card rounded-lg border border-slc-border p-2 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={popupSettings.popupImageUrl}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Beneficios</label>
                      <span className="text-xs text-slc-muted">({popupSettings.benefits.length}/5)</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addBenefit}
                      disabled={popupSettings.benefits.length >= 5}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {popupSettings.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-3 bg-slc-card p-3 rounded-lg border border-slc-border">
                        <select
                          value={benefit.icon}
                          onChange={(e) => updateBenefit(index, "icon", e.target.value)}
                          className="w-32 px-2 py-1.5 bg-slc-dark border border-slc-border rounded text-sm"
                        >
                          {iconOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <Input
                          value={benefit.title}
                          onChange={(e) => updateBenefit(index, "title", e.target.value)}
                          placeholder="Título del beneficio"
                          className="flex-1"
                        />
                        <select
                          value={benefit.color}
                          onChange={(e) => updateBenefit(index, "color", e.target.value)}
                          className="w-28 px-2 py-1.5 bg-slc-dark border border-slc-border rounded text-sm"
                        >
                          {colorOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <Input
                          value={benefit.imageUrl || ""}
                          onChange={(e) => updateBenefit(index, "imageUrl", e.target.value)}
                          placeholder="URL imagen (opcional)"
                          className="w-40"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBenefit(index)}
                          className="text-red-500 hover:text-red-400 shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* A/B Testing */}
                <div className="bg-slc-card/50 p-4 rounded-lg border border-slc-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <TestTube className="w-5 h-5 text-yellow-500" />
                      <div>
                        <h3 className="font-medium">A/B Testing</h3>
                        <p className="text-xs text-slc-muted">Prueba diferentes versiones del popup</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={popupSettings.abTestEnabled}
                        onChange={(e) => updatePopupSetting("abTestEnabled", e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-sm">Activar</span>
                    </label>
                  </div>

                  {popupSettings.abTestEnabled && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-slc-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">A</div>
                            <span className="text-sm font-medium">Variante A</span>
                          </div>
                          <Input
                            value={popupSettings.variantAHeadline}
                            onChange={(e) => updatePopupSetting("variantAHeadline", e.target.value)}
                            placeholder={popupSettings.headline || "Titular variante A"}
                          />
                          <Input
                            value={popupSettings.variantAButtonText}
                            onChange={(e) => updatePopupSetting("variantAButtonText", e.target.value)}
                            placeholder={popupSettings.buttonText || "Texto botón A"}
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold">B</div>
                            <span className="text-sm font-medium">Variante B</span>
                          </div>
                          <Input
                            value={popupSettings.variantBHeadline}
                            onChange={(e) => updatePopupSetting("variantBHeadline", e.target.value)}
                            placeholder="Titular variante B"
                          />
                          <Input
                            value={popupSettings.variantBButtonText}
                            onChange={(e) => updatePopupSetting("variantBButtonText", e.target.value)}
                            placeholder="Texto botón B"
                          />
                        </div>
                      </div>

                      {/* Analytics */}
                      {popupAnalytics && (
                        <div className="mt-4 pt-4 border-t border-slc-border">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-slc-muted" />
                              <span className="text-sm font-medium">Resultados</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={resetAnalytics}>
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Reiniciar
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">A</div>
                                <span className="text-sm">Variante A</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                  <div className="text-lg font-bold">{popupAnalytics.variantA.shown}</div>
                                  <div className="text-xs text-slc-muted">Vistos</div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold">{popupAnalytics.variantA.converted}</div>
                                  <div className="text-xs text-slc-muted">Conversiones</div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold text-blue-500">{popupAnalytics.conversionRates.variantA}%</div>
                                  <div className="text-xs text-slc-muted">Tasa</div>
                                </div>
                              </div>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold">B</div>
                                <span className="text-sm">Variante B</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                  <div className="text-lg font-bold">{popupAnalytics.variantB.shown}</div>
                                  <div className="text-xs text-slc-muted">Vistos</div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold">{popupAnalytics.variantB.converted}</div>
                                  <div className="text-xs text-slc-muted">Conversiones</div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold text-green-500">{popupAnalytics.conversionRates.variantB}%</div>
                                  <div className="text-xs text-slc-muted">Tasa</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* By Source Analytics */}
                          <div className="mt-4 grid grid-cols-3 gap-3">
                            <div className="bg-slc-card p-3 rounded-lg border border-slc-border text-center">
                              <Timer className="w-4 h-4 mx-auto mb-1 text-primary" />
                              <div className="text-sm font-medium">{popupAnalytics.bySource.time.converted}/{popupAnalytics.bySource.time.shown}</div>
                              <div className="text-xs text-slc-muted">Por Tiempo</div>
                            </div>
                            <div className="bg-slc-card p-3 rounded-lg border border-slc-border text-center">
                              <Percent className="w-4 h-4 mx-auto mb-1 text-green-500" />
                              <div className="text-sm font-medium">{popupAnalytics.bySource.scroll.converted}/{popupAnalytics.bySource.scroll.shown}</div>
                              <div className="text-xs text-slc-muted">Por Scroll</div>
                            </div>
                            <div className="bg-slc-card p-3 rounded-lg border border-slc-border text-center">
                              <MousePointerClick className="w-4 h-4 mx-auto mb-1 text-cyan-500" />
                              <div className="text-sm font-medium">{popupAnalytics.bySource["exit-intent"].converted}/{popupAnalytics.bySource["exit-intent"].shown}</div>
                              <div className="text-xs text-slc-muted">Exit Intent</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dropbox Integration */}
          <div className="bg-slc-dark border border-slc-border rounded-xl p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="font-oswald text-xl uppercase">Dropbox</h2>
                <p className="text-xs text-slc-muted">Almacenamiento de archivos para beats, campañas y descargas</p>
              </div>
              {dropboxLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-slc-muted" />
              ) : dropboxStatus?.connected ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">Conectado</span>
                </div>
              ) : dropboxStatus?.configured ? (
                <div className="flex items-center gap-2 text-orange-500">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">Error de conexión</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slc-muted">
                  <Plug className="w-5 h-5" />
                  <span className="text-sm">No configurado</span>
                </div>
              )}
            </div>

            {/* Current Status */}
            {dropboxStatus?.connected && (
              <div className="bg-slc-card border border-slc-border rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Cloud className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">{dropboxStatus.accountName}</p>
                      <p className="text-xs text-slc-muted">{dropboxStatus.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDropboxToken}
                    disabled={dropboxTesting}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Desconectar
                  </Button>
                </div>
                {dropboxStatus.storage && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slc-muted">Almacenamiento usado</span>
                      <span>{formatBytes(dropboxStatus.storage.used)} / {formatBytes(dropboxStatus.storage.allocated)}</span>
                    </div>
                    <div className="w-full bg-slc-border rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (dropboxStatus.storage.used / dropboxStatus.storage.allocated) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
                {dropboxStatus.tokenPreview && (
                  <p className="text-xs text-slc-muted mt-3">
                    Token: {dropboxStatus.tokenPreview}
                  </p>
                )}
              </div>
            )}

            {/* Error Display */}
            {dropboxStatus?.error && !dropboxStatus.connected && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">{dropboxStatus.error}</span>
                </div>
              </div>
            )}

            {/* Token Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slc-muted mb-2">
                  Access Token de Dropbox
                  <a
                    href="https://www.dropbox.com/developers/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-primary hover:underline"
                  >
                    Obtener token
                  </a>
                </label>
                <div className="relative">
                  <Input
                    type={showDropboxToken ? "text" : "password"}
                    value={dropboxToken}
                    onChange={(e) => setDropboxToken(e.target.value)}
                    placeholder={dropboxStatus?.connected ? "Ingresa un nuevo token para reemplazar" : "sl.u.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDropboxToken(!showDropboxToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slc-muted hover:text-white"
                  >
                    {showDropboxToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slc-muted mt-2">
                  El token se almacena de forma segura en la base de datos y se usa para todos los servicios de sincronización de archivos.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={testDropboxToken}
                  disabled={!dropboxToken.trim() || dropboxTesting}
                >
                  {dropboxTesting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plug className="w-4 h-4 mr-2" />
                  )}
                  Probar Conexión
                </Button>
                <Button
                  onClick={saveDropboxToken}
                  disabled={!dropboxToken.trim() || dropboxTesting}
                >
                  {dropboxTesting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <HardDrive className="w-4 h-4 mr-2" />
                  )}
                  Guardar Token
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-slc-card/50 rounded-lg border border-slc-border">
              <h4 className="font-medium mb-2">Cómo obtener un Access Token:</h4>
              <ol className="text-sm text-slc-muted space-y-1 list-decimal list-inside">
                <li>Ve a <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Dropbox App Console</a></li>
                <li>Crea una nueva app o selecciona una existente</li>
                <li>En la pestaña "Settings", busca "Generated access token"</li>
                <li>Haz clic en "Generate" para crear un token de acceso</li>
                <li>Copia el token y pégalo aquí</li>
              </ol>
              <p className="text-xs text-slc-muted mt-3">
                <strong>Nota:</strong> Los tokens generados manualmente no expiran, pero puedes revocarlos en cualquier momento desde la consola de Dropbox.
              </p>
            </div>
          </div>

          {/* Admin Notification Emails */}
          <div className="bg-slc-dark border border-slc-border rounded-xl p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-oswald text-xl uppercase">Correos de Recordatorios</h2>
                <p className="text-xs text-slc-muted">Direcciones que reciben notificaciones del sistema</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slc-card p-4 rounded-lg border border-slc-border">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Principal</span>
                </div>
                <p className="text-sm">zakeuno@gmail.com</p>
              </div>
              <div className="bg-slc-card p-4 rounded-lg border border-slc-border">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-medium">Prensa</span>
                </div>
                <p className="text-sm">prensasonidoliquido@gmail.com</p>
              </div>
              <div className="bg-slc-card p-4 rounded-lg border border-slc-border">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Contacto</span>
                </div>
                <p className="text-sm">contacto@sonidoliquido.com</p>
              </div>
            </div>

            <p className="text-xs text-slc-muted mt-4">
              Estos correos recibirán recordatorios de lanzamientos, actualizaciones del sistema y notificaciones administrativas.
            </p>
          </div>

          {/* Store Settings */}
          <div className="bg-slc-dark border border-slc-border rounded-xl p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h2 className="font-oswald text-xl uppercase">Tienda</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slc-muted mb-2">Moneda</label>
                <select
                  value={settings.store_currency}
                  onChange={(e) => updateSetting("store_currency", e.target.value)}
                  className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                >
                  <option value="MXN">MXN - Peso Mexicano</option>
                  <option value="USD">USD - Dólar Americano</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-slc-muted mb-2">Stripe</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.stripe_enabled}
                      onChange={(e) => updateSetting("stripe_enabled", e.target.checked)}
                      className="w-5 h-5 rounded border-slc-border"
                    />
                    <span>Habilitar pagos con Stripe</span>
                  </label>
                </div>
                <p className="text-xs text-slc-muted mt-2">
                  Configura las API keys de Stripe en las variables de entorno (.env)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
