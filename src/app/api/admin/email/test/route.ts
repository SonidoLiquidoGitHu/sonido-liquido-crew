import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// Email template types
type EmailTemplate = "approval_message" | "approval_photo" | "newsletter" | "welcome" | "custom";

interface TestEmailRequest {
  recipients: string[];
  template: EmailTemplate;
  subject?: string;
  customContent?: string;
  includeReward?: boolean;
  rewardUrl?: string;
  rewardFileName?: string;
}

interface EmailLog {
  id: string;
  recipient: string;
  template: string;
  subject: string;
  status: "sent" | "failed" | "pending";
  sentAt: string;
  error?: string;
}

// Store test email logs in memory (in production, use database)
const testEmailLogs: EmailLog[] = [];

// Generate email HTML based on template
function generateEmailHtml(
  template: EmailTemplate,
  options: {
    recipientName?: string;
    subject?: string;
    customContent?: string;
    includeReward?: boolean;
    rewardUrl?: string;
    rewardFileName?: string;
  } = {}
): { html: string; subject: string } {
  const { recipientName = "Usuario de Prueba", customContent, includeReward, rewardUrl, rewardFileName } = options;

  let subject = options.subject || "";
  let contentSection = "";
  let rewardSection = "";

  // Reward section
  if (includeReward && rewardUrl) {
    rewardSection = `
      <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #1a1a1a, #2a2a2a); border-radius: 12px; border: 1px solid #f97316;">
        <h3 style="color: #f97316; margin: 0 0 10px 0; font-size: 18px;">🎁 Regalo Especial</h3>
        <p style="color: #a1a1a1; margin: 0 0 15px 0; font-size: 14px;">Como agradecimiento, aquí tienes una descarga exclusiva:</p>
        <a href="${rewardUrl}"
           style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 14px;">
          ⬇️ Descargar ${rewardFileName || "archivo"}
        </a>
      </div>
    `;
  }

  switch (template) {
    case "approval_message":
      subject = subject || "¡Tu mensaje ha sido publicado en Sonido Líquido!";
      contentSection = `
        <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Gracias por formar parte de nuestra comunidad. Tu mensaje ya está visible en el Fan Wall.
        </p>
        <div style="margin: 20px 0; padding: 15px; background: #0a0a0a; border-radius: 8px; border-left: 3px solid #f97316;">
          <p style="color: #e5e5e5; font-size: 14px; margin: 0; font-style: italic;">"Este es un mensaje de prueba para verificar la entrega de emails."</p>
        </div>
        <p style="color: #a1a1a1; font-size: 14px; margin: 0;">
          Tu mensaje ya está visible para toda la comunidad.
        </p>
      `;
      break;

    case "approval_photo":
      subject = subject || "¡Tu foto ha sido publicada en Sonido Líquido!";
      contentSection = `
        <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Gracias por compartir tu recuerdo con nosotros. Tu foto ya está en la galería.
        </p>
        <div style="margin: 20px 0; text-align: center;">
          <p style="color: #ec4899; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">📸 Tu foto publicada:</p>
          <div style="width: 200px; height: 200px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a, #2a2a2a); border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2px solid #333;">
            <span style="color: #666; font-size: 48px;">📷</span>
          </div>
          <p style="color: #a1a1a1; font-size: 14px; margin-top: 10px; font-style: italic;">"Foto de prueba"</p>
        </div>
        <p style="color: #a1a1a1; font-size: 14px; margin: 0;">
          Tu foto ya está visible para toda la comunidad.
        </p>
      `;
      break;

    case "newsletter":
      subject = subject || "🎵 Novedades de Sonido Líquido Crew";
      contentSection = `
        <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Estas son las últimas novedades de Sonido Líquido Crew:
        </p>

        <div style="margin: 20px 0; padding: 20px; background: #1a1a1a; border-radius: 12px; border: 1px solid #333;">
          <h3 style="color: #f97316; margin: 0 0 10px 0;">🔥 Nuevo Lanzamiento</h3>
          <p style="color: #e5e5e5; margin: 0 0 10px 0;">Ejemplo de Single - Artista</p>
          <a href="https://sonidoliquido.com/discografia" style="color: #f97316; text-decoration: none; font-size: 14px;">Escuchar ahora →</a>
        </div>

        <div style="margin: 20px 0; padding: 20px; background: #1a1a1a; border-radius: 12px; border: 1px solid #333;">
          <h3 style="color: #f97316; margin: 0 0 10px 0;">📅 Próximo Evento</h3>
          <p style="color: #e5e5e5; margin: 0 0 10px 0;">Concierto de Ejemplo - CDMX</p>
          <a href="https://sonidoliquido.com/eventos" style="color: #f97316; text-decoration: none; font-size: 14px;">Ver detalles →</a>
        </div>
      `;
      break;

    case "welcome":
      subject = subject || "¡Bienvenido a Sonido Líquido Crew! 🎤";
      contentSection = `
        <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          ¡Gracias por unirte a la familia Sonido Líquido! Ahora recibirás las últimas noticias, lanzamientos y eventos exclusivos.
        </p>

        <div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 12px; text-align: center;">
          <h3 style="color: white; margin: 0 0 10px 0;">Hip Hop México desde 1999</h3>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">Más de 25 años representando la cultura</p>
        </div>

        <p style="color: #a1a1a1; font-size: 14px; margin: 20px 0;">
          Explora nuestra música, conoce a los artistas y forma parte de la comunidad.
        </p>
      `;
      break;

    case "custom":
      subject = subject || "Mensaje de Sonido Líquido Crew";
      contentSection = `
        <div style="color: #e5e5e5; font-size: 16px; line-height: 1.6;">
          ${customContent || "<p>Este es un email de prueba personalizado.</p>"}
        </div>
      `;
      break;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f97316; font-size: 28px; margin: 0; letter-spacing: 2px;">SONIDO LÍQUIDO</h1>
          <p style="color: #666; font-size: 12px; margin: 5px 0 0 0; letter-spacing: 1px;">HIP HOP MÉXICO</p>
        </div>

        <!-- Test Badge -->
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; padding: 6px 16px; background: #fbbf24; color: #000; font-size: 11px; font-weight: bold; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
            🧪 Email de Prueba
          </span>
        </div>

        <!-- Main Content -->
        <div style="background: #1a1a1a; border-radius: 16px; padding: 30px; border: 1px solid #333;">
          <h2 style="color: white; margin: 0 0 20px 0; font-size: 24px;">¡Hola ${recipientName}! 👋</h2>

          ${contentSection}

          ${rewardSection}

          <!-- CTA -->
          <div style="margin-top: 30px; text-align: center;">
            <a href="https://sonidoliquido.com"
               style="display: inline-block; padding: 14px 32px; background: white; color: black; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 14px;">
              Visitar sitio →
            </a>
          </div>
        </div>

        <!-- Debug Info -->
        <div style="margin-top: 20px; padding: 15px; background: #1a1a1a; border-radius: 8px; border: 1px dashed #333;">
          <p style="color: #666; font-size: 11px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">Información de Prueba</p>
          <p style="color: #888; font-size: 12px; margin: 0;">
            Template: <code style="color: #f97316;">${template}</code><br>
            Enviado: <code style="color: #f97316;">${new Date().toISOString()}</code><br>
            Servidor: <code style="color: #f97316;">sonidoliquido.com</code>
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Sonido Líquido Crew. Hip Hop México desde 1999.
          </p>
          <div style="margin-top: 15px;">
            <a href="https://instagram.com/sonidoliquidocrew" style="color: #f97316; text-decoration: none; margin: 0 10px; font-size: 12px;">Instagram</a>
            <a href="https://youtube.com/@sonidoliquidocrew" style="color: #f97316; text-decoration: none; margin: 0 10px; font-size: 12px;">YouTube</a>
            <a href="https://open.spotify.com/artist/sonidoliquido" style="color: #f97316; text-decoration: none; margin: 0 10px; font-size: 12px;">Spotify</a>
          </div>
          <p style="color: #444; font-size: 10px; margin-top: 15px;">
            Este es un email de prueba. Si lo recibiste por error, puedes ignorarlo.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { html, subject };
}

// Send email using available provider
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string; provider?: string }> {
  // Try Resend first
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Sonido Líquido <no-reply@sonidoliquido.com>",
          to: [to],
          subject,
          html,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, provider: "resend" };
      } else {
        return { success: false, error: data.message || "Resend error", provider: "resend" };
      }
    } catch (error) {
      return { success: false, error: String(error), provider: "resend" };
    }
  }

  // Try Mailchimp Transactional (Mandrill)
  const mandrillKey = process.env.MANDRILL_API_KEY;
  if (mandrillKey) {
    try {
      const response = await fetch("https://mandrillapp.com/api/1.0/messages/send.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: mandrillKey,
          message: {
            html,
            subject,
            from_email: process.env.EMAIL_FROM || "no-reply@sonidoliquido.com",
            from_name: "Sonido Líquido",
            to: [{ email: to, type: "to" }],
            tags: ["test-email"],
          },
        }),
      });

      const data = await response.json();

      if (Array.isArray(data) && data[0]?.status === "sent") {
        return { success: true, provider: "mandrill" };
      } else {
        return { success: false, error: data[0]?.reject_reason || "Mandrill error", provider: "mandrill" };
      }
    } catch (error) {
      return { success: false, error: String(error), provider: "mandrill" };
    }
  }

  // Try SendGrid
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sendgridKey}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.EMAIL_FROM || "no-reply@sonidoliquido.com", name: "Sonido Líquido" },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      if (response.ok || response.status === 202) {
        return { success: true, provider: "sendgrid" };
      } else {
        const data = await response.json();
        return { success: false, error: JSON.stringify(data.errors), provider: "sendgrid" };
      }
    } catch (error) {
      return { success: false, error: String(error), provider: "sendgrid" };
    }
  }

  return {
    success: false,
    error: "No email provider configured. Set RESEND_API_KEY, MANDRILL_API_KEY, or SENDGRID_API_KEY",
  };
}

// GET - Get test email logs
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      logs: testEmailLogs.slice(-50).reverse(), // Last 50 logs
      providers: {
        resend: !!process.env.RESEND_API_KEY,
        mandrill: !!process.env.MANDRILL_API_KEY,
        sendgrid: !!process.env.SENDGRID_API_KEY,
      },
    },
  });
}

// POST - Send test emails
export async function POST(request: NextRequest) {
  try {
    const body: TestEmailRequest = await request.json();
    const { recipients, template, subject, customContent, includeReward, rewardUrl, rewardFileName } = body;

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Al menos un destinatario es requerido" },
        { status: 400 }
      );
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { success: false, error: `Emails inválidos: ${invalidEmails.join(", ")}` },
        { status: 400 }
      );
    }

    // Limit to 5 recipients for testing
    if (recipients.length > 5) {
      return NextResponse.json(
        { success: false, error: "Máximo 5 destinatarios para pruebas" },
        { status: 400 }
      );
    }

    // Generate email content
    const { html, subject: generatedSubject } = generateEmailHtml(template, {
      subject,
      customContent,
      includeReward,
      rewardUrl,
      rewardFileName,
    });

    const finalSubject = subject || generatedSubject;

    // Send to each recipient
    const results: EmailLog[] = [];

    for (const recipient of recipients) {
      const logId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const result = await sendEmail(recipient, finalSubject, html);

      const log: EmailLog = {
        id: logId,
        recipient,
        template,
        subject: finalSubject,
        status: result.success ? "sent" : "failed",
        sentAt: new Date().toISOString(),
        error: result.error,
      };

      results.push(log);
      testEmailLogs.push(log);

      console.log(
        `[Test Email] ${result.success ? "✓" : "✗"} ${recipient} - ${template} - ${result.provider || "no provider"}`
      );
    }

    const successCount = results.filter((r) => r.status === "sent").length;
    const failCount = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      success: successCount > 0,
      data: {
        results,
        summary: {
          total: recipients.length,
          sent: successCount,
          failed: failCount,
        },
      },
      message:
        failCount === 0
          ? `${successCount} email(s) enviado(s) correctamente`
          : `${successCount} enviado(s), ${failCount} fallido(s)`,
    });
  } catch (error) {
    console.error("[Test Email] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al enviar emails de prueba" },
      { status: 500 }
    );
  }
}
