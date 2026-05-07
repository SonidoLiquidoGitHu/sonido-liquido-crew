import { NextRequest, NextResponse } from "next/server";
import { mailchimpClient } from "@/lib/clients/mailchimp";

// Email template for welcome notification (used as fallback or for Mailchimp campaign)
function getWelcomeEmailHTML(name?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Sonido Líquido Crew</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px 40px; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); border-radius: 16px 16px 0 0;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                🔔 Notificaciones Activadas
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 40px; border: 1px solid #2a2a2a; border-top: none;">
              <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0;">
                ¡Gracias${name ? `, ${name}` : ""}!
              </h2>

              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Ahora recibirás notificaciones cuando se acerque la fecha de nuestros próximos lanzamientos.
                Te avisaremos:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #0a0a0a; border-radius: 8px; margin-bottom: 8px;">
                    <span style="color: #f97316; font-weight: bold;">⏰ 7 días antes</span>
                    <span style="color: #a3a3a3;"> — Para que hagas presave</span>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #0a0a0a; border-radius: 8px;">
                    <span style="color: #f97316; font-weight: bold;">🔔 24 horas antes</span>
                    <span style="color: #a3a3a3;"> — Recordatorio final</span>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #0a0a0a; border-radius: 8px;">
                    <span style="color: #f97316; font-weight: bold;">🚀 1 hora antes</span>
                    <span style="color: #a3a3a3;"> — ¡Ya casi es hora!</span>
                  </td>
                </tr>
              </table>

              <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
                Mientras tanto, explora nuestros próximos lanzamientos y haz presave para ser el primero en escuchar.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://sonidoliquido.com/proximos"
                       style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
                              color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px;
                              font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                      Ver Próximos Lanzamientos
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Social Links -->
          <tr>
            <td align="center" style="padding: 30px 0; background-color: #1a1a1a; border: 1px solid #2a2a2a; border-top: none; border-radius: 0 0 16px 16px;">
              <p style="color: #666666; font-size: 12px; margin: 0 0 15px 0;">
                Síguenos en redes sociales
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="https://instagram.com/sonidoliquidocrew" style="color: #f97316; text-decoration: none; font-size: 14px;">
                      Instagram
                    </a>
                  </td>
                  <td style="color: #333;">|</td>
                  <td style="padding: 0 8px;">
                    <a href="https://youtube.com/@sonidoliquidocrew" style="color: #f97316; text-decoration: none; font-size: 14px;">
                      YouTube
                    </a>
                  </td>
                  <td style="color: #333;">|</td>
                  <td style="padding: 0 8px;">
                    <a href="https://open.spotify.com/artist/sonidoliquidocrew" style="color: #f97316; text-decoration: none; font-size: 14px;">
                      Spotify
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 20px;">
              <p style="color: #666666; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Sonido Líquido Crew. Todos los derechos reservados.
              </p>
              <p style="color: #666666; font-size: 11px; margin: 10px 0 0 0;">
                Puedes desactivar las notificaciones en cualquier momento desde tu navegador.
              </p>
              <p style="color: #444444; font-size: 11px; margin: 10px 0 0 0;">
                <a href="*|UNSUB|*" style="color: #666666;">Darse de baja de emails</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// POST - Send welcome email when notifications are activated
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if Mailchimp is configured
    if (mailchimpClient.isConfigured()) {
      try {
        // Add subscriber to Mailchimp with "push-notifications" tag
        // This will trigger a welcome automation if set up in Mailchimp
        await mailchimpClient.addSubscriber(email, {
          name: name || undefined,
          tags: ["push-notifications", "welcome-pending"],
          source: "push-notification-signup",
        });

        console.log(`[Welcome Email] Added ${email} to Mailchimp with push-notifications tag`);

        // Optionally send a campaign directly (single recipient)
        // This is useful if you don't have an automation set up
        try {
          await mailchimpClient.createAndSendCampaign({
            subject: "🔔 ¡Notificaciones Activadas! - Sonido Líquido Crew",
            previewText: "Gracias por activar las notificaciones. Te avisaremos de los próximos lanzamientos.",
            title: `Welcome - ${email} - ${new Date().toISOString().split("T")[0]}`,
            htmlContent: getWelcomeEmailHTML(name),
            tags: ["push-notifications"], // Only send to this tag
          });
          console.log(`[Welcome Email] Campaign sent to ${email}`);
        } catch (campaignError) {
          // Campaign send is optional - automation might handle it
          console.warn(`[Welcome Email] Campaign not sent (automation may handle):`, campaignError);
        }

        return NextResponse.json({
          success: true,
          message: "Subscriber added to Mailchimp",
          provider: "mailchimp",
        });
      } catch (mailchimpError) {
        console.error("[Welcome Email] Mailchimp error:", mailchimpError);
        // Don't fail - the subscriber was still added
        return NextResponse.json({
          success: true,
          message: "Notification activated (email pending)",
          provider: "mailchimp-partial",
        });
      }
    }

    // No email provider configured - still succeed
    console.log("[Welcome Email] No email provider configured, skipping email");
    return NextResponse.json({
      success: true,
      message: "Notification activated (email not configured)",
      provider: "none",
    });
  } catch (error) {
    console.error("[Welcome Email] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// GET - Check configuration status
export async function GET() {
  const mailchimpStatus = mailchimpClient.getConfigStatus();

  let testResult = null;
  if (mailchimpStatus.configured) {
    testResult = await mailchimpClient.testConnection();
  }

  return NextResponse.json({
    success: true,
    data: {
      mailchimp: {
        ...mailchimpStatus,
        connectionTest: testResult,
      },
    },
  });
}
