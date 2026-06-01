import { NextRequest, NextResponse } from "next/server";
import { mailchimpClient } from "@/lib/clients";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, eventTitle, eventSlug, eventDate, eventLocation, eventDescription, coverImageUrl } = body;

    if (!eventTitle) {
      return NextResponse.json({ success: false, error: "Event title is required" }, { status: 400 });
    }

    // Check if Mailchimp is configured
    const isConfigured = await mailchimpClient.isConfiguredAsync();
    if (!isConfigured) {
      return NextResponse.json({ 
        success: false, 
        error: "Mailchimp no está configurado. Configúralo en Email Studio → Config." 
      }, { status: 400 });
    }

    // Build the event share URL
    const eventUrl = `https://sonidoliquido.com/reels`;
    
    // Generate email HTML
    const dateStr = eventDate 
      ? new Date(eventDate).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })
      : "";
    
    const bodyText = [
      eventDescription || "",
      "",
      dateStr ? `📅 ${dateStr}` : "",
      eventLocation ? `📍 ${eventLocation}` : "",
      "",
      `👉 Mira los videos en ${eventUrl}`,
    ].filter(Boolean).join("\n");

    const htmlContent = mailchimpClient.generateCustomEmailHTML({
      title: eventTitle.toUpperCase(),
      body: bodyText,
      ctaText: "VER EVENTO",
      ctaUrl: eventUrl,
      coverImageUrl: coverImageUrl || undefined,
    });

    // Create and send the campaign
    const result = await mailchimpClient.createAndSendCampaign({
      subject: `🎬 ${eventTitle} - Sonido Líquido Crew`,
      previewText: eventDescription || `Mira "${eventTitle}" en Sonido Líquido`,
      title: `[Evento] ${eventTitle}`,
      htmlContent,
      tags: ["sonidoliquido.com"],
    });

    return NextResponse.json({
      success: true,
      data: {
        campaignId: result.campaignId,
        webId: result.webId,
        status: result.status,
      },
    });
  } catch (error) {
    console.error("Error sharing event with subscribers:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Failed to send campaign" },
      { status: 500 }
    );
  }
}
