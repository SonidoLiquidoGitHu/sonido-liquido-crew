"use client";

import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NewsletterFormProps {
  source?: string;
  variant?: "default" | "inline" | "card";
  className?: string;
}

export function NewsletterForm({
  source = "newsletter-form",
  variant = "default",
  className,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, source }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage("Te has suscrito exitosamente.");
        setEmail("");
        setName("");
      } else {
        setStatus("error");
        setMessage(data.error || "Error al suscribirse.");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión.");
    }

    setTimeout(() => {
      setStatus("idle");
      setMessage("");
    }, 5000);
  };

  if (variant === "inline") {
    return (
      <form onSubmit={handleSubmit} className={cn("flex gap-2", className)}>
        <Input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading" || status === "success"}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={status === "loading" || status === "success" || !email}
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : status === "success" ? (
            <Check className="w-4 h-4" />
          ) : (
            <Mail className="w-4 h-4" />
          )}
        </Button>
      </form>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("bg-slc-card border border-slc-border rounded-xl p-6", className)}>
        <h3 className="font-oswald text-xl uppercase mb-2">Newsletter</h3>
        <p className="text-slc-muted text-sm mb-4">
          Recibe noticias y lanzamientos exclusivos.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading" || status === "success"}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={status === "loading" || status === "success" || !email}
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : status === "success" ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {status === "success" ? "Suscrito" : "Suscribirse"}
          </Button>
        </form>
        {message && (
          <p className={cn(
            "text-xs mt-2",
            status === "success" ? "text-green-500" : "text-red-500"
          )}>
            {message}
          </p>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          type="text"
          placeholder="Tu nombre (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={status === "loading" || status === "success"}
        />
        <Input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading" || status === "success"}
          required
        />
      </div>
      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={status === "loading" || status === "success" || !email}
      >
        {status === "loading" ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : status === "success" ? (
          <Check className="w-4 h-4 mr-2" />
        ) : (
          <Mail className="w-4 h-4 mr-2" />
        )}
        {status === "success" ? "Suscrito exitosamente" : "Suscribirse al Newsletter"}
      </Button>
      {message && (
        <p className={cn(
          "text-sm",
          status === "success" ? "text-green-500" : "text-red-500"
        )}>
          {message}
        </p>
      )}
    </form>
  );
}
