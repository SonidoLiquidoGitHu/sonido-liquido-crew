"use client";

import { useState, useRef } from "react";
import { Mail, Check, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NewsletterFormProps {
  source?: string;
  variant?: "default" | "inline" | "card";
  className?: string;
  onSuccess?: (email: string) => void;
}

export function NewsletterForm({
  source = "newsletter-form",
  variant = "default",
  className,
  onSuccess,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadFile, setDownloadFile] = useState<{ url: string; name: string; buttonText: string; description: string } | null>(null);
  // Honeypot ref — hidden field that bots fill but real users don't
  const honeypotRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          source,
          // Honeypot — this field is hidden from real users
          website: honeypotRef.current?.value || "",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage("Te has suscrito exitosamente.");
        // Notify parent of successful subscription with the email
        if (onSuccess) {
          onSuccess(email);
        }
        setEmail("");
        setName("");
        // Check for download file in response
        if (data.data?.downloadFile) {
          setDownloadFile(data.data.downloadFile);
        }
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
      setDownloadFile(null);
    }, 8000);
  };

  // Honeypot field — invisible to real users, bots auto-fill it
  const honeypotField = (
    <input
      ref={honeypotRef}
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        border: "0",
      }}
    />
  );

  // Download button for successful subscription with file
  const downloadButton = downloadFile && status === "success" && (
    <a
      href={downloadFile.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white text-sm font-oswald uppercase transition-all"
    >
      <Download className="w-4 h-4" />
      {downloadFile.buttonText || "Descargar"}
    </a>
  );

  // Link to exclusive downloads page
  const downloadsLink = status === "success" && !downloadFile && (
    <a
      href="/descargas"
      className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 mt-2"
    >
      <Download className="w-4 h-4" />
      Ver descargas exclusivas
    </a>
  );

  if (variant === "inline") {
    return (
      <div className={cn("relative", className)}>
        <form onSubmit={handleSubmit} className="relative flex gap-2">
          {honeypotField}
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading" || status === "success"}
            className="flex-1"
            aria-label="Email"
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
        {downloadButton}
        {downloadsLink}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("bg-slc-card border border-slc-border rounded-xl p-6", className)}>
        <h3 className="font-oswald text-xl uppercase mb-2">Newsletter</h3>
        <p className="text-slc-muted text-sm mb-4">
          Recibe noticias y lanzamientos exclusivos.
        </p>
        <form onSubmit={handleSubmit} className="relative space-y-3">
          {honeypotField}
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading" || status === "success"}
            aria-label="Email"
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
        {downloadButton}
        {downloadsLink}
      </div>
    );
  }

  // Default variant
  return (
    <form onSubmit={handleSubmit} className={cn("relative space-y-4", className)}>
      {honeypotField}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          type="text"
          placeholder="Tu nombre (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={status === "loading" || status === "success"}
          aria-label="Nombre"
        />
        <Input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading" || status === "success"}
          required
          aria-label="Email"
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
      {downloadButton}
      {downloadsLink}
    </form>
  );
}
