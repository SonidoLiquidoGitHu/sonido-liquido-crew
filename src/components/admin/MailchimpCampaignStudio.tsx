"use client";

import {
  AudienceSelector,
  type AudienceTag,
} from "@/components/admin/AudienceSelector";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileEdit,
  Image as ImageIcon,
  Link2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/**
 * Proxy a Dropbox URL through our image-proxy endpoint so mobile browsers
 * can render it (Dropbox returns wrong content-type for image files).
 */
function proxyImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/api/image-proxy")) return url;
  if (url.includes("dropbox.com") || url.includes("dropboxusercontent.com")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// ===========================================
// TYPES
// ===========================================

interface AudienceData {
  id: string;
  name: string;
  stats: {
    member_count: number;
    unsubscribe_count: number;
    cleaned_count: number;
    open_rate: number;
    click_rate: number;
  };
}

interface CampaignData {
  id: string;
  web_id: number;
  type: string;
  status: string;
  emails_sent: number;
  send_time: string;
  settings: {
    subject_line: string;
    preview_text: string;
    title: string;
  };
  report_summary?: {
    opens: number;
    unique_opens: number;
    open_rate: number;
    clicks: number;
    subscriber_clicks: number;
    click_rate: number;
  };
}

// TagData is now AudienceTag from the shared component
type TagData = AudienceTag;

interface GrowthItem {
  month: string;
  existing: number;
  imports: number;
  optins: number;
}

type TabType = "dashboard" | "create" | "campaigns" | "audience" | "settings";

// ===========================================
// EMAIL TEMPLATES
// ===========================================

const EMAIL_TEMPLATES = [
  {
    id: "blank",
    name: "Desde Cero",
    description: "Empieza con un email vacío y personalízalo",
    icon: FileEdit,
    subject: "",
    body: "",
    ctaText: "",
    ctaUrl: "",
  },
  {
    id: "announcement",
    name: "Anuncio de Lanzamiento",
    description: "Anuncia un nuevo lanzamiento musical",
    icon: Sparkles,
    subject: "Nuevo lanzamiento de Sonido Liquido",
    body: "Tenemos algo especial para ti.\n\n**Nuevo lanzamiento disponible ahora** en todas las plataformas.\n\nNo te lo pierdas - escucha antes que nadie y agrega a tus playlists.",
    ctaText: "Escuchar Ahora",
    ctaUrl: "https://sonidoliquido.com/lanzamientos",
  },
  {
    id: "event",
    name: "Evento Próximo",
    description: "Promociona un evento o concierto",
    icon: Calendar,
    subject: "No te pierdas este evento",
    body: "Se acerca un evento que no te quieres perder.\n\n**Fecha:** [agregar fecha]\n**Lugar:** [agregar lugar]\n\nConsigue tus boletos antes de que se agoten.",
    ctaText: "Comprar Boletos",
    ctaUrl: "https://sonidoliquido.com/eventos",
  },
  {
    id: "newsletter",
    name: "Newsletter Semanal",
    description: "Resumen semanal de novedades",
    icon: Mail,
    subject: "Lo que pasó esta semana en Sonido Liquido",
    body: "Hola, aqui te traemos lo mejor de la semana:\n\n### Nuevos Lanzamientos\n[Resumen de lanzamientos]\n\n### Próximos Eventos\n[Resumen de eventos]\n\n### En la Comunidad\n[Noticias de la comunidad]\n\nMantente conectado con la escena del hip hop mexicano.",
    ctaText: "Ver Todo",
    ctaUrl: "https://sonidoliquido.com",
  },
  {
    id: "presave",
    name: "Campaña de Pre-Save",
    description: "Campaña de pre-save para un lanzamiento",
    icon: Zap,
    subject: "Pre-save disponible ahora",
    body: "El nuevo lanzamiento está por llegar y puedes ser de los primeros en escucharlo.\n\nHaz **pre-save** ahora y la música aparecerá automáticamente en tu biblioteca el día del lanzamiento.\n\n### Beneficios del Pre-Save\n- Escucha antes que nadie\n- Apoya al artista\n- La música llega directo a tu biblioteca",
    ctaText: "Pre-Save Ahora",
    ctaUrl: "https://sonidoliquido.com",
  },
  {
    id: "community",
    name: "Invitación a Comunidad",
    description: "Invita a suscriptores a unirse a la comunidad",
    icon: Users,
    subject: "Unete a la comunidad Sonido Liquido",
    body: "La comunidad de Sonido Liquido Crew está creciendo y te queremos dentro.\n\n### Que encontraras:\n- Contenido exclusivo\n- Acceso anticipado a lanzamientos\n- Eventos solo para miembros\n- Directo con los artistas\n\nSe parte del movimiento del hip hop mexicano.",
    ctaText: "Unirme Ahora",
    ctaUrl: "https://sonidoliquido.com/comunidad",
  },
];

// ===========================================
// PREVIEW HTML GENERATOR (client-side)
// ===========================================

function generatePreviewHTML(data: {
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  coverImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  darkMode?: boolean;
  titleFont?: string;
  bodyFont?: string;
  buttonStyle?: string;
  buttonRounded?: string;
}): string {
  const { title, body, ctaText, ctaUrl, coverImageUrl } = data;
  const primaryColor = data.primaryColor || "#f97316";
  const secondaryColor = data.secondaryColor || "#ea580c";
  const darkMode = data.darkMode !== false;
  const titleFont = data.titleFont || "oswald";
  const bodyFont = data.bodyFont || "inter";

  const fontMap: Record<string, string> = {
    oswald: "'Oswald', sans-serif",
    bebas: "'Bebas Neue', sans-serif",
    anton: "'Anton', sans-serif",
    "archivo-black": "'Archivo Black', sans-serif",
    righteous: "'Righteous', sans-serif",
    bangers: "'Bangers', sans-serif",
    "permanent-marker": "'Permanent Marker', sans-serif",
    montserrat: "'Montserrat', sans-serif",
    poppins: "'Poppins', sans-serif",
    inter: "'Inter', sans-serif",
    raleway: "'Raleway', sans-serif",
    "dm-sans": "'DM Sans', sans-serif",
    outfit: "'Outfit', sans-serif",
    sora: "'Sora', sans-serif",
    "space-grotesk": "'Space Grotesk', sans-serif",
    playfair: "'Playfair Display', serif",
    merriweather: "'Merriweather', serif",
    "roboto-mono": "'Roboto Mono', monospace",
  };

  const titleFontFamily = fontMap[titleFont] || "'Oswald', sans-serif";
  const bodyFontFamily = fontMap[bodyFont] || "'Inter', sans-serif";

  const bgColor = darkMode ? "#0a0a0a" : "#f5f5f5";
  const cardBgColor = darkMode ? "#1a1a1a" : "#ffffff";
  const bodyTextColor = darkMode ? "#cccccc" : "#555555";
  const footerBgColor = darkMode ? "#0a0a0a" : "#eeeeee";
  const footerTextColor = darkMode ? "#666666" : "#999999";

  const buttonRoundedMap: Record<string, string> = {
    none: "0px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    full: "50px",
  };
  const buttonRadius = buttonRoundedMap[data.buttonRounded || "full"] || "50px";

  let buttonCss = "";
  switch (data.buttonStyle || "gradient") {
    case "solid":
      buttonCss = `background: ${primaryColor}; color: #ffffff; border: none;`;
      break;
    case "gradient":
      buttonCss = `background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: #ffffff; border: none;`;
      break;
    case "outline":
      buttonCss = `background: transparent; border: 2px solid ${primaryColor}; color: ${primaryColor};`;
      break;
    case "glass":
      buttonCss =
        "background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #ffffff;";
      break;
    default:
      buttonCss = `background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: #ffffff; border: none;`;
  }

  const formattedBody = body
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(
      /\[(.*?)\]\((.*?)\)/g,
      `<a href="$2" style="color: ${primaryColor}; text-decoration: underline;">$1</a>`,
    )
    .replace(
      /^### (.*?)$/gm,
      `<h3 style="color: ${primaryColor}; margin: 20px 0 10px;">$1</h3>`,
    )
    .replace(
      /^# (.*?)$/gm,
      `<h1 style="color: ${primaryColor}; margin: 20px 0 10px;">$1</h1>`,
    );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: ${bodyFontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${cardBgColor}; border-radius: 16px; overflow: hidden; max-width: 100%;">
          <tr>
            <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);">
              <h1 style="margin: 0; color: white; font-size: 24px; font-family: ${titleFontFamily}, sans-serif;">SONIDO LIQUIDO CREW</h1>
            </td>
          </tr>
          ${
            coverImageUrl
              ? `
          <tr>
            <td style="padding: 30px 40px 0;">
              <img src="${coverImageUrl}" alt="${title}" style="width: 100%; max-width: 500px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            </td>
          </tr>
          `
              : ""
          }
          <tr>
            <td style="padding: 30px 40px 10px; text-align: center;">
              <h1 style="margin: 0; color: ${primaryColor}; font-size: 28px; font-weight: bold; font-family: ${titleFontFamily}, sans-serif;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 40px 30px; color: #ffffff;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${bodyTextColor}; font-family: ${bodyFontFamily}, sans-serif;">
                ${formattedBody}
              </p>
            </td>
          </tr>
          ${
            ctaText && ctaUrl
              ? `
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <a href="${ctaUrl}" style="display: inline-block; padding: 16px 40px; ${buttonCss} text-decoration: none; font-weight: bold; font-size: 18px; border-radius: ${buttonRadius}; text-transform: uppercase; letter-spacing: 1px; font-family: ${titleFontFamily}, sans-serif;">
                ${ctaText}
              </a>
            </td>
          </tr>
          `
              : ""
          }
          <tr>
            <td style="padding: 30px 40px; background-color: ${footerBgColor}; text-align: center;">
              <p style="margin: 0 0 15px; color: ${footerTextColor}; font-size: 12px;">
                Sonido Liquido Crew - Hip Hop Mexico desde 1999
              </p>
              <p style="margin: 0; color: ${darkMode ? "#444444" : "#aaaaaa"}; font-size: 11px;">
                <a href="https://sonidoliquido.com" style="color: ${primaryColor}; text-decoration: none;">sonidoliquido.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// ===========================================
// COMPONENT
// ===========================================

export function MailchimpCampaignStudio() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audience, setAudience] = useState<AudienceData | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [campaignsTotal, setCampaignsTotal] = useState<number>(0);
  const [tags, setTags] = useState<TagData[]>([]);
  const [growthHistory, setGrowthHistory] = useState<GrowthItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create campaign form
  const [selectedTemplate, setSelectedTemplate] = useState(EMAIL_TEMPLATES[0]);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(
    null,
  );
  const [formSubject, setFormSubject] = useState("");
  const [formPreviewText, setFormPreviewText] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formCtaText, setFormCtaText] = useState("");
  const [formCtaUrl, setFormCtaUrl] = useState("");
  const [formCoverImageUrl, setFormCoverImageUrl] = useState("");
  const [formScheduleTime, setFormScheduleTime] = useState("");
  const [formSelectedTags, setFormSelectedTags] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Email style customization
  const [formStylePrimaryColor, setFormStylePrimaryColor] = useState("#f97316");
  const [formStyleSecondaryColor, setFormStyleSecondaryColor] =
    useState("#ea580c");
  const [formStyleDarkMode, setFormStyleDarkMode] = useState(true);
  const [formStyleTitleFont, setFormStyleTitleFont] = useState("oswald");
  const [formStyleBodyFont, setFormStyleBodyFont] = useState("inter");
  const [formStyleButtonStyle, setFormStyleButtonStyle] = useState<
    "solid" | "gradient" | "outline" | "glass"
  >("gradient");
  const [formStyleButtonRounded, setFormStyleButtonRounded] = useState<
    "none" | "sm" | "md" | "lg" | "full"
  >("full");
  const [showStylePanel, setShowStylePanel] = useState(false);

  // Campaign detail
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(
    null,
  );
  const [campaignReport, setCampaignReport] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [campaignHtml, setCampaignHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Campaigns filter
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mailchimp?action=audience");
      const data = await res.json();
      if (data.success) {
        setIsConfigured(true);
        setAudience(data.data.audience);
        setTags(data.data.tags || []);
        setGrowthHistory(data.data.growthHistory || []);
      } else {
        setIsConfigured(false);
        setError(data.error || "Mailchimp not configured");
      }
    } catch (err) {
      setError("Failed to connect to Mailchimp");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async (status?: string) => {
    setCampaignsLoading(true);
    try {
      // cache: 'no-store' + _t cache-buster = double protection against
      // the browser serving a stale campaign list (which was the symptom:
      // older campaigns showing, newer Mailchimp-UI-created ones missing).
      const url = `/api/admin/mailchimp?action=campaigns&count=100${status && status !== "all" ? `&status=${status}` : ""}&_t=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data.campaigns || []);
        setCampaignsTotal(data.data.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (isConfigured) {
      fetchCampaigns(campaignFilter);
    }
  }, [isConfigured, campaignFilter, fetchCampaigns]);

  // Handle template selection
  const handleTemplateSelect = (template: (typeof EMAIL_TEMPLATES)[0]) => {
    setSelectedTemplate(template);
    setFormSubject(template.subject);
    setFormBody(template.body);
    setFormCtaText(template.ctaText);
    setFormCtaUrl(template.ctaUrl);
    if (!formTitle) setFormTitle(template.name);
  };

  // Load an existing draft into the editor for editing
  const loadCampaignForEditing = async (campaign: CampaignData) => {
    setEditingCampaignId(campaign.id);
    setFormSubject(campaign.settings.subject_line || "");
    setFormPreviewText(campaign.settings.preview_text || "");
    setFormTitle(campaign.settings.title || "");
    setActiveTab("create");
    // Try to extract body text from the HTML content
    try {
      const contentRes = await fetch(
        `/api/admin/mailchimp/campaigns/${campaign.id}?detail=content`,
      );
      const contentData = await contentRes.json();
      if (contentData.success && contentData.data?.html) {
        const html = contentData.data.html as string;
        // Extract text between paragraph tags in the main content area
        const bodyMatch = html.match(
          /<p[^>]*style="[^"]*line-height[^"]*"[^>]*>([\s\S]*?)<\/p>/,
        );
        if (bodyMatch) {
          const text = bodyMatch[1]
            .replace(/<br\s*\/?>/g, "\n")
            .replace(/<\/p>\s*<p[^>]*>/g, "\n\n")
            .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, "[$2]($1)")
            .replace(/<h3[^>]*>(.*?)<\/h3>/g, "### $1")
            .replace(/<h1[^>]*>(.*?)<\/h1>/g, "# $1")
            .replace(/<[^>]+>/g, "")
            .trim();
          setFormBody(text);
        }
      }
    } catch (err) {
      console.warn("Could not load campaign content for editing:", err);
    }
  };

  // Handle create campaign
  const handleCreateCampaign = async (sendNow: boolean) => {
    setIsSending(true);
    setSendResult(null);
    try {
      const styleSettingsPayload = {
        primaryColor: formStylePrimaryColor,
        secondaryColor: formStyleSecondaryColor,
        darkMode: formStyleDarkMode,
        titleFont: formStyleTitleFont,
        bodyFont: formStyleBodyFont,
        buttonStyle: formStyleButtonStyle,
        buttonRounded: formStyleButtonRounded,
        colorPreset: "custom",
        accentColor: formStylePrimaryColor,
        textColor: "#ffffff",
        titleStyle: "uppercase",
        backgroundStyle: formStyleDarkMode ? "gradient-dark" : "solid-light",
        backgroundOverlayOpacity: 50,
        backgroundBlur: 0,
        enableGlow: true,
        enableAnimations: false,
        enableParticles: false,
        animationPreset: "none",
      };

      if (editingCampaignId) {
        // Update existing campaign
        const res = await fetch(
          `/api/admin/mailchimp/campaigns/${editingCampaignId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update",
              subject: formSubject,
              previewText: formPreviewText,
              title: formTitle || formSubject,
              body: formBody,
              ctaText: formCtaText || undefined,
              ctaUrl: formCtaUrl || undefined,
              coverImageUrl: formCoverImageUrl || undefined,
              styleSettings: styleSettingsPayload,
            }),
          },
        );

        let data: { success: boolean; error?: string; data?: unknown };
        try {
          const text = await res.text();
          data = text
            ? JSON.parse(text)
            : { success: false, error: "Respuesta vacía del servidor" };
        } catch {
          data = {
            success: false,
            error: "Error al procesar la respuesta del servidor",
          };
        }

        if (data.success) {
          setSendResult({
            success: true,
            message: "Borrador actualizado exitosamente!",
          });
          // Reset form and editing state
          setEditingCampaignId(null);
          setFormSubject("");
          setFormPreviewText("");
          setFormTitle("");
          setFormBody("");
          setFormCtaText("");
          setFormCtaUrl("");
          setFormCoverImageUrl("");
          setFormScheduleTime("");
          setFormSelectedTags([]);
          setCampaignFilter("draft");
          setActiveTab("campaigns");
          const refreshWithRetry = async (attempt = 0) => {
            await fetchCampaigns("draft");
            if (attempt < 2) {
              setTimeout(() => refreshWithRetry(attempt + 1), 1500);
            }
          };
          setTimeout(() => refreshWithRetry(), 1000);
        } else {
          setSendResult({
            success: false,
            message: data.error || "Error al actualizar borrador",
          });
        }
      } else {
        // Create new campaign (existing code)
        const payload: Record<string, unknown> = {
          action: sendNow ? "create-campaign" : "create-draft",
          subject: formSubject,
          previewText: formPreviewText,
          title: formTitle || formSubject,
          body: formBody,
          ctaText: formCtaText || undefined,
          ctaUrl: formCtaUrl || undefined,
          coverImageUrl: formCoverImageUrl || undefined,
          tags: formSelectedTags.length > 0 ? formSelectedTags : undefined,
          styleSettings: styleSettingsPayload,
        };

        if (sendNow && formScheduleTime) {
          payload.scheduleTime = formScheduleTime;
        }

        const res = await fetch("/api/admin/mailchimp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let data: { success: boolean; error?: string; data?: unknown };
        try {
          const text = await res.text();
          data = text
            ? JSON.parse(text)
            : { success: false, error: "Respuesta vacía del servidor" };
        } catch {
          data = {
            success: false,
            error: "Error al procesar la respuesta del servidor",
          };
        }

        if (data.success) {
          setSendResult({
            success: true,
            message: sendNow
              ? formScheduleTime
                ? `Campana programada para ${new Date(formScheduleTime).toLocaleString("es-MX")}`
                : "Campana enviada exitosamente!"
              : "Borrador creado exitosamente!",
          });
          // Reset form
          setFormSubject("");
          setFormPreviewText("");
          setFormTitle("");
          setFormBody("");
          setFormCtaText("");
          setFormCtaUrl("");
          setFormCoverImageUrl("");
          setFormScheduleTime("");
          setFormSelectedTags([]);
          // Switch to the appropriate filter so the new campaign is visible
          const newFilter = sendNow ? "all" : "draft";
          setCampaignFilter(newFilter);
          setActiveTab("campaigns");
          // Retry pattern for draft visibility
          const refreshWithRetry = async (attempt = 0) => {
            await fetchCampaigns(newFilter);
            if (attempt < 2) {
              setTimeout(() => refreshWithRetry(attempt + 1), 1500);
            }
          };
          setTimeout(() => refreshWithRetry(), 1000);
        } else {
          setSendResult({
            success: false,
            message: data.error || "Error al crear campana",
          });
        }
      }
    } catch (err) {
      setSendResult({ success: false, message: "Error de conexion" });
    } finally {
      setIsSending(false);
    }
  };

  // Handle campaign action (supports optional extra payload fields like scheduleTime)
  const handleCampaignAction = async (
    campaignId: string,
    action: string,
    extra?: Record<string, unknown>,
  ) => {
    // Require confirmation before sending
    if (action === "send") {
      const confirmed = confirm(
        "Estas seguro de enviar esta campana ahora? Esta accion no se puede deshacer.",
      );
      if (!confirmed) return;
    }
    try {
      const res = await fetch(`/api/admin/mailchimp/campaigns/${campaignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCampaigns(campaignFilter);
        if (selectedCampaign?.id === campaignId) {
          setSelectedCampaign(null);
        }
      } else {
        // Provide actionable error messages for common issues
        const errorMsg = data.error || "Error desconocido";
        if (
          errorMsg.includes("currently 'sending'") ||
          errorMsg.includes("ya se esta enviando")
        ) {
          const shouldCancel = confirm(
            `${errorMsg}\n\nQuieres cancelar el envio y duplicar la campana para reintentar?`,
          );
          if (shouldCancel) {
            try {
              // Cancel the stuck send
              await fetch(`/api/admin/mailchimp/campaigns/${campaignId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cancel" }),
              });
              // Replicate the campaign as a new draft
              const replicateRes = await fetch(
                `/api/admin/mailchimp/campaigns/${campaignId}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "replicate" }),
                },
              );
              const replicateData = await replicateRes.json();
              if (replicateData.success && replicateData.data?.campaignId) {
                // Send the new replicated campaign
                const sendRes = await fetch(
                  `/api/admin/mailchimp/campaigns/${replicateData.data.campaignId}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "send" }),
                  },
                );
                const sendData = await sendRes.json();
                if (sendData.success) {
                  alert("Campana duplicada y enviada exitosamente!");
                } else {
                  alert(
                    `Se duplico la campana pero no se pudo enviar: ${sendData.error}`,
                  );
                }
              }
              fetchCampaigns(campaignFilter);
            } catch {
              alert(
                "No se pudo recuperar la campana. Intenta duplicarla manualmente.",
              );
            }
          }
        } else if (errorMsg.includes("ya fue enviada")) {
          const shouldDuplicate = confirm(
            `${errorMsg}\n\nQuieres duplicar esta campana para crear una nueva copia?`,
          );
          if (shouldDuplicate) {
            handleCampaignAction(campaignId, "replicate");
          }
        } else {
          alert(errorMsg);
        }
      }
    } catch (err) {
      alert("Error de conexion");
    }
  };

  // Handle delete campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Estas seguro de eliminar esta campana?")) return;
    try {
      const res = await fetch(`/api/admin/mailchimp/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchCampaigns(campaignFilter);
        setSelectedCampaign(null);
      } else {
        alert(data.error || "Error");
      }
    } catch (err) {
      alert("Error de conexion");
    }
  };

  // View campaign details
  const viewCampaignDetails = async (campaign: CampaignData) => {
    setSelectedCampaign(campaign);
    setCampaignReport(null);
    setCampaignHtml(null);
    try {
      if (campaign.status === "sent") {
        const reportRes = await fetch(
          `/api/admin/mailchimp/campaigns/${campaign.id}?detail=report`,
        );
        const reportData = await reportRes.json();
        if (reportData.success) setCampaignReport(reportData.data);
      }
      const contentRes = await fetch(
        `/api/admin/mailchimp/campaigns/${campaign.id}?detail=content`,
      );
      const contentData = await contentRes.json();
      if (contentData.success) setCampaignHtml(contentData.data?.html || null);
    } catch (err) {
      console.error("Failed to load campaign details:", err);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return {
          color: "bg-green-500/10 text-green-500",
          label: "Enviado",
          icon: CheckCircle,
        };
      case "schedule":
        return {
          color: "bg-blue-500/10 text-blue-500",
          label: "Programado",
          icon: Clock,
        };
      case "saving":
        return {
          color: "bg-yellow-500/10 text-yellow-500",
          label: "Guardando",
          icon: RefreshCw,
        };
      case "sending":
        return {
          color: "bg-orange-500/10 text-orange-500",
          label: "Enviando",
          icon: Send,
        };
      case "draft":
      case "save":
        return {
          color: "bg-slc-muted/10 text-slc-muted",
          label: "Borrador",
          icon: FileEdit,
        };
      case "paused":
        return {
          color: "bg-yellow-500/10 text-yellow-500",
          label: "Pausado",
          icon: AlertTriangle,
        };
      default:
        return {
          color: "bg-slc-muted/10 text-slc-muted",
          label: status,
          icon: XCircle,
        };
    }
  };

  // Format rate — Mailchimp API returns rates as decimals (0-1) for list stats
  // and sometimes as percentages (0-100) for campaign report_summary.
  // We detect the format: if > 1, it's already a percentage.
  const formatRate = (rate: number) => {
    if (rate > 1) {
      // Already a percentage (e.g. 45.23 means 45.23%)
      return `${rate.toFixed(1)}%`;
    }
    // Decimal format (e.g. 0.4523 means 45.23%)
    return `${(rate * 100).toFixed(1)}%`;
  };

  // Calculate real average rates from sent campaigns
  const getRealCampaignRates = () => {
    const sentCampaigns = campaigns.filter(
      (c) => c.status === "sent" && c.report_summary,
    );
    if (sentCampaigns.length === 0) {
      return { avgOpenRate: null, avgClickRate: null, campaignCount: 0 };
    }

    // Calculate weighted average based on emails sent
    let totalEmailsSent = 0;
    let weightedOpenSum = 0;
    let weightedClickSum = 0;

    for (const c of sentCampaigns) {
      const emailsSent = c.emails_sent || 0;
      const openRate = c.report_summary?.open_rate;
      const clickRate = c.report_summary?.click_rate;

      // Normalize to decimal (0-1) for calculation
      const normalizedOpenRate = (openRate ?? 0) > 1 ? (openRate ?? 0) / 100 : (openRate ?? 0);
      const normalizedClickRate = (clickRate ?? 0) > 1 ? (clickRate ?? 0) / 100 : (clickRate ?? 0);

      totalEmailsSent += emailsSent;
      weightedOpenSum += emailsSent * normalizedOpenRate;
      weightedClickSum += emailsSent * normalizedClickRate;
    }

    const avgOpenRate =
      totalEmailsSent > 0 ? weightedOpenSum / totalEmailsSent : 0;
    const avgClickRate =
      totalEmailsSent > 0 ? weightedClickSum / totalEmailsSent : 0;

    return { avgOpenRate, avgClickRate, campaignCount: sentCampaigns.length };
  };

  const realRates = getRealCampaignRates();

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ===========================================
  // NOT CONFIGURED STATE
  // ===========================================

  if (!isLoading && !isConfigured) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-oswald text-3xl uppercase mb-4">Email Studio</h2>
          <p className="text-slc-muted mb-8">
            Conecta tu cuenta de Mailchimp para crear y gestionar campanas de
            email directamente desde aqui.
          </p>
          <div className="p-6 bg-slc-card rounded-xl border border-slc-border text-left space-y-4">
            <h3 className="font-oswald text-lg uppercase">
              Configuracion Requerida
            </h3>
            <p className="text-sm text-slc-muted">
              Agrega estas variables de entorno en tu dashboard de Netlify:
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slc-dark rounded-lg">
                <code className="text-sm text-primary font-mono">
                  MAILCHIMP_API_KEY
                </code>
                <span className="text-xs text-slc-muted ml-auto">
                  Tu API key de Mailchimp
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slc-dark rounded-lg">
                <code className="text-sm text-primary font-mono">
                  MAILCHIMP_SERVER_PREFIX
                </code>
                <span className="text-xs text-slc-muted ml-auto">
                  Ej: us1, us14, etc.
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slc-dark rounded-lg">
                <code className="text-sm text-primary font-mono">
                  MAILCHIMP_AUDIENCE_ID
                </code>
                <span className="text-xs text-slc-muted ml-auto">
                  ID de tu lista/audiencia
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-slc-border">
              <h4 className="font-medium text-sm mb-2">
                Donde encontrar tus credenciales:
              </h4>
              <ol className="text-sm text-slc-muted space-y-2 list-decimal list-inside">
                <li>
                  Ve a{" "}
                  <a
                    href="https://mailchimp.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    mailchimp.com
                  </a>{" "}
                  e inicia sesion
                </li>
                <li>
                  Haz clic en tu perfil (esquina superior derecha) &rarr;
                  Profile &rarr; Extras &rarr; API keys
                </li>
                <li>Crea una nueva API key y copiala</li>
                <li>
                  El server prefix esta en tu URL de Mailchimp (ej:
                  us14.admin.mailchimp.com = us14)
                </li>
                <li>
                  Ve a Audience &rarr; Settings &rarr; Audience name and
                  defaults para encontrar el Audience ID
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================
  // MAIN UI
  // ===========================================

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
            <Mail className="w-8 h-8 text-primary" />
            Email Studio
          </h1>
          <p className="text-slc-muted mt-1">
            Crea y gestiona campanas de email con Mailchimp
          </p>
        </div>
        <div className="flex items-center gap-3">
          {audience && (
            <div className="flex items-center gap-2 px-4 py-2 bg-slc-card rounded-lg border border-slc-border">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {audience.stats.member_count.toLocaleString()}
              </span>
              <span className="text-xs text-slc-muted">suscriptores</span>
            </div>
          )}
          <a
            href="https://login.mailchimp.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="Iniciar sesión en Mailchimp"
          >
            <Button variant="outline" size="sm" className="gap-2">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Mailchimp</span>
            </Button>
          </a>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              fetchDashboard();
              fetchCampaigns(campaignFilter);
            }}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slc-card rounded-lg border border-slc-border overflow-x-auto">
        {[
          { id: "dashboard" as TabType, label: "Dashboard", icon: BarChart3 },
          { id: "create" as TabType, label: "Nuevo Email", icon: Plus },
          { id: "campaigns" as TabType, label: "Campanas", icon: Send },
          { id: "audience" as TabType, label: "Audiencia", icon: Users },
          { id: "settings" as TabType, label: "Config", icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-slc-muted hover:text-white hover:bg-slc-dark"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-slc-muted">
            Cargando datos de Mailchimp...
          </span>
        </div>
      )}

      {/* ==================== DASHBOARD TAB ==================== */}
      {!isLoading && activeTab === "dashboard" && audience && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-xs text-slc-muted">Suscriptores</span>
              </div>
              <p className="text-3xl font-oswald">
                {audience.stats.member_count.toLocaleString()}
              </p>
              {growthHistory.length >= 2 && (
                <div className="flex items-center gap-1 mt-1">
                  {growthHistory[0].optins >= growthHistory[1]?.optins ? (
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )}
                  <span className="text-xs text-slc-muted">
                    {growthHistory[0]?.optins || 0} nuevos este mes
                  </span>
                </div>
              )}
            </div>

            <div className="p-5 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-blue-500" />
                <span className="text-xs text-slc-muted">Tasa de Apertura</span>
              </div>
              <p className="text-3xl font-oswald">
                {realRates.avgOpenRate !== null
                  ? formatRate(realRates.avgOpenRate)
                  : formatRate(audience.stats.open_rate)}
              </p>
              <span className="text-xs text-slc-muted">
                {realRates.avgOpenRate !== null
                  ? `Promedio de ${realRates.campaignCount} campañas`
                  : "Promedio de la lista"}
              </span>
            </div>

            <div className="p-5 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-3">
                <Send className="w-5 h-5 text-green-500" />
                <span className="text-xs text-slc-muted">
                  Campanas Enviadas
                </span>
              </div>
              <p className="text-3xl font-oswald">
                {campaigns.filter((c) => c.status === "sent").length}
              </p>
              <span className="text-xs text-slc-muted">Total de campanas</span>
            </div>

            <div className="p-5 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <span className="text-xs text-slc-muted">Tasa de Clicks</span>
              </div>
              <p className="text-3xl font-oswald">
                {realRates.avgClickRate !== null
                  ? formatRate(realRates.avgClickRate)
                  : formatRate(audience.stats.click_rate)}
              </p>
              <span className="text-xs text-slc-muted">
                {realRates.avgClickRate !== null
                  ? `Promedio de ${realRates.campaignCount} campañas`
                  : "Promedio de la lista"}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
            <h3 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Acciones Rapidas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab("create")}
                className="flex items-center gap-3 p-4 bg-slc-dark rounded-lg border border-slc-border hover:border-primary/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Nueva Campana</p>
                  <p className="text-xs text-slc-muted">Crear un email</p>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("campaigns")}
                className="flex items-center gap-3 p-4 bg-slc-dark rounded-lg border border-slc-border hover:border-primary/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Ver Campanas</p>
                  <p className="text-xs text-slc-muted">Historial y reportes</p>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("audience")}
                className="flex items-center gap-3 p-4 bg-slc-dark rounded-lg border border-slc-border hover:border-primary/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Ver Audiencia</p>
                  <p className="text-xs text-slc-muted">Suscriptores y tags</p>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Campaigns */}
          <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-oswald text-lg uppercase flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Campanas Recientes
              </h3>
              <button
                onClick={() => setActiveTab("campaigns")}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Ver todas <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            {campaigns.length === 0 ? (
              <p className="text-slc-muted text-sm text-center py-8">
                No hay campanas todavia. Crea tu primera campana!
              </p>
            ) : (
              <div className="space-y-3">
                {campaigns.slice(0, 5).map((campaign) => {
                  const badge = getStatusBadge(campaign.status);
                  return (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 bg-slc-dark rounded-lg border border-slc-border hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => viewCampaignDetails(campaign)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {campaign.settings.title ||
                              campaign.settings.subject_line}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${badge.color} flex items-center gap-1`}
                          >
                            <badge.icon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slc-muted truncate">
                          {campaign.settings.subject_line}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        {campaign.emails_sent > 0 && (
                          <p className="text-sm font-medium">
                            {campaign.emails_sent.toLocaleString()} enviados
                          </p>
                        )}
                        {campaign.report_summary && (
                          <p className="text-xs text-slc-muted">
                            {formatRate(campaign.report_summary.open_rate)}{" "}
                            apertura
                          </p>
                        )}
                        <p className="text-xs text-slc-muted">
                          {formatDate(campaign.send_time)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tags Overview */}
          {tags.length > 0 && (
            <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
              <h3 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Tags de Audiencia
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1.5 bg-slc-dark rounded-full border border-slc-border text-sm flex items-center gap-2"
                  >
                    {tag.name}
                    <span className="text-xs text-primary font-medium">
                      {tag.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== CREATE CAMPAIGN TAB ==================== */}
      {!isLoading && activeTab === "create" && (
        <div className="space-y-6">
          {/* Editing existing draft banner */}
          {editingCampaignId && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-blue-500" />
                <span className="text-sm">Editando borrador existente</span>
              </div>
              <button
                onClick={() => {
                  setEditingCampaignId(null);
                  setFormSubject("");
                  setFormPreviewText("");
                  setFormTitle("");
                  setFormBody("");
                  setFormCtaText("");
                  setFormCtaUrl("");
                  setFormCoverImageUrl("");
                  setFormScheduleTime("");
                  setFormSelectedTags([]);
                }}
                className="text-xs text-primary hover:underline"
              >
                Crear nuevo en su lugar
              </button>
            </div>
          )}

          {/* Send result notification */}
          {sendResult && (
            <div
              className={`p-4 rounded-lg border flex items-center gap-3 ${
                sendResult.success
                  ? "bg-green-500/10 border-green-500/20 text-green-500"
                  : "bg-red-500/10 border-red-500/20 text-red-500"
              }`}
            >
              {sendResult.success ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm">{sendResult.message}</span>
              <button onClick={() => setSendResult(null)} className="ml-auto">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template Selection */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="font-oswald text-lg uppercase flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Plantillas
              </h3>
              <div className="space-y-2">
                {EMAIL_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      selectedTemplate.id === template.id
                        ? "bg-primary/10 border-primary"
                        : "bg-slc-card border-slc-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center ${
                          selectedTemplate.id === template.id
                            ? "bg-primary/20"
                            : "bg-slc-dark"
                        }`}
                      >
                        <template.icon
                          className={`w-4 h-4 ${
                            selectedTemplate.id === template.id
                              ? "text-primary"
                              : "text-slc-muted"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-slc-muted">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Info: Campaign-specific emails */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs text-slc-muted">
                  Para enviar emails de una campaña específica (presave,
                  smartlink, etc.), ve a{" "}
                  <a
                    href="/admin/campaigns"
                    className="text-primary hover:underline font-medium"
                  >
                    Campañas
                  </a>{" "}
                  → editar → Enviar Email
                </p>
              </div>

              {/* Audience / Tags Selector */}
              <div className="pt-4">
                <AudienceSelector
                  tags={tags}
                  selectedTags={formSelectedTags}
                  onSelectedTagsChange={setFormSelectedTags}
                  audienceMemberCount={audience?.stats?.member_count || 0}
                  tagsLoading={false}
                  variant="checkbox"
                  showReachSummary={true}
                  showSearch={true}
                  disabled={isSending}
                />
              </div>
            </div>

            {/* Campaign Form */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-oswald text-lg uppercase flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-primary" />
                Contenido del Email
              </h3>

              <div className="space-y-4 p-6 bg-slc-card rounded-xl border border-slc-border">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nombre de la Campana
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Nombre interno (no visible para suscriptores)"
                    className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Asunto *
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="El asunto del email"
                    className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Preview text */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Texto de Preview
                  </label>
                  <input
                    type="text"
                    value={formPreviewText}
                    onChange={(e) => setFormPreviewText(e.target.value)}
                    placeholder="Texto que aparece junto al asunto en la bandeja"
                    className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Contenido *
                  </label>
                  <textarea
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="Escribe el contenido del email. Usa **negrita**, [enlace](url), y ### para headings."
                    rows={10}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none resize-y"
                  />
                  <p className="text-xs text-slc-muted mt-1">
                    Formato: **negrita**, [texto](url), ### heading
                  </p>
                </div>

                {/* CTA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Texto del Boton CTA
                    </label>
                    <input
                      type="text"
                      value={formCtaText}
                      onChange={(e) => setFormCtaText(e.target.value)}
                      placeholder="Ej: Escuchar Ahora"
                      className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> URL del Boton CTA
                    </label>
                    <input
                      type="url"
                      value={formCtaUrl}
                      onChange={(e) => setFormCtaUrl(e.target.value)}
                      placeholder="https://sonidoliquido.com/..."
                      className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> URL de Imagen de Portada
                    (opcional)
                  </label>
                  <input
                    type="url"
                    value={formCoverImageUrl}
                    onChange={(e) => setFormCoverImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Style Customization */}
                <div className="border-t border-slc-border pt-4">
                  <button
                    type="button"
                    onClick={() => setShowStylePanel(!showStylePanel)}
                    className="w-full flex items-center justify-between text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle
                          cx="13.5"
                          cy="6.5"
                          x="0"
                          y="0"
                          width="3"
                          height="3"
                          rx="1.5"
                        />
                        <circle
                          cx="17.5"
                          cy="10.5"
                          width="3"
                          height="3"
                          rx="1.5"
                        />
                        <circle
                          cx="8.5"
                          cy="7.5"
                          width="3"
                          height="3"
                          rx="1.5"
                        />
                        <circle
                          cx="6.5"
                          cy="12.5"
                          width="3"
                          height="3"
                          rx="1.5"
                        />
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                      </svg>
                      Personalizar Diseño y Colores
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showStylePanel ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showStylePanel && (
                    <div className="mt-4 space-y-4">
                      {/* Color Presets */}
                      <div>
                        <label className="block text-xs text-slc-muted mb-2">
                          Presets de Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            {
                              label: "Naranja (SLC)",
                              primary: "#f97316",
                              secondary: "#ea580c",
                            },
                            {
                              label: "Dorado",
                              primary: "#eab308",
                              secondary: "#ca8a04",
                            },
                            {
                              label: "Rojo",
                              primary: "#ef4444",
                              secondary: "#dc2626",
                            },
                            {
                              label: "Rosa",
                              primary: "#ec4899",
                              secondary: "#db2777",
                            },
                            {
                              label: "Morado",
                              primary: "#a855f7",
                              secondary: "#9333ea",
                            },
                            {
                              label: "Azul",
                              primary: "#3b82f6",
                              secondary: "#2563eb",
                            },
                            {
                              label: "Verde",
                              primary: "#22c55e",
                              secondary: "#16a34a",
                            },
                            {
                              label: "Spotify",
                              primary: "#1db954",
                              secondary: "#1ed760",
                            },
                            {
                              label: "Blanco",
                              primary: "#ffffff",
                              secondary: "#e5e7eb",
                            },
                            {
                              label: "Neón",
                              primary: "#00ff88",
                              secondary: "#00ffcc",
                            },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setFormStylePrimaryColor(preset.primary);
                                setFormStyleSecondaryColor(preset.secondary);
                              }}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                                formStylePrimaryColor === preset.primary
                                  ? "border-primary bg-primary/10"
                                  : "border-slc-border bg-slc-dark hover:border-primary/50"
                              }`}
                            >
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{
                                  background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                                }}
                              />
                              <span className="text-slc-muted">
                                {preset.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Colors */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slc-muted mb-1">
                            Color Principal
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStylePrimaryColor}
                              onChange={(e) =>
                                setFormStylePrimaryColor(e.target.value)
                              }
                              className="w-8 h-8 rounded border border-slc-border cursor-pointer"
                            />
                            <input
                              type="text"
                              value={formStylePrimaryColor}
                              onChange={(e) =>
                                setFormStylePrimaryColor(e.target.value)
                              }
                              className="flex-1 px-2 py-1.5 bg-slc-dark border border-slc-border rounded text-xs focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-slc-muted mb-1">
                            Color Secundario
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyleSecondaryColor}
                              onChange={(e) =>
                                setFormStyleSecondaryColor(e.target.value)
                              }
                              className="w-8 h-8 rounded border border-slc-border cursor-pointer"
                            />
                            <input
                              type="text"
                              value={formStyleSecondaryColor}
                              onChange={(e) =>
                                setFormStyleSecondaryColor(e.target.value)
                              }
                              className="flex-1 px-2 py-1.5 bg-slc-dark border border-slc-border rounded text-xs focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dark/Light Mode */}
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-slc-muted">Modo:</label>
                        <div className="flex gap-1 bg-slc-dark rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => setFormStyleDarkMode(true)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                              formStyleDarkMode
                                ? "bg-primary text-white"
                                : "text-slc-muted hover:text-white"
                            }`}
                          >
                            Oscuro
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormStyleDarkMode(false)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                              !formStyleDarkMode
                                ? "bg-primary text-white"
                                : "text-slc-muted hover:text-white"
                            }`}
                          >
                            Claro
                          </button>
                        </div>
                      </div>

                      {/* Fonts */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slc-muted mb-1">
                            Fuente de Títulos
                          </label>
                          <select
                            value={formStyleTitleFont}
                            onChange={(e) =>
                              setFormStyleTitleFont(e.target.value)
                            }
                            className="w-full px-2 py-1.5 bg-slc-dark border border-slc-border rounded text-xs focus:border-primary focus:outline-none"
                          >
                            <option value="oswald">Oswald</option>
                            <option value="bebas">Bebas Neue</option>
                            <option value="anton">Anton</option>
                            <option value="archivo-black">Archivo Black</option>
                            <option value="righteous">Righteous</option>
                            <option value="bangers">Bangers</option>
                            <option value="permanent-marker">
                              Permanent Marker
                            </option>
                            <option value="montserrat">Montserrat</option>
                            <option value="poppins">Poppins</option>
                            <option value="inter">Inter</option>
                            <option value="space-grotesk">Space Grotesk</option>
                            <option value="playfair">Playfair Display</option>
                            <option value="roboto-mono">Roboto Mono</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slc-muted mb-1">
                            Fuente del Cuerpo
                          </label>
                          <select
                            value={formStyleBodyFont}
                            onChange={(e) =>
                              setFormStyleBodyFont(e.target.value)
                            }
                            className="w-full px-2 py-1.5 bg-slc-dark border border-slc-border rounded text-xs focus:border-primary focus:outline-none"
                          >
                            <option value="inter">Inter</option>
                            <option value="montserrat">Montserrat</option>
                            <option value="poppins">Poppins</option>
                            <option value="raleway">Raleway</option>
                            <option value="dm-sans">DM Sans</option>
                            <option value="outfit">Outfit</option>
                            <option value="sora">Sora</option>
                            <option value="oswald">Oswald</option>
                            <option value="space-grotesk">Space Grotesk</option>
                            <option value="merriweather">Merriweather</option>
                            <option value="roboto-mono">Roboto Mono</option>
                          </select>
                        </div>
                      </div>

                      {/* Button Style */}
                      <div>
                        <label className="block text-xs text-slc-muted mb-2">
                          Estilo del Botón
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { value: "gradient" as const, label: "Gradiente" },
                            { value: "solid" as const, label: "Sólido" },
                            { value: "outline" as const, label: "Contorno" },
                            { value: "glass" as const, label: "Cristal" },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setFormStyleButtonStyle(opt.value)}
                              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                                formStyleButtonStyle === opt.value
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-slc-border bg-slc-dark text-slc-muted hover:border-primary/50"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Button Rounded */}
                      <div>
                        <label className="block text-xs text-slc-muted mb-2">
                          Bordes del Botón
                        </label>
                        <div className="flex gap-2">
                          {[
                            { value: "none" as const, label: "Cuadrado" },
                            { value: "sm" as const, label: "Sutil" },
                            { value: "md" as const, label: "Medio" },
                            { value: "lg" as const, label: "Grande" },
                            { value: "full" as const, label: "Píldora" },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setFormStyleButtonRounded(opt.value)
                              }
                              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                                formStyleButtonRounded === opt.value
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-slc-border bg-slc-dark text-slc-muted hover:border-primary/50"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Preview swatch */}
                      <div className="p-3 bg-slc-dark rounded-lg border border-slc-border">
                        <p className="text-xs text-slc-muted mb-2">
                          Vista previa
                        </p>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0"
                            style={{
                              backgroundColor: formStyleDarkMode
                                ? "#1a1a1a"
                                : "#ffffff",
                            }}
                          >
                            <div
                              className="h-5"
                              style={{
                                background: `linear-gradient(135deg, ${formStylePrimaryColor}, ${formStyleSecondaryColor})`,
                              }}
                            />
                            <div className="flex items-center justify-center h-11">
                              <div
                                className="px-3 py-1 text-[10px] text-white font-bold"
                                style={{
                                  background:
                                    formStyleButtonStyle === "gradient"
                                      ? `linear-gradient(135deg, ${formStylePrimaryColor}, ${formStyleSecondaryColor})`
                                      : formStyleButtonStyle === "solid"
                                        ? formStylePrimaryColor
                                        : formStyleButtonStyle === "outline"
                                          ? "transparent"
                                          : "rgba(255,255,255,0.1)",
                                  border:
                                    formStyleButtonStyle === "outline"
                                      ? `2px solid ${formStylePrimaryColor}`
                                      : "none",
                                  borderRadius:
                                    formStyleButtonRounded === "full"
                                      ? "50px"
                                      : formStyleButtonRounded === "lg"
                                        ? "8px"
                                        : formStyleButtonRounded === "md"
                                          ? "6px"
                                          : formStyleButtonRounded === "sm"
                                            ? "4px"
                                            : "0px",
                                  color:
                                    formStyleButtonStyle === "outline"
                                      ? formStylePrimaryColor
                                      : "#ffffff",
                                }}
                              >
                                BOTÓN
                              </div>
                            </div>
                          </div>
                          <div className="text-xs space-y-1">
                            <p
                              style={{
                                color: formStyleDarkMode ? "#fff" : "#333",
                              }}
                            >
                              <span
                                style={{
                                  color: formStylePrimaryColor,
                                  fontWeight: "bold",
                                }}
                              >
                                Título
                              </span>{" "}
                              de ejemplo
                            </p>
                            <p
                              style={{
                                color: formStyleDarkMode ? "#999" : "#666",
                              }}
                            >
                              Cuerpo del email
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule */}
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Programar Envio (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formScheduleTime}
                    onChange={(e) => setFormScheduleTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                  <p className="text-xs text-slc-muted mt-1">
                    Deja vacio para enviar inmediatamente
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    const confirmed = confirm(
                      formScheduleTime
                        ? "Programar esta campana para envio?"
                        : "Enviar esta campana ahora? Esta accion no se puede deshacer.",
                    );
                    if (confirmed) handleCreateCampaign(true);
                  }}
                  disabled={isSending || !formSubject || !formBody}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : formScheduleTime ? (
                    <Calendar className="w-4 h-4 mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {isSending
                    ? "Enviando..."
                    : formScheduleTime
                      ? "Programar Campana"
                      : "Enviar Ahora"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCreateCampaign(false)}
                  disabled={isSending || !formSubject || !formBody}
                >
                  <FileEdit className="w-4 h-4 mr-2" />
                  {editingCampaignId
                    ? "Guardar Cambios"
                    : "Guardar como Borrador"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  disabled={!formSubject && !formBody}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          </div>

          {/* Preview Modal */}
          {showPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-medium">Preview del Email</h3>
                  <button onClick={() => setShowPreview(false)}>
                    <XCircle className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-4">
                  <iframe
                    srcDoc={generatePreviewHTML({
                      title: formTitle || formSubject,
                      body: formBody,
                      ctaText: formCtaText,
                      ctaUrl: formCtaUrl,
                      coverImageUrl: proxyImageUrl(formCoverImageUrl),
                      primaryColor: formStylePrimaryColor,
                      secondaryColor: formStyleSecondaryColor,
                      darkMode: formStyleDarkMode,
                      titleFont: formStyleTitleFont,
                      bodyFont: formStyleBodyFont,
                      buttonStyle: formStyleButtonStyle,
                      buttonRounded: formStyleButtonRounded,
                    })}
                    className="w-full border-0"
                    style={{ minHeight: "600px" }}
                    title="Email Preview"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== CAMPAIGNS TAB ==================== */}
      {!isLoading && activeTab === "campaigns" && (
        <div className="space-y-6">
          {/* Filter + Refresh + Count */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {["all", "sent", "schedule", "draft", "sending"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setCampaignFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    campaignFilter === filter
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-slc-card border-slc-border text-slc-muted hover:border-primary/50"
                  }`}
                >
                  {filter === "all"
                    ? "Todas"
                    : filter === "sent"
                      ? "Enviadas"
                      : filter === "schedule"
                        ? "Programadas"
                        : filter === "draft"
                          ? "Borradores"
                          : "Enviando"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {campaignsTotal > 0 && (
                <span className="text-xs text-slc-muted">
                  Mostrando {campaigns.length} de {campaignsTotal} campaña
                  {campaignsTotal === 1 ? "" : "s"}
                  {campaignsTotal > campaigns.length &&
                    " — carga más en Mailchimp"}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCampaigns(campaignFilter)}
                disabled={campaignsLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    campaignsLoading ? "animate-spin" : ""
                  }`}
                />
                Actualizar
              </Button>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="space-y-3">
            {campaignsLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <span className="ml-3 text-slc-muted">
                  Cargando campañas...
                </span>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16">
                <Send className="w-12 h-12 text-slc-muted mx-auto mb-4" />
                <p className="text-slc-muted">
                  No hay campanas{" "}
                  {campaignFilter !== "all" ? "con este filtro" : "todavia"}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setActiveTab("create")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Email
                </Button>
              </div>
            ) : (
              campaigns.map((campaign) => {
                const badge = getStatusBadge(campaign.status);
                return (
                  <div
                    key={campaign.id}
                    className={`p-5 rounded-xl border transition-all cursor-pointer ${
                      selectedCampaign?.id === campaign.id
                        ? "bg-slc-card border-primary"
                        : "bg-slc-card border-slc-border hover:border-primary/30"
                    }`}
                    onClick={() => viewCampaignDetails(campaign)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium truncate">
                            {campaign.settings.title ||
                              campaign.settings.subject_line}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${badge.color}`}
                          >
                            <badge.icon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-sm text-slc-muted truncate mb-2">
                          {campaign.settings.subject_line}
                        </p>
                        {campaign.settings.preview_text && (
                          <p className="text-xs text-slc-muted/60 truncate">
                            {campaign.settings.preview_text}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {campaign.emails_sent > 0 && (
                          <p className="text-sm font-medium">
                            {campaign.emails_sent.toLocaleString()}
                          </p>
                        )}
                        {campaign.report_summary && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-green-500 flex items-center gap-1">
                              <Eye className="w-3 h-3" />{" "}
                              {formatRate(campaign.report_summary.open_rate)}
                            </span>
                            <span className="text-xs text-blue-500 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />{" "}
                              {formatRate(campaign.report_summary.click_rate)}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-slc-muted mt-1">
                          {formatDate(campaign.send_time)}
                        </p>
                      </div>
                    </div>

                    {/* Campaign Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slc-border flex-wrap">
                      {(campaign.status === "draft" ||
                        campaign.status === "save") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadCampaignForEditing(campaign);
                          }}
                        >
                          <FileEdit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      )}
                      {(campaign.status === "draft" ||
                        campaign.status === "save" ||
                        campaign.status === "schedule") && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCampaignAction(campaign.id, "send");
                          }}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Enviar
                        </Button>
                      )}
                      {campaign.status === "sending" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Cancelar el envio de esta campana?")) {
                              handleCampaignAction(campaign.id, "cancel");
                            }
                          }}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Cancelar Envio
                        </Button>
                      )}
                      {(campaign.status === "draft" ||
                        campaign.status === "save") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            const time = prompt(
                              "Fecha y hora de envio (ISO):",
                              new Date(Date.now() + 3600000).toISOString(),
                            );
                            if (time)
                              handleCampaignAction(campaign.id, "schedule", {
                                scheduleTime: time,
                              });
                          }}
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Programar
                        </Button>
                      )}
                      {campaign.status === "schedule" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCampaignAction(campaign.id, "unschedule");
                          }}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Desprogramar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCampaignAction(campaign.id, "replicate");
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Duplicar
                      </Button>
                      {(campaign.status === "draft" ||
                        campaign.status === "save" ||
                        campaign.status === "schedule") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCampaign(campaign.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Eliminar
                        </Button>
                      )}
                      <a
                        href={`https://admin.mailchimp.com/campaigns/edit?id=${campaign.web_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Abrir en Mailchimp <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Campaign Detail Panel */}
          {selectedCampaign && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="bg-slc-dark border border-slc-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between p-6 border-b border-slc-border">
                  <div>
                    <h3 className="font-oswald text-xl uppercase">
                      {selectedCampaign.settings.title ||
                        selectedCampaign.settings.subject_line}
                    </h3>
                    <p className="text-sm text-slc-muted mt-1">
                      {selectedCampaign.settings.subject_line}
                    </p>
                  </div>
                  <button onClick={() => setSelectedCampaign(null)}>
                    <XCircle className="w-6 h-6 text-slc-muted hover:text-white" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Report Stats */}
                  {campaignReport && (
                    <div className="space-y-3">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 bg-slc-card rounded-lg border border-slc-border text-center">
                          <p className="text-2xl font-oswald">
                            {((campaignReport as Record<string, unknown>)
                              .emails_sent as number) || 0}
                          </p>
                          <p className="text-xs text-slc-muted">Enviados</p>
                        </div>
                        <div className="p-4 bg-slc-card rounded-lg border border-slc-border text-center">
                          <p className="text-2xl font-oswald text-green-500">
                            {(
                              campaignReport as Record<
                                string,
                                Record<string, number>
                              >
                            ).opens?.unique_opens || 0}
                          </p>
                          <p className="text-xs text-slc-muted">
                            Aperturas Unicas
                          </p>
                        </div>
                        <div className="p-4 bg-slc-card rounded-lg border border-slc-border text-center">
                          <p className="text-2xl font-oswald text-blue-500">
                            {(
                              campaignReport as Record<
                                string,
                                Record<string, number>
                              >
                            ).clicks?.unique_clicks || 0}
                          </p>
                          <p className="text-xs text-slc-muted">
                            Clicks Unicos
                          </p>
                        </div>
                        <div className="p-4 bg-slc-card rounded-lg border border-slc-border text-center">
                          <p className="text-2xl font-oswald text-red-500">
                            {(
                              campaignReport as Record<
                                string,
                                Record<string, number>
                              >
                            ).bounces?.hard_bounces || 0}
                          </p>
                          <p className="text-xs text-slc-muted">
                            Rebotes Duros
                          </p>
                        </div>
                      </div>
                      {/* Rates & Additional Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                          <p className="text-xl font-oswald text-green-500">
                            {(
                              ((
                                campaignReport as Record<
                                  string,
                                  Record<string, number>
                                >
                              ).opens?.open_rate || 0) * 100
                            ).toFixed(1)}
                            %
                          </p>
                          <p className="text-xs text-green-400">
                            Tasa de Apertura
                          </p>
                        </div>
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                          <p className="text-xl font-oswald text-blue-500">
                            {(
                              ((
                                campaignReport as Record<
                                  string,
                                  Record<string, number>
                                >
                              ).clicks?.click_rate || 0) * 100
                            ).toFixed(1)}
                            %
                          </p>
                          <p className="text-xs text-blue-400">
                            Tasa de Clicks
                          </p>
                        </div>
                        <div className="p-3 bg-slc-card rounded-lg border border-slc-border text-center">
                          <p className="text-xl font-oswald">
                            {(
                              campaignReport as Record<
                                string,
                                Record<string, number>
                              >
                            ).opens?.total_opens || 0}
                          </p>
                          <p className="text-xs text-slc-muted">
                            Aperturas Totales
                          </p>
                        </div>
                        <div className="p-3 bg-slc-card rounded-lg border border-slc-border text-center">
                          <p className="text-xl font-oswald">
                            {(
                              campaignReport as Record<
                                string,
                                Record<string, number>
                              >
                            ).bounces?.soft_bounces || 0}
                          </p>
                          <p className="text-xs text-slc-muted">
                            Rebotes Suaves
                          </p>
                        </div>
                        <div className="p-3 bg-slc-card rounded-lg border border-slc-border text-center">
                          <p className="text-xl font-oswald">
                            {((campaignReport as Record<string, unknown>)
                              .unsubscribed as number) || 0}
                          </p>
                          <p className="text-xs text-slc-muted">Bajas</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campaign HTML Preview */}
                  {campaignHtml && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" />
                        Contenido del Email
                      </h4>
                      <div className="border border-slc-border rounded-lg overflow-hidden bg-white">
                        <iframe
                          srcDoc={campaignHtml}
                          className="w-full border-0"
                          style={{ minHeight: "500px" }}
                          title="Campaign Content"
                        />
                      </div>
                    </div>
                  )}

                  {/* Campaign metadata */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slc-muted">ID:</span>{" "}
                      <span className="font-mono">{selectedCampaign.id}</span>
                    </div>
                    <div>
                      <span className="text-slc-muted">Estado:</span>{" "}
                      <span
                        className={
                          getStatusBadge(selectedCampaign.status).color
                        }
                      >
                        {getStatusBadge(selectedCampaign.status).label}
                      </span>
                    </div>
                    <div>
                      <span className="text-slc-muted">Tipo:</span>{" "}
                      {selectedCampaign.type}
                    </div>
                    <div>
                      <span className="text-slc-muted">Enviados:</span>{" "}
                      {selectedCampaign.emails_sent.toLocaleString()}
                    </div>
                    {selectedCampaign.send_time && (
                      <div>
                        <span className="text-slc-muted">Fecha de envio:</span>{" "}
                        {formatDate(selectedCampaign.send_time)}
                      </div>
                    )}
                    {selectedCampaign.settings.preview_text && (
                      <div>
                        <span className="text-slc-muted">Preview:</span>{" "}
                        {selectedCampaign.settings.preview_text}
                      </div>
                    )}
                  </div>

                  {/* Edit button for drafts */}
                  {(selectedCampaign.status === "draft" ||
                    selectedCampaign.status === "save") && (
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        onClick={() => {
                          setSelectedCampaign(null);
                          loadCampaignForEditing(selectedCampaign);
                        }}
                      >
                        <FileEdit className="w-4 h-4 mr-2" />
                        Editar Borrador
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== AUDIENCE TAB ==================== */}
      {!isLoading && activeTab === "audience" && audience && (
        <div className="space-y-6">
          {/* Audience Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-xs text-slc-muted">
                  Total Suscriptores
                </span>
              </div>
              <p className="text-3xl font-oswald">
                {audience.stats.member_count.toLocaleString()}
              </p>
            </div>
            <div className="p-5 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-xs text-slc-muted">Desuscritos</span>
              </div>
              <p className="text-3xl font-oswald">
                {audience.stats.unsubscribe_count.toLocaleString()}
              </p>
            </div>
            <div className="p-5 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-blue-500" />
                <span className="text-xs text-slc-muted">Tasa de Apertura</span>
              </div>
              <p className="text-3xl font-oswald">
                {formatRate(audience.stats.open_rate)}
              </p>
            </div>
            <div className="p-5 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-xs text-slc-muted">Tasa de Clicks</span>
              </div>
              <p className="text-3xl font-oswald">
                {formatRate(audience.stats.click_rate)}
              </p>
            </div>
          </div>

          {/* Audience Info */}
          <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
            <h3 className="font-oswald text-lg uppercase mb-4">
              Informacion de la Audiencia
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slc-muted">Nombre:</span>{" "}
                <span className="font-medium">{audience.name}</span>
              </div>
              <div>
                <span className="text-slc-muted">ID:</span>{" "}
                <span className="font-mono text-xs">{audience.id}</span>
              </div>
              <div>
                <span className="text-slc-muted">Suscriptores Activos:</span>{" "}
                <span className="font-medium">
                  {audience.stats.member_count.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slc-muted">Limpiados:</span>{" "}
                <span className="font-medium">
                  {audience.stats.cleaned_count.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Growth History */}
          {growthHistory.length > 0 && (
            <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
              <h3 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Historial de Crecimiento
              </h3>
              <div className="space-y-2">
                {growthHistory
                  .slice()
                  .reverse()
                  .map((item) => (
                    <div
                      key={item.month}
                      className="flex items-center justify-between p-3 bg-slc-dark rounded-lg"
                    >
                      <span className="text-sm font-medium">{item.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slc-muted">
                          {item.existing.toLocaleString()} suscriptores
                        </span>
                        <span className="text-sm text-green-500">
                          +{item.optins} opt-ins
                        </span>
                        {item.imports > 0 && (
                          <span className="text-sm text-blue-500">
                            +{item.imports} importados
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
              <h3 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Tags ({tags.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="p-4 bg-slc-dark rounded-lg border border-slc-border"
                  >
                    <p className="font-medium text-sm truncate">{tag.name}</p>
                    <p className="text-xs text-slc-muted mt-1">
                      {tag.count} contactos
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SETTINGS TAB ==================== */}
      {!isLoading && activeTab === "settings" && audience && (
        <div className="space-y-6">
          <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
            <h3 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Estado de la Conexion
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slc-dark rounded-lg">
                <span className="text-sm">API Key</span>
                <span className="text-sm text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Configurada
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slc-dark rounded-lg">
                <span className="text-sm">Server Prefix</span>
                <span className="text-sm text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Configurado
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slc-dark rounded-lg">
                <span className="text-sm">Audience ID</span>
                <span className="text-sm text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Configurado
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slc-dark rounded-lg">
                <span className="text-sm">Audiencia</span>
                <span className="text-sm font-medium">{audience.name}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slc-dark rounded-lg">
                <span className="text-sm">Suscriptores</span>
                <span className="text-sm font-medium">
                  {audience.stats.member_count.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
            <h3 className="font-oswald text-lg uppercase mb-4">
              Abrir en Mailchimp
            </h3>
            <p className="text-sm text-slc-muted mb-4">
              Para opciones avanzadas como A/B testing, automaciones, y editar
              plantillas visuales, usa el dashboard de Mailchimp directamente.
            </p>
            <a
              href="https://admin.mailchimp.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Dashboard de Mailchimp
              </Button>
            </a>
          </div>

          <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
            <h3 className="font-oswald text-lg uppercase mb-4">
              Variables de Entorno
            </h3>
            <p className="text-sm text-slc-muted mb-4">
              Estas son las variables de entorno necesarias. Se configuran en el
              dashboard de Netlify.
            </p>
            <div className="space-y-2">
              {[
                { key: "MAILCHIMP_API_KEY", desc: "Tu API key de Mailchimp" },
                {
                  key: "MAILCHIMP_SERVER_PREFIX",
                  desc: "Servidor de la API (ej: us14)",
                },
                {
                  key: "MAILCHIMP_AUDIENCE_ID",
                  desc: "ID de tu lista/audiencia",
                },
              ].map((env) => (
                <div
                  key={env.key}
                  className="flex items-center justify-between p-3 bg-slc-dark rounded-lg"
                >
                  <code className="text-sm text-primary font-mono">
                    {env.key}
                  </code>
                  <span className="text-xs text-slc-muted">{env.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MailchimpCampaignStudio;
