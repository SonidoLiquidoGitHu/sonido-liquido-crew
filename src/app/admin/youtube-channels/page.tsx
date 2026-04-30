"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Youtube,
  ExternalLink,
  GripVertical,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";

interface YoutubeChannel {
  id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  thumbnailUrl: string | null;
  description: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  isActive: boolean;
  displayOrder: number;
  artistId: string | null;
}

export default function YoutubeChannelsPage() {
  const [channels, setChannels] = useState<YoutubeChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newChannelUrl, setNewChannelUrl] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch channels
  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch("/api/admin/youtube-channels");
      const data = await response.json();
      if (data.success) {
        setChannels(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChannel = async () => {
    if (!newChannelUrl.trim()) {
      setError("Por favor ingresa una URL de canal de YouTube");
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/youtube-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelUrl: newChannelUrl.trim(),
          channelName: newChannelName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChannels([data.data, ...channels]);
        setNewChannelUrl("");
        setNewChannelName("");
        setSuccess("Canal agregado exitosamente");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || "Error al agregar canal");
      }
    } catch (error) {
      setError("Error de conexión");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleActive = async (channel: YoutubeChannel) => {
    try {
      const response = await fetch("/api/admin/youtube-channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: channel.id,
          isActive: !channel.isActive,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChannels(channels.map(c =>
          c.id === channel.id ? { ...c, isActive: !c.isActive } : c
        ));
      }
    } catch (error) {
      console.error("Failed to toggle channel:", error);
    }
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm("¿Estás seguro de eliminar este canal?")) return;

    try {
      const response = await fetch(`/api/admin/youtube-channels?id=${channelId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setChannels(channels.filter(c => c.id !== channelId));
        setSuccess("Canal eliminado");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error("Failed to delete channel:", error);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
            <Youtube className="w-8 h-8 text-red-500" />
            Canales de YouTube
          </h1>
          <p className="text-slc-muted mt-1">
            Configura los canales para el carrusel de videos aleatorios
          </p>
        </div>
      </div>

      {/* Add Channel Form */}
      <div className="bg-slc-dark border border-slc-border rounded-xl p-6 mb-8">
        <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Agregar Canal
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-500 text-sm">
            <Check className="w-4 h-4" />
            {success}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              value={newChannelUrl}
              onChange={(e) => setNewChannelUrl(e.target.value)}
              placeholder="URL del canal (ej: https://youtube.com/@ZaqueMX)"
              className="mb-2"
            />
            <Input
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Nombre del canal (opcional)"
            />
          </div>
          <Button
            onClick={handleAddChannel}
            disabled={isAdding || !newChannelUrl.trim()}
            className="bg-red-500 hover:bg-red-600 shrink-0"
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Agregar
          </Button>
        </div>

        <p className="text-xs text-slc-muted mt-3">
          Formatos aceptados: youtube.com/@nombre, youtube.com/channel/UC..., youtube.com/c/nombre
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/30 rounded-xl p-6 mb-8">
        <h3 className="font-oswald text-lg uppercase mb-2">¿Cómo funciona?</h3>
        <ul className="text-sm text-slc-muted space-y-2">
          <li>• Los videos de estos canales aparecerán en el carrusel de la página principal</li>
          <li>• Los videos se muestran aleatoriamente y cambian cada vez que recargas la página</li>
          <li>• Puedes activar/desactivar canales sin eliminarlos</li>
          <li>• Primero debes agregar videos desde la sección "Videos" para que aparezcan</li>
        </ul>
      </div>

      {/* Channels List */}
      <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slc-border">
          <h2 className="font-oswald text-xl uppercase">
            Canales Configurados ({channels.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slc-muted" />
            <p className="text-slc-muted mt-2">Cargando canales...</p>
          </div>
        ) : channels.length === 0 ? (
          <div className="p-8 text-center">
            <Youtube className="w-12 h-12 mx-auto text-slc-muted mb-3" />
            <p className="text-slc-muted">No hay canales configurados</p>
            <p className="text-sm text-slc-muted/70 mt-1">
              Agrega un canal de YouTube arriba para comenzar
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slc-border">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className={`p-4 flex items-center gap-4 ${
                  !channel.isActive ? "opacity-50" : ""
                }`}
              >
                {/* Drag Handle */}
                <div className="text-slc-muted cursor-grab">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Channel Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-500 shrink-0" />
                    <h3 className="font-medium truncate">{channel.channelName}</h3>
                    {!channel.isActive && (
                      <span className="text-xs bg-slc-muted/20 text-slc-muted px-2 py-0.5 rounded">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slc-muted truncate">{channel.channelUrl}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(channel)}
                    title={channel.isActive ? "Desactivar" : "Activar"}
                  >
                    {channel.isActive ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slc-muted" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                  >
                    <a
                      href={channel.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(channel.id)}
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
