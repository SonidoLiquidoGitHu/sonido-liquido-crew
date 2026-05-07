"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Send,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Edit2,
  Copy,
  Eye,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Rocket,
  Music,
  Bell,
  Gift,
  Star,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  body: string;
  type: "announcement" | "reminder" | "countdown" | "release" | "thankyou";
  sendTiming: {
    type: "relative" | "absolute";
    daysBeforeRelease?: number;
    specificDate?: Date;
    time: string;
  };
}

interface EmailCampaignManagerProps {
  releaseTitle: string;
  artistName: string;
  releaseDate: Date;
  presaveUrl?: string;
  coverImageUrl?: string;
  subscriberCount?: number;
  onSendEmail?: (template: EmailTemplate) => void;
  className?: string;
}

// Pre-built email templates for pre-save campaigns
const EMAIL_TEMPLATES: Omit<EmailTemplate, "id">[] = [
  {
    name: "Anuncio de Pre-save",
    type: "announcement",
    subject: "🎵 {artistName} - Nuevo lanzamiento: {title}",
    preheader: "Sé el primero en escucharlo. Pre-guarda ahora.",
    body: `¡Hola!

Tenemos noticias emocionantes: **{title}** de **{artistName}** está a punto de llegar.

📅 **Fecha de lanzamiento:** {releaseDate}

### Pre-guarda ahora y sé el primero en escucharlo

Cuando haces pre-save, la música se guarda automáticamente en tu biblioteca el día del lanzamiento. ¡No te lo pierdas!

[PRE-SAVE AHORA →]({presaveUrl})

---
Sonido Líquido Crew
Hip Hop México desde 1999`,
    sendTiming: {
      type: "relative",
      daysBeforeRelease: 14,
      time: "10:00",
    },
  },
  {
    name: "Recordatorio (1 semana)",
    type: "reminder",
    subject: "⏰ Una semana para {title} - ¿Ya hiciste pre-save?",
    preheader: "No te quedes fuera. Solo quedan 7 días.",
    body: `¡Hey!

Solo queda **1 semana** para que salga **{title}** de **{artistName}**.

Si aún no has hecho pre-save, este es el momento perfecto. Al pre-guardar, la música aparecerá automáticamente en tu biblioteca el día del lanzamiento.

🎧 [HAZ PRE-SAVE AQUÍ]({presaveUrl})

**¿Por qué hacer pre-save?**
- La música llega directo a tu biblioteca
- Apoyas al artista antes del lanzamiento
- Serás de los primeros en escucharlo

---
Sonido Líquido Crew`,
    sendTiming: {
      type: "relative",
      daysBeforeRelease: 7,
      time: "18:00",
    },
  },
  {
    name: "Countdown (3 días)",
    type: "countdown",
    subject: "🔥 3 días para {title} - El countdown comenzó",
    preheader: "Última oportunidad de pre-save.",
    body: `¡La cuenta regresiva comenzó!

**3 DÍAS** para el lanzamiento de **{title}**.

Esta es tu última oportunidad de hacer pre-save y asegurar que la música esté en tu biblioteca el día del estreno.

⏳ [ÚLTIMOS DÍAS PARA PRE-SAVE]({presaveUrl})

---

**Tip:** Comparte este link con alguien que también necesite escuchar esto 🎧

Sonido Líquido Crew`,
    sendTiming: {
      type: "relative",
      daysBeforeRelease: 3,
      time: "19:00",
    },
  },
  {
    name: "Último día",
    type: "countdown",
    subject: "🚨 MAÑANA sale {title} - Última llamada",
    preheader: "Pre-save disponible solo hasta hoy.",
    body: `⚠️ **ÚLTIMA LLAMADA**

Mañana a medianoche sale **{title}** de **{artistName}**.

Si aún no has hecho pre-save, hoy es tu último día. Después del lanzamiento, el link de pre-save dejará de funcionar.

🎯 [PRE-SAVE AHORA (ÚLTIMO DÍA)]({presaveUrl})

¡Nos vemos mañana con música nueva!

Sonido Líquido Crew`,
    sendTiming: {
      type: "relative",
      daysBeforeRelease: 1,
      time: "10:00",
    },
  },
  {
    name: "Día de lanzamiento",
    type: "release",
    subject: "🎉 ¡YA ESTÁ AQUÍ! {title} disponible ahora",
    preheader: "El momento llegó. Escúchalo ahora.",
    body: `# 🎉 ¡EL DÍA LLEGÓ!

**{title}** de **{artistName}** ya está disponible en todas las plataformas.

Si hiciste pre-save, ya debería estar en tu biblioteca. Si no, no te preocupes, aquí tienes el link directo:

🎧 [ESCUCHAR AHORA]({presaveUrl})

---

**¿Te gustó?**
- Agrégalo a tus playlists
- Compártelo con tus amigos
- Déjanos saber qué te pareció

¡Gracias por el apoyo! 🙌

Sonido Líquido Crew`,
    sendTiming: {
      type: "relative",
      daysBeforeRelease: 0,
      time: "00:01",
    },
  },
  {
    name: "Gracias por el pre-save",
    type: "thankyou",
    subject: "🙏 Gracias por tu pre-save - {title}",
    preheader: "Tu apoyo significa mucho para nosotros.",
    body: `¡Gracias! 🧡

Tu pre-save de **{title}** significa mucho para **{artistName}** y todo el equipo de Sonido Líquido.

**¿Qué sigue?**
- 📅 La música llegará a tu biblioteca el **{releaseDate}**
- 🔔 Te enviaremos un recordatorio el día del lanzamiento
- 🎁 Podrías recibir contenido exclusivo antes del estreno

Mientras tanto, ¿por qué no compartes el pre-save con alguien más?

[COMPARTIR PRE-SAVE]({presaveUrl})

¡Nos vemos pronto!

Sonido Líquido Crew`,
    sendTiming: {
      type: "relative",
      daysBeforeRelease: 14,
      time: "immediate",
    },
  },
];

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export function EmailCampaignManager({
  releaseTitle,
  artistName,
  releaseDate,
  presaveUrl,
  coverImageUrl,
  subscriberCount = 0,
  onSendEmail,
  className = "",
}: EmailCampaignManagerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>(() =>
    EMAIL_TEMPLATES.map((t) => ({ ...t, id: generateId() }))
  );
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  // Replace placeholders in template
  const processTemplate = (text: string) => {
    return text
      .replace(/{title}/g, releaseTitle)
      .replace(/{artistName}/g, artistName)
      .replace(/{releaseDate}/g, releaseDate.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }))
      .replace(/{presaveUrl}/g, presaveUrl || "#");
  };

  // Get send date for template
  const getSendDate = (template: EmailTemplate) => {
    if (template.sendTiming.type === "absolute" && template.sendTiming.specificDate) {
      return template.sendTiming.specificDate;
    }
    if (template.sendTiming.daysBeforeRelease !== undefined) {
      const date = new Date(releaseDate);
      date.setDate(date.getDate() - template.sendTiming.daysBeforeRelease);
      return date;
    }
    return null;
  };

  // Copy template to clipboard
  const copyTemplate = async (template: EmailTemplate) => {
    const text = `Subject: ${processTemplate(template.subject)}\n\n${processTemplate(template.body)}`;
    await navigator.clipboard.writeText(text);
  };

  // Get type badge color
  const getTypeBadge = (type: EmailTemplate["type"]) => {
    switch (type) {
      case "announcement":
        return { color: "bg-blue-500/10 text-blue-500", label: "Anuncio" };
      case "reminder":
        return { color: "bg-yellow-500/10 text-yellow-500", label: "Recordatorio" };
      case "countdown":
        return { color: "bg-orange-500/10 text-orange-500", label: "Countdown" };
      case "release":
        return { color: "bg-green-500/10 text-green-500", label: "Lanzamiento" };
      case "thankyou":
        return { color: "bg-purple-500/10 text-purple-500", label: "Agradecimiento" };
      default:
        return { color: "bg-slc-muted/10 text-slc-muted", label: type };
    }
  };

  // Sort templates by send date
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      const dateA = getSendDate(a);
      const dateB = getSendDate(b);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
  }, [templates, releaseDate]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-oswald text-xl uppercase flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Campaña de Email
          </h3>
          <p className="text-sm text-slc-muted mt-1">
            Emails automáticos para tu campaña de pre-save
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-slc-card rounded-lg">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium">{subscriberCount.toLocaleString()}</span>
            <span className="text-xs text-slc-muted">suscriptores</span>
          </div>
        </div>
      </div>

      {/* Campaign timeline */}
      <div className="p-4 bg-slc-dark rounded-xl border border-slc-border">
        <h4 className="font-oswald text-sm uppercase mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Línea de Tiempo
        </h4>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slc-border" />

          <div className="space-y-4">
            {sortedTemplates.map((template, index) => {
              const sendDate = getSendDate(template);
              const isPast = sendDate && sendDate < new Date();
              const isToday = sendDate && sendDate.toDateString() === new Date().toDateString();
              const typeBadge = getTypeBadge(template.type);

              return (
                <div
                  key={template.id}
                  className={`relative pl-10 ${isPast ? "opacity-50" : ""}`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 ${
                      isToday
                        ? "bg-primary border-primary"
                        : isPast
                        ? "bg-slc-muted border-slc-muted"
                        : "bg-slc-dark border-slc-border"
                    }`}
                  />

                  <div
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      expandedTemplate === template.id
                        ? "bg-slc-card border-primary"
                        : "bg-slc-card/50 border-slc-border hover:border-primary/50"
                    }`}
                    onClick={() =>
                      setExpandedTemplate(
                        expandedTemplate === template.id ? null : template.id
                      )
                    }
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{template.name}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${typeBadge.color}`}>
                            {typeBadge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slc-muted">
                          {sendDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {sendDate.toLocaleDateString("es-MX", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.sendTiming.time === "immediate"
                              ? "Inmediato"
                              : template.sendTiming.time}
                          </span>
                          {template.sendTiming.daysBeforeRelease !== undefined && (
                            <span>
                              {template.sendTiming.daysBeforeRelease === 0
                                ? "Día del lanzamiento"
                                : `${template.sendTiming.daysBeforeRelease} días antes`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {expandedTemplate === template.id ? (
                          <ChevronUp className="w-4 h-4 text-slc-muted" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slc-muted" />
                        )}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {expandedTemplate === template.id && (
                      <div className="mt-4 pt-4 border-t border-slc-border space-y-4">
                        <div>
                          <label className="block text-xs text-slc-muted mb-1">Asunto</label>
                          <p className="text-sm font-medium bg-slc-dark p-2 rounded">
                            {processTemplate(template.subject)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs text-slc-muted mb-1">Preview</label>
                          <p className="text-sm text-slc-muted bg-slc-dark p-2 rounded">
                            {processTemplate(template.preheader)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs text-slc-muted mb-1">Contenido</label>
                          <div className="text-sm bg-slc-dark p-3 rounded max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {processTemplate(template.body)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendEmail?.(template);
                            }}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Enviar ahora
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyTemplate(template);
                            }}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copiar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTemplate(template);
                              setIsEditing(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Release day marker */}
            <div className="relative pl-10">
              <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-green-500 border-2 border-green-400 flex items-center justify-center">
                <Rocket className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-green-500" />
                  <span className="font-oswald uppercase text-green-500">
                    Lanzamiento: {releaseTitle}
                  </span>
                </div>
                <p className="text-sm text-slc-muted mt-1">
                  {releaseDate.toLocaleDateString("es-MX", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slc-muted">Emails programados</span>
          </div>
          <p className="text-2xl font-oswald">{templates.length}</p>
        </div>

        <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-green-500" />
            <span className="text-xs text-slc-muted">Alcance estimado</span>
          </div>
          <p className="text-2xl font-oswald">{(subscriberCount * templates.length).toLocaleString()}</p>
        </div>

        <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-slc-muted">Próximo envío</span>
          </div>
          <p className="text-lg font-oswald">
            {(() => {
              const nextTemplate = sortedTemplates.find((t) => {
                const date = getSendDate(t);
                return date && date >= new Date();
              });
              if (!nextTemplate) return "—";
              const date = getSendDate(nextTemplate);
              return date?.toLocaleDateString("es-MX", { day: "numeric", month: "short" }) || "—";
            })()}
          </p>
        </div>

        <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-slc-muted">Días restantes</span>
          </div>
          <p className="text-2xl font-oswald">
            {Math.max(0, Math.ceil((releaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="p-4 bg-slc-card/50 rounded-xl border border-slc-border">
        <h4 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Tips para tu campaña de email
        </h4>
        <ul className="text-sm text-slc-muted space-y-2">
          <li>• <strong>Timing:</strong> Los mejores horarios son 10am y 6-8pm (hora local de tus suscriptores)</li>
          <li>• <strong>Frecuencia:</strong> No envíes más de 1 email cada 3 días para evitar fatiga</li>
          <li>• <strong>Subject lines:</strong> Usa emojis con moderación y mantén el asunto corto (40-50 caracteres)</li>
          <li>• <strong>CTA claro:</strong> El botón de pre-save debe ser prominente y fácil de encontrar</li>
          <li>• <strong>Personalización:</strong> Incluye el nombre del suscriptor cuando sea posible</li>
        </ul>
      </div>

      {/* Edit modal placeholder - would need proper modal component */}
      {isEditing && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slc-dark border border-slc-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
            <h3 className="font-oswald text-xl uppercase mb-4">Editar Email</h3>
            <p className="text-sm text-slc-muted mb-4">
              Funcionalidad de edición completa próximamente...
            </p>
            <Button onClick={() => setIsEditing(false)}>Cerrar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailCampaignManager;
