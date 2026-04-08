import { NextResponse } from "next/server";
import { isDropboxConfigured } from "@/lib/clients/dropbox";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isDropboxConfigured();

  return NextResponse.json({
    configured,
    message: configured
      ? "Dropbox está configurado correctamente"
      : "Dropbox no está configurado. Configura DROPBOX_ACCESS_TOKEN en las variables de entorno.",
  });
}
