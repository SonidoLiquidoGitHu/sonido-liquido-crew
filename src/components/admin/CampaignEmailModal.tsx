"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Send,
  Clock,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  Users,
  Tag,
} from "lucide-react";
import { type StyleSettings, defaultStyleSettings } from "@/lib/style-config";

// ===========================================
// TYPES
// ===========================================

interface CampaignEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    bannerImageUrl: string | null;
    smartLinkUrl: string | null;
    slug: string;
    campaignType: string;
    styleSettings?: Partial<StyleSettings> | null;
  };
}

type ModalTab = "send-now" | "schedule";

type ModalState = "idle" | "loading" | "sending" | "success" | "error";

// ===========================================
// FONT MAPPING (for email preview)
// ===========================================

const fontMap: Record<string, string> = {
  "oswald": "'Oswald', sans-serif",
  "bebas": "'Bebas Neue', sans-serif",
  "anton": "'Anton', sans-serif",
  "archivo-black": "'Archivo Black', sans-serif",
  "righteous": "'Righteous', sans-serif",
  "black-ops-one": "'Black Ops One', sans-serif",
  "bangers": "'Bangers', sans-serif",
  "permanent-marker": "'Permanent Marker', sans-serif",
  "inter": "'Inter', sans-serif",
  "montserrat": "'Montserrat', sans-serif",
  "poppins": "'Poppins', sans-serif",
  "raleway": "'Raleway', sans-serif",
  "space-grotesk": "'Space Grotesk', sans-serif",
  "dm-sans": "'DM Sans', sans-serif",
  "outfit": "'Outfit', sans-serif",
  "sora": "'Sora', sans-serif",
  "playfair": "'Playfair Display', serif",
  "libre-baskerville": "'Libre Baskerville', serif",
  "cormorant": "'Cormorant Garamond', serif",
  "cinzel": "'Cinzel', serif",
  "merriweather": "'Merriweather', serif",
  "roboto-mono": "'Roboto Mono', monospace",
  "jetbrains-mono": "'JetBrains Mono', monospace",
  "fira-code": "'Fira Code', monospace",
  "source-code": "'Source Code Pro', monospace",
  "dancing-script": "'Dancing Script', sans-serif",
  "pacifico": "'Pacifico', sans-serif",
  "caveat": "'Caveat', sans-serif",
};

const fontGoogleUrlMap: Record<string, string> = {
  "oswald": "Oswald:wght@400;500;600;700",
  "bebas": "Bebas+Neue",
  "anton": "Anton",
  "archivo-black": "Archivo+Black",
  "righteous": "Righteous",
  "black-ops-one": "Black+Ops+One",
  "bangers": "Bangers",
  "permanent-marker": "Permanent+Marker",
  "inter": "Inter:wght@400;500;600;700",
  "montserrat": "Montserrat:wght@400;500;600;700",
  "poppins": "Poppins:wght@400;500;600;700",
  "raleway": "Raleway:wght@400;500;600;700",
  "space-grotesk": "Space+Grotesk:wght@400;500;600;700",
  "dm-sans": "DM+Sans:wght@400;500;600;700",
  "outfit": "Outfit:wght@400;500;600;700",
  "sora": "Sora:wght@400;500;600;700",
  "playfair": "Playfair+Display:wght@400;500;600;700",
  "libre-baskerville": "Libre+Baskerville:wght@400;700",
  "cormorant": "Cormorant+Garamond:wght@400;500;600;700",
  "cinzel": "Cinzel:wght@400;500;600;700",
  "merriweather": "Merriweather:wght@400;700",
  "roboto-mono": "Roboto+Mono:wght@400;500;600;700",
  "jetbrains-mono": "JetBrains+Mono:wght@400;500;600;700",
  "fira-code": "Fira+Code:wght@400;500;600;700",
  "source-code": "Source+Code+Pro:wght@400;500;600;700",
  "dancing-script": "Dancing+Script:wght@400;500;600;700",
  "pacifico": "Pacifico",
  "caveat": "Caveat:wght@400;500;600;700",
};

const buttonRoundedMap: Record<string, string> = {
  "none": "0px",
  "sm": "4px",
  "md": "6px",
  "lg": "8px",
  "full": "50px",
};

// ===========================================
// HELPERS
// ===========================================

function getCtaTextForCampaignType(campaignType: string): string {
  switch (campaignType.toLowerCase()) {
    case "presave":
      return "PRE-SAVE AHORA";
    case "smartlink":
      return "ESCUCHAR AHORA";
    case "download":
      return "DESCARGAR";
    case "contest":
      return "PARTICIPAR";
    case "hyperfollow":
      return "SEGUIR";
    default:
      return "ESCUCHAR AHORA";
  }
}

function generateDefaultBody(campaign: CampaignEmailModalProps["campaign"]): string {
  const description = campaign.description
    ? campaign.description
    : "Nuevo contenido disponible ahora en Sonido Líquido.";

  return `¡Hola!

Tenemos algo especial para ti.

**${campaign.title}**

${description}

No te lo pierdas — haz clic abajo para ver más.

---

Sonido Líquido Crew
Hip Hop México desde 1999`;
}

function buildGoogleFontsLink(titleFont?: string, bodyFont?: string): string {
  const families: string[] = [];
  const seen = new Set<string>();
  for (const font of [titleFont, bodyFont]) {
    if (font && fontGoogleUrlMap[font] && !seen.has(font)) {
      families.push(`family=${fontGoogleUrlMap[font]}`);
      seen.add(font);
    }
  }
  if (families.length === 0) return "";
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

function generatePreviewHTML(data: {
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  coverImageUrl?: string;
  styleSettings?: Partial<StyleSettings> | null;
}): string {
  const { title, body, ctaText, ctaUrl, coverImageUrl, styleSettings } = data;

  // Merge with defaults
  const s = { ...defaultStyleSettings, ...styleSettings };

  // Resolve colors
  const primaryColor = s.primaryColor || "#f97316";
  const secondaryColor = s.secondaryColor || "#ea580c";
  const accentColor = s.accentColor || "#22c55e";
  const textColor = s.textColor || "#ffffff";
  const darkMode = s.darkMode !== false;

  // Background colors based on darkMode
  const bgColor = darkMode ? "#0a0a0a" : "#f5f5f5";
  const cardBgColor = darkMode ? "#1a1a1a" : "#ffffff";
  const footerBgColor = darkMode ? "#0a0a0a" : "#eeeeee";
  const bodyTextColor = darkMode ? "#cccccc" : "#555555";
  const footerTextColor = darkMode ? "#666666" : "#999999";
  const footerSubTextColor = darkMode ? "#444444" : "#aaaaaa";
  const headerTextColor = "#ffffff";

  const titleFontFamily = fontMap[s.titleFont] || "'Oswald', sans-serif";
  const bodyFontFamily = fontMap[s.bodyFont] || "'Inter', sans-serif";
  const googleFontUrl = buildGoogleFontsLink(s.titleFont, s.bodyFont);

  // Button styles
  const buttonRadius = buttonRoundedMap[s.buttonRounded] || "8px";

  let buttonInlineStyle = "";
  switch (s.buttonStyle) {
    case "solid":
      buttonInlineStyle = `background: ${primaryColor}; color: #ffffff; border: none;`;
      break;
    case "gradient":
      buttonInlineStyle = `background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: #ffffff; border: none;`;
      break;
    case "outline":
      buttonInlineStyle = `background: transparent; border: 2px solid ${primaryColor}; color: ${primaryColor};`;
      break;
    case "glass":
      buttonInlineStyle = `background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #ffffff;`;
      break;
    default:
      buttonInlineStyle = `background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: #ffffff; border: none;`;
  }

  const coverShadowColor = darkMode
    ? `rgba(${parseInt(primaryColor.slice(1,3),16)}, ${parseInt(primaryColor.slice(3,5),16)}, ${parseInt(primaryColor.slice(5,7),16)}, 0.3)`
    : `rgba(0, 0, 0, 0.1)`;

  const formattedBody = body
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/\[(.*?)\]\((.*?)\)/g, `<a href="$2" style="color: ${primaryColor}; text-decoration: underline;">$1</a>`)
    .replace(/^### (.*?)$/gm, `<h3 style="color: ${primaryColor}; margin: 20px 0 10px;">$1</h3>`)
    .replace(/^# (.*?)$/gm, `<h1 style="color: ${primaryColor}; margin: 20px 0 10px;">$1</h1>`);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${googleFontUrl ? `<link href="${googleFontUrl}" rel="stylesheet">` : ""}
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: ${bodyFontFamily.replace(/'/g, "")} !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: ${bodyFontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${cardBgColor}; border-radius: 16px; overflow: hidden; max-width: 100%;">
          <tr>
            <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);">
              <h1 style="margin: 0; color: ${headerTextColor}; font-size: 24px; font-family: ${titleFontFamily}, sans-serif;">SONIDO LIQUIDO CREW</h1>
            </td>
          </tr>
          ${coverImageUrl ? `
          <tr>
            <td style="padding: 30px 40px 0;">
              <img src="${coverImageUrl}" alt="${title}" style="width: 100%; max-width: 500px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px ${coverShadowColor};">
            </td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 30px 40px 10px; text-align: center;">
              <h1 style="margin: 0; color: ${primaryColor}; font-size: 28px; font-weight: bold; font-family: ${titleFontFamily}, sans-serif;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 40px 30px; color: ${textColor};">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${bodyTextColor}; font-family: ${bodyFontFamily}, sans-serif;">
                ${formattedBody}
              </p>
            </td>
          </tr>
          ${ctaText && ctaUrl ? `
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <a href="${ctaUrl}" style="display: inline-block; padding: 16px 40px; ${buttonInlineStyle} text-decoration: none; font-weight: bold; font-size: 18px; border-radius: ${buttonRadius}; text-transform: uppercase; letter-spacing: 1px; font-family: ${titleFontFamily}, sans-serif;">
                ${ctaText}
              </a>
            </td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 30px 40px; background-color: ${footerBgColor}; text-align: center;">
              <p style="margin: 0 0 15px; color: ${footerTextColor}; font-size: 12px;">
                Sonido Liquido Crew - Hip Hop Mexico desde 1999
              </p>
              <p style="margin: 0; color: ${footerSubTextColor}; font-size: 11px;">
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
// TAG TYPE
// ===========================================

interface MailchimpTag {
  id: number;
  name: string;
  count: number;
}

// ===========================================
// COMPONENT
// ===========================================

export function CampaignEmailModal({
  isOpen,
  onClose,
  campaign,
}: CampaignEmailModalProps) {
  // Configuration state
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<ModalTab>("send-now");

  // Form state
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [body, setBody] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [includeCoverImage, setIncludeCoverImage] = useState(true);
  const [scheduleTime, setScheduleTime] = useState("");

  // Audience / Tags state
  const [availableTags, setAvailableTags] = useState<MailchimpTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  // Action state
  const [modalState, setModalState] = useState<ModalState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mailchimpCampaignUrl, setMailchimpCampaignUrl] = useState<string | null>(null);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);

  // Resolve styleSettings
  const resolvedStyleSettings = campaign.styleSettings || null;

  // Pre-fill form when campaign changes or modal opens
  useEffect(() => {
    if (isOpen && campaign) {
      setSubject(`🎵 ${campaign.title} — Nuevo en Sonido Líquido`);
      setPreviewText(
        campaign.description
          ? campaign.description.substring(0, 100)
          : ""
      );
      setBody(generateDefaultBody(campaign));
      setCtaText(getCtaTextForCampaignType(campaign.campaignType));
      setCtaUrl(`https://sonidoliquido.com/c/${campaign.slug}`);
      setIncludeCoverImage(!!campaign.coverImageUrl);
      setActiveTab("send-now");
      setModalState("idle");
      setErrorMessage(null);
      setSuccessMessage(null);
      setMailchimpCampaignUrl(null);
      setShowPreview(false);
      setScheduleTime("");
      setSelectedTags([]);

      // Get a default schedule time (tomorrow at 10:00 AM)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setScheduleTime(tomorrow.toISOString().slice(0, 16));
    }
  }, [isOpen, campaign]);

  // Fetch tags when modal opens
  const fetchTags = useCallback(async () => {
    if (!isOpen) return;
    setTagsLoading(true);
    try {
      const res = await fetch("/api/admin/mailchimp?action=audience");
      const data = await res.json();
      if (data.success && data.data?.tags) {
        setAvailableTags(data.data.tags);
      }
    } catch {
      // Non-critical — tags are optional
      console.warn("[CampaignEmailModal] Failed to fetch tags");
    } finally {
      setTagsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen, fetchTags]);

  // Check Mailchimp configuration on open
  const checkConfig = useCallback(async () => {
    if (!isOpen) return;
    setModalState("loading");
    try {
      const res = await fetch("/api/admin/mailchimp?action=config");
      const data = await res.json();
      if (data.success && data.data?.configured) {
        setIsConfigured(true);
        setConfigError(null);
      } else {
        setIsConfigured(false);
        setConfigError(data.error || "Mailchimp no está configurado. Ve a Email Studio para configurar tus credenciales.");
      }
    } catch (err) {
      setIsConfigured(false);
      setConfigError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setModalState("idle");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      checkConfig();
    }
  }, [isOpen, checkConfig]);

  // Toggle tag selection
  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  // Handle send / schedule campaign
  const handleSendCampaign = async (isDraft: boolean = false) => {
    setModalState("sending");
    setErrorMessage(null);
    setSuccessMessage(null);
    setMailchimpCampaignUrl(null);

    try {
      const payload: Record<string, unknown> = {
        action: isDraft ? "create-draft" : "create-campaign",
        subject,
        previewText,
        title: subject,
        body,
        ctaText: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
        coverImageUrl:
          includeCoverImage && campaign.coverImageUrl
            ? campaign.coverImageUrl
            : undefined,
        styleSettings: resolvedStyleSettings || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      };

      // If scheduling, add the scheduleTime
      if (!isDraft && activeTab === "schedule" && scheduleTime) {
        // Convert local datetime to ISO string
        const scheduledDate = new Date(scheduleTime);
        payload.scheduleTime = scheduledDate.toISOString();
      }

      const res = await fetch("/api/admin/mailchimp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setModalState("success");
        if (isDraft) {
          setSuccessMessage("Borrador guardado exitosamente en Mailchimp.");
        } else if (activeTab === "schedule" && scheduleTime) {
          const scheduledDate = new Date(scheduleTime);
          setSuccessMessage(
            `Campaña programada para ${scheduledDate.toLocaleString("es-MX", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}.`
          );
        } else {
          setSuccessMessage("Campaña enviada exitosamente.");
        }
        // Set Mailchimp dashboard URL if available
        if (data.data?.campaignUrl) {
          setMailchimpCampaignUrl(data.data.campaignUrl);
        } else if (data.data?.webId) {
          // Construct Mailchimp campaign URL from web_id
          setMailchimpCampaignUrl(
            `https://admin.mailchimp.com/campaigns/edit?id=${data.data.webId}`
          );
        }
      } else {
        setModalState("error");
        setErrorMessage(
          data.error || "Error al crear la campaña. Intenta de nuevo."
        );
      }
    } catch (err) {
      setModalState("error");
      setErrorMessage("Error de conexión. Verifica tu red e intenta de nuevo.");
    }
  };

  // Handle close with escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && modalState !== "sending") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, modalState, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Don't render anything if not open
  if (!isOpen) return null;

  // Get the effective cover image URL for preview
  const effectiveCoverImageUrl =
    includeCoverImage && campaign.coverImageUrl ? campaign.coverImageUrl : undefined;

  // Resolve style settings for the in-modal preview card
  const s = { ...defaultStyleSettings, ...resolvedStyleSettings };
  const primaryColor = s.primaryColor || "#f97316";
  const secondaryColor = s.secondaryColor || "#ea580c";
  const darkMode = s.darkMode !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => {
          if (modalState !== "sending") onClose();
        }}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full h-full overflow-y-auto flex items-start justify-center p-4 sm:p-6 lg:p-8">
        <div
          className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-4xl my-4 sm:my-8 shadow-2xl animate-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ==================== HEADER ==================== */}
          <div className="flex items-center justify-between p-6 border-b border-slc-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-oswald text-xl uppercase">
                  Enviar Campaña de Email
                </h2>
                <p className="text-sm text-slc-muted">
                  Vía Mailchimp
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={modalState === "sending"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slc-muted hover:text-white hover:bg-slc-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ==================== LOADING STATE ==================== */}
          {modalState === "loading" && (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-slc-muted">
                Verificando configuración de Mailchimp...
              </p>
            </div>
          )}

          {/* ==================== NOT CONFIGURED STATE ==================== */}
          {modalState !== "loading" && isConfigured === false && (
            <div className="p-6 space-y-4">
              <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-oswald text-lg uppercase text-yellow-500 mb-2">
                    Mailchimp No Configurado
                  </h3>
                  <p className="text-sm text-slc-muted mb-4">
                    {configError ||
                      "Necesitas configurar tus credenciales de Mailchimp antes de poder enviar campañas de email."}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Navigate to Email Studio settings tab
                        window.location.hash = "#email-studio-settings";
                        onClose();
                      }}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Ir a Email Studio
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={checkConfig}
                    >
                      Reintentar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SUCCESS STATE ==================== */}
          {modalState === "success" && (
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-oswald text-2xl uppercase mb-2">
                  ¡Éxito!
                </h3>
                <p className="text-slc-muted max-w-md mb-6">
                  {successMessage}
                </p>
                <div className="flex items-center gap-3">
                  {mailchimpCampaignUrl && (
                    <a
                      href={mailchimpCampaignUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Ver en Mailchimp
                      </Button>
                    </a>
                  )}
                  <Button onClick={onClose} size="sm">
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== MAIN FORM ==================== */}
          {modalState !== "loading" && isConfigured === true && modalState !== "success" && (
            <div className="flex flex-col lg:flex-row">
              {/* ---- Left: Form ---- */}
              <div className="flex-1 p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-slc-border overflow-y-auto max-h-[70vh]">
                {/* Error Banner */}
                {modalState === "error" && errorMessage && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-500">{errorMessage}</p>
                      <button
                        onClick={() => {
                          setModalState("idle");
                          setErrorMessage(null);
                        }}
                        className="text-xs text-red-400 hover:underline mt-1"
                      >
                        Intentar de nuevo
                      </button>
                    </div>
                  </div>
                )}

                {/* Campaign Info Banner */}
                <div className="p-4 bg-slc-card rounded-lg border border-slc-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <LinkIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {campaign.title}
                    </p>
                    <p className="text-xs text-slc-muted">
                      {campaign.campaignType.toUpperCase()} · /c/{campaign.slug}
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-slc-card rounded-lg border border-slc-border">
                  <button
                    onClick={() => setActiveTab("send-now")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === "send-now"
                        ? "bg-primary text-white"
                        : "text-slc-muted hover:text-white hover:bg-slc-dark"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    Enviar ahora
                  </button>
                  <button
                    onClick={() => setActiveTab("schedule")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === "schedule"
                        ? "bg-primary text-white"
                        : "text-slc-muted hover:text-white hover:bg-slc-dark"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Programar
                  </button>
                </div>

                {/* Schedule Time (only if schedule tab) */}
                {activeTab === "schedule" && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                    <label className="block text-sm font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Fecha y Hora de Envío
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none text-white"
                    />
                    {scheduleTime && (
                      <p className="text-xs text-slc-muted">
                        Se enviará el{" "}
                        {new Date(scheduleTime).toLocaleString("es-MX", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Subject Line */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Asunto del Email *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="El asunto del email"
                    className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                  <p className="text-xs text-slc-muted mt-1">
                    {subject.length}/100 caracteres recomendados
                  </p>
                </div>

                {/* Preview Text */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Texto de Preview
                  </label>
                  <input
                    type="text"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="Texto que aparece junto al asunto en la bandeja de entrada"
                    className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                  <p className="text-xs text-slc-muted mt-1">
                    {previewText.length}/100 caracteres · Se muestra al lado del asunto
                  </p>
                </div>

                {/* Email Body */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Contenido del Email *
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Escribe el contenido del email. Usa **negrita**, [enlace](url), y ### para headings."
                    rows={12}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none resize-y min-h-[200px]"
                  />
                  <p className="text-xs text-slc-muted mt-1">
                    Formato: **negrita**, [texto](url), ### heading
                  </p>
                </div>

                {/* CTA Button Text */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5" />
                    Texto del Botón CTA
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Ej: ESCUCHAR AHORA"
                    className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none uppercase tracking-wide"
                  />
                  <p className="text-xs text-slc-muted mt-1">
                    El botón CTA enlaza a: {ctaUrl || "—"}
                  </p>
                </div>

                {/* CTA URL (editable) */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5" />
                    URL del Botón CTA
                  </label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://sonidoliquido.com/c/..."
                    className="w-full px-4 py-2.5 bg-slc-dark border border-slc-border rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Audience / Tags Selector */}
                <div className="p-4 bg-slc-card rounded-lg border border-slc-border space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Audiencia</p>
                      <p className="text-xs text-slc-muted">
                        Selecciona qué suscriptores recibirán este email
                      </p>
                    </div>
                  </div>

                  {tagsLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-xs text-slc-muted">Cargando tags...</span>
                    </div>
                  ) : availableTags.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {availableTags.map((tag) => (
                        <label
                          key={tag.id}
                          className="flex items-center gap-2.5 p-2 rounded-md hover:bg-slc-dark/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag.name)}
                            onChange={() => toggleTag(tag.name)}
                            className="w-4 h-4 rounded border-slc-border accent-primary"
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Tag className="w-3 h-3 text-slc-muted flex-shrink-0" />
                            <span className="text-sm truncate">{tag.name}</span>
                          </div>
                          <span className="text-xs text-slc-muted flex-shrink-0">
                            {tag.count}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slc-muted py-1">
                      No se encontraron tags. Se enviará a todos los suscriptores.
                    </p>
                  )}

                  <p className="text-xs text-slc-muted">
                    {selectedTags.length > 0
                      ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} seleccionado${selectedTags.length > 1 ? "s" : ""} — los suscriptores con cualquiera de estos tags recibirán el email`
                      : "Todos los suscriptores recibirán este email"
                    }
                  </p>
                </div>

                {/* Cover Image Toggle */}
                <div className="flex items-center justify-between p-4 bg-slc-card rounded-lg border border-slc-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Incluir Imagen de Portada</p>
                      <p className="text-xs text-slc-muted">
                        {campaign.coverImageUrl
                          ? includeCoverImage
                            ? "La portada del campaign se incluirá en el email"
                            : "La portada no se incluirá"
                          : "No hay imagen de portada disponible para esta campaña"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIncludeCoverImage(!includeCoverImage)}
                    disabled={!campaign.coverImageUrl}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      includeCoverImage && campaign.coverImageUrl
                        ? "bg-primary"
                        : "bg-slc-border"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    role="switch"
                    aria-checked={includeCoverImage}
                    aria-label="Incluir imagen de portada"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        includeCoverImage && campaign.coverImageUrl
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Cover Image Preview */}
                {includeCoverImage && campaign.coverImageUrl && (
                  <div className="rounded-lg overflow-hidden border border-slc-border">
                    <img
                      src={campaign.coverImageUrl}
                      alt={campaign.title}
                      className="w-full max-h-40 object-cover"
                    />
                  </div>
                )}
              </div>

              {/* ---- Right: Preview ---- */}
              <div className="lg:w-[380px] flex-shrink-0 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-oswald text-sm uppercase flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Vista Previa
                  </h3>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showPreview ? "Ocultar" : "Ver completo"}
                  </button>
                </div>

                {/* Preview Card */}
                <div className="flex-1 bg-slc-card rounded-xl border border-slc-border overflow-hidden">
                  {/* Header Bar — uses styleSettings */}
                  <div
                    className="px-5 py-3 text-center"
                    style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                  >
                    <p className="text-white text-xs font-bold tracking-wider uppercase">
                      Sonido Líquido Crew
                    </p>
                  </div>

                  {/* Cover Image */}
                  {effectiveCoverImageUrl && (
                    <div className="px-4 pt-4">
                      <img
                        src={effectiveCoverImageUrl}
                        alt={campaign.title}
                        className="w-full rounded-md"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div
                    className="p-5 space-y-3"
                    style={{ backgroundColor: darkMode ? "#1a1a1a" : "#ffffff" }}
                  >
                    <h4
                      className="text-lg text-center leading-tight"
                      style={{
                        color: primaryColor,
                        fontFamily: fontMap[s.titleFont] || "'Oswald', sans-serif",
                      }}
                    >
                      {subject.replace("🎵 ", "") || "Sin asunto"}
                    </h4>
                    <div
                      className="text-xs leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap"
                      style={{
                        color: darkMode ? "#cccccc" : "#555555",
                        fontFamily: fontMap[s.bodyFont] || "'Inter', sans-serif",
                      }}
                    >
                      {body
                        .replace(/\*\*(.*?)\*\*/g, "$1")
                        .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
                        .replace(/^### (.*?)$/gm, "$1")
                        .replace(/^# (.*?)$/gm, "$1")}
                    </div>

                    {/* CTA Button Preview — uses styleSettings */}
                    {ctaText && (
                      <div className="text-center pt-2">
                        <span
                          className="inline-block px-6 py-2.5 text-white text-xs font-bold uppercase tracking-wide"
                          style={{
                            background: s.buttonStyle === "solid"
                              ? primaryColor
                              : s.buttonStyle === "gradient"
                                ? `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
                                : s.buttonStyle === "outline"
                                  ? "transparent"
                                  : "rgba(255,255,255,0.1)",
                            border: s.buttonStyle === "outline"
                              ? `2px solid ${primaryColor}`
                              : s.buttonStyle === "glass"
                                ? "1px solid rgba(255,255,255,0.2)"
                                : "none",
                            color: s.buttonStyle === "outline" ? primaryColor : "#ffffff",
                            borderRadius: buttonRoundedMap[s.buttonRounded] || "8px",
                          }}
                        >
                          {ctaText}
                        </span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="pt-4 mt-4 border-t border-slc-border text-center">
                      <p className="text-[10px] text-slc-muted">
                        Sonido Líquido Crew · Hip Hop México desde 1999
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview in new window button */}
                <button
                  onClick={() => {
                    const html = generatePreviewHTML({
                      title: subject.replace("🎵 ", ""),
                      body,
                      ctaText: ctaText || undefined,
                      ctaUrl: ctaUrl || undefined,
                      coverImageUrl: effectiveCoverImageUrl,
                      styleSettings: resolvedStyleSettings,
                    });
                    const blob = new Blob([html], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                  }}
                  className="mt-3 text-xs text-primary hover:underline flex items-center gap-1 justify-center"
                >
                  <Eye className="w-3 h-3" />
                  Abrir preview en ventana nueva
                </button>
              </div>
            </div>
          )}

          {/* ==================== FOOTER / ACTIONS ==================== */}
          {modalState !== "loading" && isConfigured === true && modalState !== "success" && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-6 border-t border-slc-border">
              <div className="flex items-center gap-2 text-xs text-slc-muted">
                <Mail className="w-3.5 h-3.5" />
                <span>
                  {activeTab === "schedule" && scheduleTime
                    ? `Se programará para ${new Date(scheduleTime).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : selectedTags.length > 0
                      ? `Se enviará a suscriptores con ${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} seleccionado${selectedTags.length > 1 ? "s" : ""}`
                      : "Se enviará inmediatamente a todos los suscriptores"}
                </span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => handleSendCampaign(true)}
                  disabled={
                    modalState === "sending" ||
                    !subject.trim() ||
                    !body.trim()
                  }
                  className="flex-1 sm:flex-none"
                >
                  {modalState === "sending" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  Guardar borrador
                </Button>
                <Button
                  onClick={() => handleSendCampaign(false)}
                  disabled={
                    modalState === "sending" ||
                    !subject.trim() ||
                    !body.trim() ||
                    (activeTab === "schedule" && !scheduleTime)
                  }
                  className="flex-1 sm:flex-none"
                >
                  {modalState === "sending" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-1" />
                  )}
                  {activeTab === "schedule" ? "Programar" : "Enviar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampaignEmailModal;
