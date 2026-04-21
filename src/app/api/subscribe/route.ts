import { NextResponse } from "next/server";

/**
 * POST /api/subscribe
 *
 * Subscribes an email address to the Mailchimp audience list.
 *
 * Environment variables required:
 *   MAILCHIMP_API_KEY       — Full API key (format: {key}-{server_prefix})
 *   MAILCHIMP_SERVER_PREFIX — Server prefix (e.g. "us1"), extracted from the API key
 *   MAILCHIMP_AUDIENCE_ID   — The audience/list ID to subscribe to
 *
 * If any variable is missing, returns a 503 indicating the service is not configured.
 * If the email is already subscribed, returns 200 with a "already_subscribed" status.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Por favor ingresa un correo electrónico válido." },
        { status: 400 }
      );
    }

    const apiKey = process.env.MAILCHIMP_API_KEY;
    const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
    const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

    // If Mailchimp is not configured, return a graceful fallback
    if (!apiKey || !serverPrefix || !audienceId) {
      return NextResponse.json(
        {
          error: "El servicio de newsletter no está configurado todavía. Síguenos en redes sociales para mantenerte al tanto.",
          notConfigured: true,
        },
        { status: 503 }
      );
    }

    // Mailchimp API endpoint
    const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members`;

    // Mailchimp uses Basic auth with "anystring" as username and the API key as password
    const authHeader = `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
        // Merge fields can be added here if needed, e.g.:
        // merge_fields: { FNAME: "", LNAME: "" },
        tags: ["website-signup"],
      }),
    });

    const data = await response.json();

    // Mailchimp returns 400 with "Member Exists" if already subscribed
    if (!response.ok) {
      const title = data.title || "";
      if (title === "Member Exists") {
        return NextResponse.json({
          message: "Ya estás suscrito. ¡Gracias por ser parte del crew!",
          status: "already_subscribed",
        });
      }

      // Other Mailchimp errors
      const detail = data.detail || data.title || "Error al suscribirse.";
      console.error("[Mailchimp API Error]", response.status, detail);
      return NextResponse.json(
        { error: "No pudimos procesar tu suscripción. Intenta de nuevo más tarde." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      message: "¡Te has suscrito exitosamente! Bienvenido al crew.",
      status: "subscribed",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Subscribe API Error]", message);
    return NextResponse.json(
      { error: "Error interno del servidor. Intenta de nuevo más tarde." },
      { status: 500 }
    );
  }
}
