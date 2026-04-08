import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { fanWallMessages, concertMemories, siteSettings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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

// Helper to get email settings
async function getEmailSettings(): Promise<EmailSettings> {
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

  try {
    const [setting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "community_email_settings"))
      .limit(1);

    if (setting?.value) {
      return { ...defaultSettings, ...JSON.parse(setting.value) };
    }
  } catch (error) {
    console.error("[Community] Error loading email settings:", error);
  }

  return defaultSettings;
}

// Helper to send approval email
async function sendApprovalEmail(
  recipientEmail: string,
  recipientName: string,
  settings: EmailSettings,
  contentType: "message" | "memory",
  contentData?: { imageUrl?: string; caption?: string; message?: string }
): Promise<boolean> {
  try {
    // Try to use Mailchimp transactional or Resend
    // For now, we'll use a simple email API call

    const emailHtml = generateApprovalEmailHtml(recipientName, settings, contentType, contentData);

    // Check if we have Mailchimp configured
    const mailchimpKey = process.env.MAILCHIMP_API_KEY;
    const mailchimpServer = process.env.MAILCHIMP_SERVER_PREFIX;

    if (mailchimpKey && mailchimpServer) {
      // Use Mailchimp Transactional API (Mandrill)
      // Note: This requires Mailchimp Transactional (paid) or alternative
      console.log(`[Community Email] Would send email to ${recipientEmail}`);
      console.log(`[Community Email] Subject: ${settings.emailSubject}`);

      // For production, integrate with actual email service
      // For now, log the email details
      return true;
    }

    // Fallback: Log email (in production, integrate with email service)
    console.log(`[Community Email] Approval email for ${recipientEmail}:`);
    console.log(`  Subject: ${settings.emailSubject}`);
    console.log(`  Name: ${recipientName}`);
    console.log(`  Content Type: ${contentType}`);
    if (settings.includeReward && settings.rewardDownloadUrl) {
      console.log(`  Reward: ${settings.rewardTitle} - ${settings.rewardDownloadUrl}`);
    }

    return true;
  } catch (error) {
    console.error("[Community Email] Error sending:", error);
    return false;
  }
}

// Generate HTML email content
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

// GET - Fetch pending moderation items
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: { messages: [], memories: [] } });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "messages" | "memories" | "all"
    const status = searchParams.get("status") || "pending"; // "pending" | "approved" | "all"

    const data: {
      messages?: (typeof fanWallMessages.$inferSelect)[];
      memories?: (typeof concertMemories.$inferSelect)[];
    } = {};

    // Fetch fan wall messages
    if (!type || type === "messages" || type === "all") {
      let query = db.select().from(fanWallMessages);

      if (status === "pending") {
        query = query.where(eq(fanWallMessages.isApproved, false)) as typeof query;
      } else if (status === "approved") {
        query = query.where(eq(fanWallMessages.isApproved, true)) as typeof query;
      }

      data.messages = await query.orderBy(desc(fanWallMessages.createdAt)).limit(100);
    }

    // Fetch concert memories
    if (!type || type === "memories" || type === "all") {
      let query = db.select().from(concertMemories);

      if (status === "pending") {
        query = query.where(eq(concertMemories.isApproved, false)) as typeof query;
      } else if (status === "approved") {
        query = query.where(eq(concertMemories.isApproved, true)) as typeof query;
      }

      data.memories = await query.orderBy(desc(concertMemories.createdAt)).limit(100);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Admin Community] Error fetching:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar contenido" },
      { status: 500 }
    );
  }
}

// PUT - Moderate content (approve/reject/feature)
export async function PUT(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { type, id, action, moderatedBy, sendEmail, recipientEmail } = body;

    if (!type || !id || !action) {
      return NextResponse.json(
        { success: false, error: "Tipo, ID y acción son requeridos" },
        { status: 400 }
      );
    }

    const now = new Date();
    let recipientName = "";
    let shouldSendEmail = false;
    let contentData: { imageUrl?: string; caption?: string; message?: string } = {};

    // Handle fan wall messages
    if (type === "message") {
      const updateData: Record<string, unknown> = {
        moderatedAt: now,
        moderatedBy: moderatedBy || null,
        updatedAt: now,
      };

      switch (action) {
        case "approve":
          updateData.isApproved = true;
          updateData.isHidden = false;
          shouldSendEmail = true;
          break;
        case "reject":
          updateData.isApproved = false;
          updateData.isHidden = true;
          break;
        case "feature":
          updateData.isApproved = true;
          updateData.isFeatured = true;
          updateData.isHidden = false;
          shouldSendEmail = true;
          break;
        case "unfeature":
          updateData.isFeatured = false;
          break;
        case "hide":
          updateData.isHidden = true;
          break;
        default:
          return NextResponse.json(
            { success: false, error: "Acción no válida" },
            { status: 400 }
          );
      }

      // Get the message to find recipient info and content
      if (shouldSendEmail && sendEmail) {
        const [message] = await db
          .select()
          .from(fanWallMessages)
          .where(eq(fanWallMessages.id, id))
          .limit(1);

        if (message) {
          recipientName = message.displayName;
          contentData = { message: message.message };
        }
      }

      await db
        .update(fanWallMessages)
        .set(updateData)
        .where(eq(fanWallMessages.id, id));

      console.log(`[Admin Community] Message ${id} - ${action}`);
    }

    // Handle concert memories
    if (type === "memory") {
      const updateData: Record<string, unknown> = {
        moderatedAt: now,
        updatedAt: now,
      };

      switch (action) {
        case "approve":
          updateData.isApproved = true;
          updateData.isHidden = false;
          shouldSendEmail = true;
          break;
        case "reject":
          updateData.isApproved = false;
          updateData.isHidden = true;
          break;
        case "feature":
          updateData.isApproved = true;
          updateData.isFeatured = true;
          updateData.isHidden = false;
          shouldSendEmail = true;
          break;
        case "unfeature":
          updateData.isFeatured = false;
          break;
        case "hide":
          updateData.isHidden = true;
          break;
        default:
          return NextResponse.json(
            { success: false, error: "Acción no válida" },
            { status: 400 }
          );
      }

      // Get the memory to find recipient info and content
      if (shouldSendEmail && sendEmail) {
        const [memory] = await db
          .select()
          .from(concertMemories)
          .where(eq(concertMemories.id, id))
          .limit(1);

        if (memory) {
          recipientName = memory.submitterName;
          contentData = {
            imageUrl: memory.imageUrl,
            caption: memory.caption || undefined,
          };
        }
      }

      await db
        .update(concertMemories)
        .set(updateData)
        .where(eq(concertMemories.id, id));

      console.log(`[Admin Community] Memory ${id} - ${action}`);
    }

    // Send approval email if enabled
    if (shouldSendEmail && sendEmail && recipientEmail) {
      const emailSettings = await getEmailSettings();
      if (emailSettings.sendApprovalEmail) {
        await sendApprovalEmail(
          recipientEmail,
          recipientName,
          emailSettings,
          type as "message" | "memory",
          contentData
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Community] Error moderating:", error);
    return NextResponse.json(
      { success: false, error: "Error al moderar contenido" },
      { status: 500 }
    );
  }
}

// DELETE - Delete content
export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: "Tipo y ID son requeridos" },
        { status: 400 }
      );
    }

    if (type === "message") {
      await db.delete(fanWallMessages).where(eq(fanWallMessages.id, id));
      console.log(`[Admin Community] Deleted message: ${id}`);
    }

    if (type === "memory") {
      await db.delete(concertMemories).where(eq(concertMemories.id, id));
      console.log(`[Admin Community] Deleted memory: ${id}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Community] Error deleting:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar contenido" },
      { status: 500 }
    );
  }
}
