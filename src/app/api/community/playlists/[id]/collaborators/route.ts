import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { playlistCollaborators, userPlaylists } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// GET - List collaborators for a playlist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const collaborators = await db
      .select()
      .from(playlistCollaborators)
      .where(
        and(
          eq(playlistCollaborators.playlistId, playlistId),
          eq(playlistCollaborators.isActive, true)
        )
      )
      .orderBy(desc(playlistCollaborators.createdAt));

    return NextResponse.json({ success: true, data: collaborators });
  } catch (error) {
    console.error("[Playlist Collaborators] Error fetching:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar colaboradores" },
      { status: 500 }
    );
  }
}

// POST - Invite a collaborator
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { email, name, invitedByEmail, permissions } = body;

    if (!email?.trim() || !invitedByEmail?.trim()) {
      return NextResponse.json(
        { success: false, error: "Email del colaborador y del invitante son requeridos" },
        { status: 400 }
      );
    }

    // Verify playlist exists and inviter has permission
    const [playlist] = await db
      .select()
      .from(userPlaylists)
      .where(eq(userPlaylists.id, playlistId))
      .limit(1);

    if (!playlist) {
      return NextResponse.json(
        { success: false, error: "Playlist no encontrada" },
        { status: 404 }
      );
    }

    // Check if inviter is owner or has invite permissions
    const isOwner = playlist.ownerEmail === invitedByEmail;

    if (!isOwner) {
      // Check if they're a collaborator with invite permissions
      const [inviterCollab] = await db
        .select()
        .from(playlistCollaborators)
        .where(
          and(
            eq(playlistCollaborators.playlistId, playlistId),
            eq(playlistCollaborators.email, invitedByEmail),
            eq(playlistCollaborators.isActive, true),
            eq(playlistCollaborators.canInviteOthers, true)
          )
        )
        .limit(1);

      if (!inviterCollab) {
        return NextResponse.json(
          { success: false, error: "No tienes permiso para invitar colaboradores" },
          { status: 403 }
        );
      }
    }

    // Check if already a collaborator
    const [existing] = await db
      .select()
      .from(playlistCollaborators)
      .where(
        and(
          eq(playlistCollaborators.playlistId, playlistId),
          eq(playlistCollaborators.email, email.toLowerCase().trim())
        )
      )
      .limit(1);

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          { success: false, error: "Este usuario ya es colaborador" },
          { status: 400 }
        );
      }
      // Reactivate
      const [updated] = await db
        .update(playlistCollaborators)
        .set({
          isActive: true,
          inviteToken: generateUUID(),
          invitedBy: invitedByEmail,
          invitedAt: new Date(),
          acceptedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(playlistCollaborators.id, existing.id))
        .returning();

      return NextResponse.json({
        success: true,
        data: updated,
        inviteLink: generateInviteLink(playlistId, updated.inviteToken!),
      });
    }

    const inviteToken = generateUUID();

    const [collaborator] = await db
      .insert(playlistCollaborators)
      .values({
        id: generateUUID(),
        playlistId,
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        role: "contributor",
        inviteToken,
        invitedBy: invitedByEmail,
        invitedAt: new Date(),
        canAddTracks: permissions?.canAddTracks ?? true,
        canRemoveTracks: permissions?.canRemoveTracks ?? false,
        canEditDetails: permissions?.canEditDetails ?? false,
        canInviteOthers: permissions?.canInviteOthers ?? false,
      })
      .returning();

    console.log(`[Playlist Collaborators] Invited: ${email} to ${playlistId}`);

    // TODO: Send invite email

    return NextResponse.json({
      success: true,
      data: collaborator,
      inviteLink: generateInviteLink(playlistId, inviteToken),
    });
  } catch (error) {
    console.error("[Playlist Collaborators] Error inviting:", error);
    return NextResponse.json(
      { success: false, error: "Error al invitar colaborador" },
      { status: 500 }
    );
  }
}

// PUT - Accept invite or update permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action, inviteToken, collaboratorId, updaterEmail, permissions } = body;

    // Accept invite
    if (action === "accept" && inviteToken) {
      const [collaborator] = await db
        .select()
        .from(playlistCollaborators)
        .where(
          and(
            eq(playlistCollaborators.playlistId, playlistId),
            eq(playlistCollaborators.inviteToken, inviteToken)
          )
        )
        .limit(1);

      if (!collaborator) {
        return NextResponse.json(
          { success: false, error: "Invitación no válida o expirada" },
          { status: 404 }
        );
      }

      const [updated] = await db
        .update(playlistCollaborators)
        .set({
          acceptedAt: new Date(),
          inviteToken: null, // Clear token after acceptance
          updatedAt: new Date(),
        })
        .where(eq(playlistCollaborators.id, collaborator.id))
        .returning();

      console.log(`[Playlist Collaborators] Accepted: ${collaborator.email} for ${playlistId}`);

      return NextResponse.json({
        success: true,
        data: updated,
        message: "¡Te has unido como colaborador!",
      });
    }

    // Update permissions
    if (action === "update" && collaboratorId && updaterEmail) {
      // Verify updater has permission
      const [playlist] = await db
        .select()
        .from(userPlaylists)
        .where(eq(userPlaylists.id, playlistId))
        .limit(1);

      if (!playlist || playlist.ownerEmail !== updaterEmail) {
        return NextResponse.json(
          { success: false, error: "Solo el dueño puede cambiar permisos" },
          { status: 403 }
        );
      }

      const [updated] = await db
        .update(playlistCollaborators)
        .set({
          canAddTracks: permissions?.canAddTracks,
          canRemoveTracks: permissions?.canRemoveTracks,
          canEditDetails: permissions?.canEditDetails,
          canInviteOthers: permissions?.canInviteOthers,
          updatedAt: new Date(),
        })
        .where(eq(playlistCollaborators.id, collaboratorId))
        .returning();

      return NextResponse.json({
        success: true,
        data: updated,
      });
    }

    return NextResponse.json(
      { success: false, error: "Acción no válida" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Playlist Collaborators] Error updating:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar colaborador" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a collaborator
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const collaboratorId = searchParams.get("collaboratorId");
    const removerEmail = searchParams.get("removerEmail");

    if (!collaboratorId || !removerEmail) {
      return NextResponse.json(
        { success: false, error: "Colaborador y email son requeridos" },
        { status: 400 }
      );
    }

    // Verify remover has permission (owner only can remove others, anyone can remove themselves)
    const [playlist] = await db
      .select()
      .from(userPlaylists)
      .where(eq(userPlaylists.id, playlistId))
      .limit(1);

    const [collaborator] = await db
      .select()
      .from(playlistCollaborators)
      .where(eq(playlistCollaborators.id, collaboratorId))
      .limit(1);

    if (!collaborator) {
      return NextResponse.json(
        { success: false, error: "Colaborador no encontrado" },
        { status: 404 }
      );
    }

    const isOwner = playlist?.ownerEmail === removerEmail;
    const isSelf = collaborator.email === removerEmail;

    if (!isOwner && !isSelf) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para eliminar este colaborador" },
        { status: 403 }
      );
    }

    await db
      .update(playlistCollaborators)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(playlistCollaborators.id, collaboratorId));

    console.log(`[Playlist Collaborators] Removed: ${collaborator.email} from ${playlistId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Playlist Collaborators] Error removing:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar colaborador" },
      { status: 500 }
    );
  }
}

// Helper to generate invite link
function generateInviteLink(playlistId: string, token: string): string {
  return `https://sonidoliquido.com/playlists/join?playlist=${playlistId}&token=${token}`;
}
