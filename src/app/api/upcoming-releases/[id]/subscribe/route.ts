import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Correo electrónico inválido" },
        { status: 400 }
      );
    }

    // Check release exists
    const release = await db.release.findUnique({ where: { id } });
    if (!release) {
      return NextResponse.json(
        { error: "Lanzamiento no encontrado" },
        { status: 404 }
      );
    }

    // Upsert subscription (unique on email+releaseId)
    await db.upcomingReleaseSubscriber.upsert({
      where: {
        email_releaseId: { email, releaseId: id },
      },
      create: { email, releaseId: id },
      update: {},
    });

    return NextResponse.json({
      message: "¡Suscrito! Te notificaremos cuando esté disponible.",
    });
  } catch (error) {
    console.error("Failed to subscribe:", error);
    return NextResponse.json(
      { error: "Error al suscribirse. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
