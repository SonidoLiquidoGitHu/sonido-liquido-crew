"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  BellOff,
  Check,
  Loader2,
  Mail,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReleaseNotifyButtonProps {
  releaseId: string;
  releaseSlug?: string;
  releaseTitle: string;
  releaseDate: Date | string;
  variant?: "default" | "compact" | "inline";
  className?: string;
}

export function ReleaseNotifyButton({
  releaseId,
  releaseSlug,
  releaseTitle,
  releaseDate,
  variant = "default",
  className = "",
}: ReleaseNotifyButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already subscribed (from localStorage)
  useEffect(() => {
    const storedEmail = localStorage.getItem("sl_notify_email");
    if (storedEmail) {
      setEmail(storedEmail);
      checkSubscription(storedEmail);
    }
  }, [releaseId]);

  async function checkSubscription(emailToCheck: string) {
    setChecking(true);
    try {
      const res = await fetch(
        `/api/upcoming-releases/subscribe?email=${encodeURIComponent(emailToCheck)}&releaseId=${releaseId}`
      );
      const data = await res.json();
      setIsSubscribed(data.subscribed);
    } catch (err) {
      // Silent fail
    } finally {
      setChecking(false);
    }
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setError("Ingresa tu email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Email inválido");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/upcoming-releases/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          releaseId,
          releaseSlug,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIsSubscribed(true);
        setSuccess(true);
        setShowForm(false);
        localStorage.setItem("sl_notify_email", email.trim());

        // Reset success state after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "Error al suscribirse");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/upcoming-releases/subscribe?email=${encodeURIComponent(email)}&releaseId=${releaseId}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (data.success) {
        setIsSubscribed(false);
      }
    } catch (err) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  // Check if release is already out
  const isReleased = new Date(releaseDate) <= new Date();
  if (isReleased) {
    return null;
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <button
        onClick={() => (isSubscribed ? handleUnsubscribe() : setShowForm(true))}
        disabled={loading || checking}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
          isSubscribed
            ? "bg-green-500/10 text-green-500 border border-green-500/30"
            : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20",
          className
        )}
      >
        {loading || checking ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isSubscribed ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Notificación activada
          </>
        ) : (
          <>
            <Bell className="w-3.5 h-3.5" />
            Notificarme
          </>
        )}
      </button>
    );
  }

  // Inline variant (for use within other forms)
  if (variant === "inline") {
    if (isSubscribed) {
      return (
        <div className={cn("flex items-center gap-2 text-sm text-green-500", className)}>
          <Check className="w-4 h-4" />
          Te notificaremos cuando salga
        </div>
      );
    }

    return (
      <form onSubmit={handleSubscribe} className={cn("flex gap-2", className)}>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="flex-1"
          disabled={loading}
        />
        <Button type="submit" disabled={loading} size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
        </Button>
      </form>
    );
  }

  // Default variant
  return (
    <div className={cn("relative", className)}>
      {/* Main Button */}
      {!showForm && (
        <Button
          onClick={() => (isSubscribed ? handleUnsubscribe() : setShowForm(true))}
          disabled={loading || checking}
          variant={isSubscribed ? "outline" : "default"}
          className={cn(
            "gap-2",
            isSubscribed && "border-green-500/50 text-green-500 hover:bg-green-500/10"
          )}
        >
          {loading || checking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : success ? (
            <>
              <Sparkles className="w-4 h-4" />
              ¡Listo!
            </>
          ) : isSubscribed ? (
            <>
              <BellOff className="w-4 h-4" />
              Cancelar notificación
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              Notificarme al salir
            </>
          )}
        </Button>
      )}

      {/* Email Form */}
      {showForm && (
        <div className="bg-slc-card border border-slc-border rounded-xl p-4 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Recibe notificación
            </h4>
            <button
              onClick={() => setShowForm(false)}
              className="text-slc-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-slc-muted mb-3">
            Te avisaremos cuando <span className="text-white font-medium">{releaseTitle}</span> esté disponible.
          </p>

          <form onSubmit={handleSubscribe} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="tu@email.com"
                className="pl-10"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Notificarme
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-slc-muted text-center">
              Solo te enviaremos un email cuando salga el release.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

export default ReleaseNotifyButton;
