"use client";

import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email, source: "homepage" }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage("Te has suscrito exitosamente.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Error al suscribirse. Intenta de nuevo.");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Intenta de nuevo.");
    }

    // Reset after 5 seconds
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
    }, 5000);
  };

  return (
    <section className="py-20 newsletter-gradient">
      <div className="section-container">
        <div className="max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Mail className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h2 className="font-oswald text-3xl sm:text-4xl md:text-5xl uppercase text-white">
            Anótate
          </h2>
          <p className="text-white/80 mt-4 text-lg">
            Obtén remixes exclusivos, beats e información actualizada
            directamente en tu correo.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading" || status === "success"}
                className="flex-1 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
              />
              <Button
                type="submit"
                disabled={status === "loading" || status === "success" || !email}
                className="h-12 px-6 bg-slc-black hover:bg-slc-dark text-white"
              >
                {status === "loading" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : status === "success" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  "Suscribirse"
                )}
              </Button>
            </div>

            {/* Message */}
            {message && (
              <p
                className={`mt-3 text-sm ${
                  status === "success" ? "text-white" : "text-red-200"
                }`}
              >
                {message}
              </p>
            )}
          </form>

          {/* Privacy Note */}
          <p className="text-white/60 text-xs mt-6">
            Al suscribirte, aceptas recibir correos de Sonido Líquido Crew.
            Puedes darte de baja en cualquier momento.
          </p>
        </div>
      </div>
    </section>
  );
}
