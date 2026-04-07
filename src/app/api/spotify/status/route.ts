import { NextResponse } from "next/server";
import { getAccessToken, getArtist } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check if credentials are configured
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const hasCredentials = Boolean(clientId && clientSecret);

    // If credentials are configured, try to get a token to validate them
    let credentialsValid = false;
    let errorMessage = null;

    if (hasCredentials) {
      try {
        // Try to get an access token and make a simple API call
        await getAccessToken();
        await getArtist("2jJmTEMkGQfH3BxoG3MQvF"); // Test with Brez
        credentialsValid = true;
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : "Failed to validate credentials";
        // Check if it's a rate limit error vs invalid credentials
        if (
          errorMessage.includes("401") ||
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("Unauthorized")
        ) {
          credentialsValid = false;
          errorMessage = "Las credenciales de Spotify son inválidas. Verifica el Client ID y Client Secret.";
        } else if (
          errorMessage.includes("429") ||
          errorMessage.includes("rate") ||
          errorMessage.includes("Rate")
        ) {
          // Rate limited but credentials are valid
          credentialsValid = true;
          errorMessage = "Las credenciales son válidas pero la API está limitada temporalmente.";
        } else {
          // Other errors - credentials might still be valid
          credentialsValid = true;
        }
      }
    }

    return NextResponse.json({
      success: true,
      hasCredentials,
      credentialsValid,
      errorMessage,
      message: hasCredentials
        ? (credentialsValid
            ? "Credenciales de Spotify configuradas y válidas"
            : "Credenciales configuradas pero con errores")
        : "No hay credenciales de Spotify configuradas. Agrega SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en Netlify.",
    });
  } catch (error) {
    console.error("Error checking Spotify status:", error);
    return NextResponse.json(
      {
        success: false,
        hasCredentials: false,
        credentialsValid: false,
        error: error instanceof Error ? error.message : "Error checking status",
      },
      { status: 500 }
    );
  }
}
