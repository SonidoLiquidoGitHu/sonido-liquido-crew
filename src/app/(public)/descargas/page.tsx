"use client";

import { useState } from "react";
import { Lock, Download, Mail, Loader2, CheckCircle, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewsletterForm } from "@/components/public/NewsletterForm";

interface DownloadItem {
  id: string;
  name: string;
  description: string;
  fileUrl: string;
  isActive: boolean;
}

export default function DescargasPage() {
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/newsletter/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setVerified(data.verified);
        if (data.verified) {
          setDownloads(data.downloads || []);
        }
      } else {
        setError(data.error || "Error al verificar");
      }
    } catch {
      setError("Error de conexión");
    }

    setVerifying(false);
  };

  const handleSubscribeSuccess = () => {
    // After successful subscription, auto-verify
    setVerified(true);
    // Re-verify to get downloads
    fetch("/api/newsletter/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.verified) {
          setDownloads(data.downloads || []);
        }
      })
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[var(--slc-background)] text-white">
      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            {verified ? (
              <Download className="w-10 h-10 text-purple-400" />
            ) : (
              <Lock className="w-10 h-10 text-purple-400" />
            )}
          </div>
          <h1 className="font-oswald text-4xl sm:text-5xl uppercase mb-4">
            Descargas Exclusivas
          </h1>
          <p className="text-white/60 text-lg max-w-lg mx-auto">
            {verified
              ? "Acceso concedido. Descarga contenido exclusivo para suscriptores."
              : "Contenido exclusivo para suscriptores del newsletter. Verifica tu email para acceder."}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        {!verified && (
          <div className="max-w-md mx-auto">
            {/* Verification Form */}
            <div className="bg-slc-card border border-slc-border rounded-2xl p-6 sm:p-8">
              <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-400" />
                Verificar Suscripción
              </h2>
              <p className="text-white/50 text-sm mb-6">
                Ingresa tu email para verificar si eres suscriptor y acceder a las descargas exclusivas.
              </p>

              <form onSubmit={handleVerify} className="space-y-4">
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={verifying}
                  required
                  className="bg-slc-dark border-slc-border"
                  aria-label="Email"
                />
                <Button
                  type="submit"
                  disabled={verifying || !email}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Verificar Acceso
                    </>
                  )}
                </Button>
              </form>

              {error && (
                <p className="text-red-400 text-sm mt-3 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> {error}
                </p>
              )}

              {verified === false && (
                <div className="mt-6 pt-6 border-t border-slc-border">
                  <p className="text-white/60 text-sm mb-4 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-400" />
                    No se encontró una suscripción activa con ese email.
                  </p>
                  <p className="text-white/40 text-sm mb-4">
                    Suscríbete al newsletter para obtener acceso inmediato:
                  </p>
                  <NewsletterForm source="download-gate" variant="inline" />
                </div>
              )}
            </div>
          </div>
        )}

        {verified && (
          <div>
            {/* Verified Header */}
            <div className="flex items-center gap-2 mb-8 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Suscripción verificada: {email}</span>
              <button
                onClick={() => { setVerified(null); setDownloads([]); setEmail(""); }}
                className="ml-auto text-xs text-white/40 hover:text-white/60 underline"
              >
                Cambiar email
              </button>
            </div>

            {/* Downloads Grid */}
            {downloads.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="font-oswald text-xl uppercase mb-2 text-white/60">
                  Sin descargas disponibles
                </h3>
                <p className="text-white/40">
                  Aún no hay archivos exclusivos disponibles. ¡Vuelve pronto!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {downloads.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slc-card border border-slc-border rounded-xl p-6 hover:border-purple-500/50 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-oswald text-lg uppercase line-clamp-1 group-hover:text-purple-300 transition-colors">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-white/50 text-sm mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white text-sm font-oswald uppercase transition-all"
                      >
                        <Download className="w-4 h-4" />
                        Descargar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
