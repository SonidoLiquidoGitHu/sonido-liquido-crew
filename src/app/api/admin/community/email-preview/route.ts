import { NextRequest, NextResponse } from "next/server";

interface EmailSettings {
  sendApprovalEmail: boolean;
  emailSubject: string;
  emailMessage: string;
  includeReward: boolean;
  rewardTitle: string;
  rewardDescription: string;
  rewardDownloadUrl: string;
  rewardFileName: string;
}

// Generate HTML email content for preview
function generateApprovalEmailHtml(
  recipientName: string,
  settings: EmailSettings,
  contentType: "message" | "memory",
  contentData?: { imageUrl?: string; caption?: string; message?: string }
): string {
  const contentTypeLabel = contentType === "message" ? "mensaje" : "foto";
  const isPhoto = contentType === "memory";

  // Content preview section
  let contentPreview = "";
  if (isPhoto && contentData?.imageUrl) {
    contentPreview = `
      <div style="margin: 20px 0; text-align: center;">
        <p style="color: #ec4899; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">📸 Tu foto publicada:</p>
        <img src="${contentData.imageUrl}" alt="Tu foto" style="max-width: 100%; max-height: 300px; border-radius: 12px; border: 2px solid #333;" />
        ${contentData.caption ? `<p style="color: #a1a1a1; font-size: 14px; margin-top: 10px; font-style: italic;">"${contentData.caption}"</p>` : ""}
      </div>
    `;
  } else if (!isPhoto && contentData?.message) {
    contentPreview = `
      <div style="margin: 20px 0; padding: 15px; background: #0a0a0a; border-radius: 8px; border-left: 3px solid #f97316;">
        <p style="color: #e5e5e5; font-size: 14px; margin: 0; font-style: italic;">"${contentData.message}"</p>
      </div>
    `;
  }

  let rewardSection = "";
  if (settings.includeReward && settings.rewardDownloadUrl) {
    rewardSection = `
      <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #1a1a1a, #2a2a2a); border-radius: 12px; border: 1px solid #f97316;">
        <h3 style="color: #f97316; margin: 0 0 10px 0; font-size: 18px;">🎁 ${settings.rewardTitle}</h3>
        <p style="color: #a1a1a1; margin: 0 0 15px 0; font-size: 14px;">${settings.rewardDescription}</p>
        <a href="${settings.rewardDownloadUrl}"
           style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 14px;">
          ⬇️ Descargar ${settings.rewardFileName || "archivo"}
        </a>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${settings.emailSubject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f97316; font-size: 28px; margin: 0; letter-spacing: 2px;">SONIDO LÍQUIDO</h1>
          <p style="color: #666; font-size: 12px; margin: 5px 0 0 0; letter-spacing: 1px;">HIP HOP MÉXICO</p>
        </div>

        <!-- Main Content -->
        <div style="background: #1a1a1a; border-radius: 16px; padding: 30px; border: 1px solid #333;">
          <h2 style="color: white; margin: 0 0 20px 0; font-size: 24px;">¡Hola ${recipientName}! 👋</h2>

          <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            ${settings.emailMessage}
          </p>

          <p style="color: #a1a1a1; font-size: 14px; margin: 0;">
            Tu ${contentTypeLabel} ya está visible para toda la comunidad.
          </p>

          ${contentPreview}

          ${rewardSection}

          <!-- CTA -->
          <div style="margin-top: 30px; text-align: center;">
            <a href="https://sonidoliquido.com/comunidad"
               style="display: inline-block; padding: 14px 32px; background: white; color: black; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 14px;">
              Ver en el sitio →
            </a>
          </div>
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
        </div>
      </div>
    </body>
    </html>
  `;
}

// POST - Generate email preview
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings, contentType, sampleData } = body;

    const defaultSettings: EmailSettings = {
      sendApprovalEmail: true,
      emailSubject: "¡Tu mensaje ha sido publicado en Sonido Líquido!",
      emailMessage: "Gracias por formar parte de nuestra comunidad. Tu mensaje ya está visible en el Fan Wall.",
      includeReward: false,
      rewardTitle: "Regalo sorpresa",
      rewardDescription: "Como agradecimiento, aquí tienes una descarga exclusiva:",
      rewardDownloadUrl: "",
      rewardFileName: "",
    };

    const emailSettings = { ...defaultSettings, ...settings };

    // Sample data for preview
    const previewData = sampleData || (contentType === "memory"
      ? {
          imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
          caption: "Increíble show en CDMX",
        }
      : {
          message: "¡La mejor crew de hip hop en México! Gracias por toda la música.",
        });

    const html = generateApprovalEmailHtml(
      "Usuario de Ejemplo",
      emailSettings,
      contentType || "message",
      previewData
    );

    return NextResponse.json({
      success: true,
      data: {
        html,
        subject: emailSettings.emailSubject,
      },
    });
  } catch (error) {
    console.error("[Email Preview] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error generating preview" },
      { status: 500 }
    );
  }
}
