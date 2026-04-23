"use client";

import { useState, type FormEvent } from "react";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";

type SubscribeStatus = "idle" | "loading" | "success" | "error";

interface NewsletterFormProps {
  /** Visual variant for different contexts */
  variant?: "hero" | "footer";
}

export function NewsletterForm({ variant = "hero" }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubscribeStatus>("idle");
  const [message, setMessage] = useState("");

  const isHero = variant === "hero";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "¡Suscripción exitosa!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Error al suscribirse. Intenta de nuevo.");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Intenta de nuevo más tarde.");
    }
  }

  // Success state
  if (status === "success") {
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 ${
          isHero ? "mx-auto max-w-md" : ""
        }`}
      >
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
    );
  }

  // Error state — show error message with retry option
  if (status === "error") {
    return (
      <div className={isHero ? "mx-auto max-w-md" : ""}>
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 mb-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
          <p className="text-sm text-red-300">{message}</p>
        </div>
        <button
          onClick={() => {
            setStatus("idle");
            setMessage("");
          }}
          className={`text-sm font-medium text-primary hover:underline min-h-[44px] ${
            isHero ? "mx-auto block" : ""
          }`}
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-2 sm:flex-row ${isHero ? "mx-auto max-w-md" : ""}`}
    >
      <div className="relative flex-1">
        {isHero && (
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          disabled={status === "loading"}
          className={`w-full rounded-lg border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 min-h-[44px] ${
            isHero ? "pl-10 pr-4 py-2.5" : "px-3 py-2.5"
          }`}
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading" || !email.trim()}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className={isHero ? "" : "sr-only"}>Enviando...</span>
          </>
        ) : (
          <span>Suscribirse</span>
        )}
      </button>
    </form>
  );
}
