import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { trustedContributors } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// GET - List all trusted contributors
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") !== "false";

    let query = db.select().from(trustedContributors);

    if (activeOnly) {
      query = query.where(eq(trustedContributors.isActive, true)) as typeof query;
    }

    const contributors = await query.orderBy(desc(trustedContributors.createdAt));

    return NextResponse.json({ success: true, data: contributors });
  } catch (error) {
    console.error("[Trusted Contributors] Error fetching:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar contribuidores" },
      { status: 500 }
    );
  }
}

// POST - Add a trusted contributor
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      identifierType,
      identifierValue,
      displayName,
      trustLevel = 1,
      autoApproveMessages = true,
      autoApprovePhotos = true,
      autoFeature = false,
      notes,
      addedBy,
    } = body;

    if (!identifierType || !identifierValue) {
      return NextResponse.json(
        { success: false, error: "Tipo e identificador son requeridos" },
        { status: 400 }
      );
    }

    // Check if already exists
    const [existing] = await db
      .select()
      .from(trustedContributors)
      .where(
        and(
          eq(trustedContributors.identifierType, identifierType),
          eq(trustedContributors.identifierValue, identifierValue.toLowerCase().trim())
        )
      )
      .limit(1);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(trustedContributors)
        .set({
          displayName: displayName || existing.displayName,
          trustLevel,
          autoApproveMessages,
          autoApprovePhotos,
          autoFeature,
          notes,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(trustedContributors.id, existing.id))
        .returning();

      return NextResponse.json({
        success: true,
        data: updated,
        message: "Contribuidor actualizado",
      });
    }

    // Create new
    const [contributor] = await db
      .insert(trustedContributors)
      .values({
        id: generateUUID(),
        identifierType,
        identifierValue: identifierValue.toLowerCase().trim(),
        displayName: displayName?.trim() || null,
        trustLevel,
        autoApproveMessages,
        autoApprovePhotos,
        autoFeature,
        notes: notes?.trim() || null,
        addedBy,
      })
      .returning();

    console.log(`[Trusted Contributors] Added: ${identifierType}:${identifierValue}`);

    return NextResponse.json({
      success: true,
      data: contributor,
    });
  } catch (error) {
    console.error("[Trusted Contributors] Error creating:", error);
    return NextResponse.json(
      { success: false, error: "Error al agregar contribuidor" },
      { status: 500 }
    );
  }
}

// PUT - Update a trusted contributor
export async function PUT(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID es requerido" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(trustedContributors)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(trustedContributors.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Contribuidor no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[Trusted Contributors] Error updating:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar contribuidor" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a trusted contributor
export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID es requerido" },
        { status: 400 }
      );
    }

    await db.delete(trustedContributors).where(eq(trustedContributors.id, id));

    console.log(`[Trusted Contributors] Deleted: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Trusted Contributors] Error deleting:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar contribuidor" },
      { status: 500 }
    );
  }
}

// Helper function moved to @/lib/trusted-contributors.ts
