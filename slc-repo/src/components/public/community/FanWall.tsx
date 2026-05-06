"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Send,
  Heart,
  Loader2,
  CheckCircle,
  X,
  Sparkles,
  Globe,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FanMessage {
  id: string;
  displayName: string;
  avatarUrl?: string;
  country?: string;
  city?: string;
  message: string;
  reaction?: string;
  backgroundColor?: string;
  fontStyle?: string;
  isFeatured: boolean;
  createdAt: string;
}

interface FanWallProps {
  artistId?: string;
  releaseId?: string;
  eventId?: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

// Emoji reactions
const REACTIONS = ["🔥", "❤️", "🎵", "🙌", "💯", "🎤", "🔊", "✨"];

// Random pastel colors for messages
const PASTEL_COLORS = [
  "#2a2a2a",
  "#1a2a1a",
  "#2a1a1a",
  "#1a1a2a",
  "#2a2a1a",
  "#1a2a2a",
  "#2a1a2a",
];

export function FanWall({
  artistId,
  releaseId,
  eventId,
  title = "Fan Wall",
  subtitle = "Deja tu mensaje para la crew",
  className = "",
}: FanWallProps) {
  const [messages, setMessages] = useState<FanMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [selectedReaction, setSelectedReaction] = useState<string>("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    fetchMessages();
  }, [artistId, releaseId, eventId]);

  async function fetchMessages() {
    try {
      const params = new URLSearchParams();
      if (artistId) params.append("artistId", artistId);
      if (releaseId) params.append("releaseId", releaseId);
      if (eventId) params.append("eventId", eventId);

      const res = await fetch(`/api/community/fan-wall?${params}`);
      const data = await res.json();

      if (data.success) {
        setMessages(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !message.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/community/fan-wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim() || undefined,
          message: message.trim(),
          reaction: selectedReaction || undefined,
          country: country.trim() || undefined,
          artistId,
          releaseId,
          eventId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
        setDisplayName("");
        setEmail("");
        setMessage("");
        setSelectedReaction("");
        setCountry("");
        setTimeout(() => {
          setShowForm(false);
          setSubmitted(false);
        }, 3000);
      } else {
        setError(data.error || "Error al enviar mensaje");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`py-16 ${className}`}>
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-4">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Comunidad</span>
          </div>
          <h2 className="font-oswald text-4xl md:text-5xl uppercase text-white mb-2">
            {title}
          </h2>
          <p className="text-slc-muted max-w-md mx-auto">{subtitle}</p>
        </div>

        {/* Add Message Button */}
        {!showForm && (
          <div className="text-center mb-8">
            <Button
              onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary/80 text-white px-6"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Dejar un mensaje
            </Button>
          </div>
        )}

        {/* Message Form */}
        {showForm && (
          <div className="max-w-lg mx-auto mb-12 bg-slc-card border border-slc-border rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-oswald text-xl uppercase mb-2">¡Mensaje enviado!</h3>
                <p className="text-slc-muted text-sm">
                  Tu mensaje aparecerá después de ser aprobado.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-oswald text-lg uppercase">Tu mensaje</h3>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-slc-muted hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm text-slc-muted mb-1">
                    Tu nombre *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="¿Cómo te llamas?"
                      required
                      maxLength={50}
                      className="w-full pl-10 pr-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Email (optional) */}
                <div>
                  <label className="block text-sm text-slc-muted mb-1">
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Para notificarte cuando se apruebe"
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm text-slc-muted mb-1">
                    ¿De dónde eres?
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Ciudad, País"
                      maxLength={50}
                      className="w-full pl-10 pr-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm text-slc-muted mb-1">
                    Tu mensaje *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="¿Qué quieres decirle a la crew?"
                    required
                    maxLength={500}
                    rows={4}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                  />
                  <p className="text-xs text-slc-muted mt-1 text-right">
                    {message.length}/500
                  </p>
                </div>

                {/* Reaction */}
                <div>
                  <label className="block text-sm text-slc-muted mb-2">
                    Agrega una reacción
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {REACTIONS.map((reaction) => (
                      <button
                        key={reaction}
                        type="button"
                        onClick={() =>
                          setSelectedReaction(
                            selectedReaction === reaction ? "" : reaction
                          )
                        }
                        className={cn(
                          "w-10 h-10 text-xl rounded-lg border transition-all",
                          selectedReaction === reaction
                            ? "border-primary bg-primary/20 scale-110"
                            : "border-slc-border bg-slc-dark hover:border-slc-muted"
                        )}
                      >
                        {reaction}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={submitting || !displayName.trim() || !message.trim()}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar mensaje
                    </>
                  )}
                </Button>

                <p className="text-xs text-slc-muted text-center">
                  Tu mensaje será revisado antes de publicarse.
                </p>
              </form>
            )}
          </div>
        )}

        {/* Messages Wall */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 bg-slc-card/30 border border-slc-border/50 rounded-2xl">
            <MessageCircle className="w-12 h-12 text-slc-muted/50 mx-auto mb-4" />
            <h3 className="font-oswald text-lg uppercase text-slc-muted mb-2">
              Aún no hay mensajes
            </h3>
            <p className="text-sm text-slc-muted">
              ¡Sé el primero en dejar tu mensaje!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {messages.map((msg, index) => (
              <MessageCard key={msg.id} message={msg} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Individual message card
function MessageCard({ message, index }: { message: FanMessage; index: number }) {
  const bgColor =
    message.backgroundColor ||
    PASTEL_COLORS[index % PASTEL_COLORS.length];

  return (
    <div
      className={cn(
        "group relative p-5 rounded-xl border border-slc-border/50 transition-all duration-300 hover:border-primary/30 hover:-translate-y-1",
        message.isFeatured && "ring-2 ring-primary/30"
      )}
      style={{ backgroundColor: bgColor }}
    >
      {/* Featured badge */}
      {message.isFeatured && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-primary text-white text-xs rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Destacado
        </div>
      )}

      {/* Reaction */}
      {message.reaction && (
        <span className="absolute -top-3 left-4 text-2xl">{message.reaction}</span>
      )}

      {/* Message */}
      <p
        className={cn(
          "text-white text-sm leading-relaxed mb-4",
          message.fontStyle === "handwritten" && "font-serif italic",
          message.fontStyle === "bold" && "font-bold"
        )}
      >
        "{message.message}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        {message.avatarUrl ? (
          <img
            src={message.avatarUrl}
            alt={message.displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slc-border flex items-center justify-center">
            <User className="w-4 h-4 text-slc-muted" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-white truncate">
            {message.displayName}
          </p>
          {(message.city || message.country) && (
            <p className="text-xs text-slc-muted flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {[message.city, message.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Date */}
      <p className="text-[10px] text-slc-muted mt-3">
        {new Date(message.createdAt).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

export default FanWall;
