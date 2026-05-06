import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { userPlaylists, userPlaylistTracks, playlistCollaborators } from "@/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

// Helper to check if user can edit playlist
async function canEditPlaylist(playlistId: string, email: string): Promise<{ canEdit: boolean; canAddTracks: boolean; canRemoveTracks: boolean; role: string }> {
  // Check if owner
  const [playlist] = await db
    .select()
    .from(userPlaylists)
    .where(eq(userPlaylists.id, playlistId))
    .limit(1);

  if (!playlist) {
    return { canEdit: false, canAddTracks: false, canRemoveTracks: false, role: "none" };
  }

  if (playlist.ownerEmail === email) {
    return { canEdit: true, canAddTracks: true, canRemoveTracks: true, role: "owner" };
  }

  // Check if collaborator
  const [collaborator] = await db
    .select()
    .from(playlistCollaborators)
    .where(
      and(
        eq(playlistCollaborators.playlistId, playlistId),
        eq(playlistCollaborators.email, email),
        eq(playlistCollaborators.isActive, true)
      )
    )
    .limit(1);

  if (collaborator && collaborator.acceptedAt) {
    return {
      canEdit: collaborator.canEditDetails ?? false,
      canAddTracks: collaborator.canAddTracks ?? true,
      canRemoveTracks: collaborator.canRemoveTracks ?? false,
      role: collaborator.role || "contributor",
    };
  }

  return { canEdit: false, canAddTracks: false, canRemoveTracks: false, role: "none" };
}

// Helper to generate embed code
function generateEmbedCode(playlistSlug: string, options: {
  theme?: "dark" | "light";
  compact?: boolean;
  width?: number;
  height?: number;
} = {}): { iframe: string; html: string } {
  const { theme = "dark", compact = false, width = 400, height = compact ? 80 : 400 } = options;
  const baseUrl = "https://sonidoliquido.com/embed/playlist";
  const params = new URLSearchParams({
    theme,
    compact: compact ? "true" : "false",
  }).toString();

  const iframeSrc = `${baseUrl}/${playlistSlug}?${params}`;

  const iframe = `<iframe src="${iframeSrc}" width="${width}" height="${height}" frameborder="0" allow="autoplay; clipboard-write" loading="lazy"></iframe>`;

  const html = `<!-- Sonido Líquido Playlist Widget -->
<div id="sl-playlist-${playlistSlug}" style="width:${width}px;height:${height}px;"></div>
<script src="https://sonidoliquido.com/embed/widget.js" data-playlist="${playlistSlug}" data-theme="${theme}" data-compact="${compact}"></script>`;

  return { iframe, html };
}

// GET - Fetch public playlists or user's own playlists
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const email = searchParams.get("email");
    const publicOnly = searchParams.get("public") !== "false";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Fetch single playlist by slug
    if (slug) {
      const [playlist] = await db
        .select()
        .from(userPlaylists)
        .where(eq(userPlaylists.slug, slug))
        .limit(1);

      if (!playlist) {
        return NextResponse.json(
          { success: false, error: "Playlist no encontrada" },
          { status: 404 }
        );
      }

      // Check if playlist is private and user doesn't own it
      if (!playlist.isPublic && playlist.ownerEmail !== email) {
        return NextResponse.json(
          { success: false, error: "Playlist privada" },
          { status: 403 }
        );
      }

      // Fetch tracks
      const tracks = await db
        .select()
        .from(userPlaylistTracks)
        .where(eq(userPlaylistTracks.playlistId, playlist.id))
        .orderBy(userPlaylistTracks.position);

      // Fetch collaborators (accepted only)
      const collaborators = await db
        .select()
        .from(playlistCollaborators)
        .where(
          and(
            eq(playlistCollaborators.playlistId, playlist.id),
            eq(playlistCollaborators.isActive, true)
          )
        );

      const acceptedCollaborators = collaborators.filter(c => c.acceptedAt);

      // Generate embed code
      const embedCode = generateEmbedCode(playlist.slug);

      return NextResponse.json({
        success: true,
        data: {
          ...playlist,
          tracks: tracks.map((t) => ({
            id: t.trackId,
            type: t.trackType,
            title: t.trackTitle,
            artist: t.trackArtist,
            coverUrl: t.trackCoverUrl,
            duration: t.trackDuration,
            spotifyUri: t.spotifyUri,
            position: t.position,
            addedAt: t.addedAt?.toISOString(),
          })),
          collaborators: acceptedCollaborators.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            role: c.role,
          })),
          embedCode,
          isCollaborative: acceptedCollaborators.length > 0,
        },
      });
    }

    // Fetch user's playlists
    if (email) {
      const playlists = await db
        .select()
        .from(userPlaylists)
        .where(eq(userPlaylists.ownerEmail, email))
        .orderBy(desc(userPlaylists.updatedAt))
        .limit(limit);

      return NextResponse.json({ success: true, data: playlists });
    }

    // Fetch public playlists
    const playlists = await db
      .select()
      .from(userPlaylists)
      .where(eq(userPlaylists.isPublic, true))
      .orderBy(desc(userPlaylists.playCount))
      .limit(limit);

    return NextResponse.json({ success: true, data: playlists });
  } catch (error) {
    console.error("[Playlists] Error fetching:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar playlists" },
      { status: 500 }
    );
  }
}

// POST - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, description, ownerEmail, ownerName, isPublic, tracks } = body;

    if (!name?.trim() || !ownerEmail?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nombre y email son requeridos" },
        { status: 400 }
      );
    }

    if (!tracks || tracks.length === 0) {
      return NextResponse.json(
        { success: false, error: "Agrega al menos una canción" },
        { status: 400 }
      );
    }

    const id = generateUUID();
    const slug = slugify(`${name}-${id.slice(0, 6)}`);
    const sessionToken = generateUUID();

    // Create playlist
    const [playlist] = await db
      .insert(userPlaylists)
      .values({
        id,
        ownerEmail: ownerEmail.trim(),
        ownerName: ownerName?.trim() || null,
        sessionToken,
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        coverImageUrl: tracks[0]?.trackCoverUrl || null,
        isPublic: isPublic !== false,
      })
      .returning();

    // Add tracks
    const trackInserts = tracks.map(
      (track: {
        trackType: string;
        trackId: string;
        trackTitle: string;
        trackArtist: string;
        trackCoverUrl?: string;
        trackDuration?: number;
        spotifyUri?: string;
        position: number;
      }) => ({
        id: generateUUID(),
        playlistId: id,
        trackType: track.trackType,
        trackId: track.trackId,
        trackTitle: track.trackTitle,
        trackArtist: track.trackArtist,
        trackCoverUrl: track.trackCoverUrl || null,
        trackDuration: track.trackDuration || null,
        spotifyUri: track.spotifyUri || null,
        position: track.position,
      })
    );

    await db.insert(userPlaylistTracks).values(trackInserts);

    console.log(`[Playlists] Created: ${slug} by ${ownerEmail}`);

    return NextResponse.json({
      success: true,
      data: {
        ...playlist,
        tracks,
      },
    });
  } catch (error) {
    console.error("[Playlists] Error creating:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear playlist" },
      { status: 500 }
    );
  }
}

// PUT - Update existing playlist
export async function PUT(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { id, name, description, ownerEmail, isPublic, tracks } = body;

    if (!id || !ownerEmail) {
      return NextResponse.json(
        { success: false, error: "ID y email requeridos" },
        { status: 400 }
      );
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(userPlaylists)
      .where(eq(userPlaylists.id, id))
      .limit(1);

    if (!existing || existing.ownerEmail !== ownerEmail) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para editar esta playlist" },
        { status: 403 }
      );
    }

    // Update playlist
    const [updated] = await db
      .update(userPlaylists)
      .set({
        name: name?.trim() || existing.name,
        description: description?.trim() || null,
        isPublic: isPublic !== undefined ? isPublic : existing.isPublic,
        coverImageUrl: tracks?.[0]?.trackCoverUrl || existing.coverImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(userPlaylists.id, id))
      .returning();

    // Update tracks if provided
    if (tracks && tracks.length > 0) {
      // Delete existing tracks
      await db.delete(userPlaylistTracks).where(eq(userPlaylistTracks.playlistId, id));

      // Insert new tracks
      const trackInserts = tracks.map(
        (
          track: {
            trackType: string;
            trackId: string;
            trackTitle: string;
            trackArtist: string;
            trackCoverUrl?: string;
            trackDuration?: number;
            spotifyUri?: string;
            position: number;
          },
          index: number
        ) => ({
          id: generateUUID(),
          playlistId: id,
          trackType: track.trackType,
          trackId: track.trackId,
          trackTitle: track.trackTitle,
          trackArtist: track.trackArtist,
          trackCoverUrl: track.trackCoverUrl || null,
          trackDuration: track.trackDuration || null,
          spotifyUri: track.spotifyUri || null,
          position: track.position ?? index,
        })
      );

      await db.insert(userPlaylistTracks).values(trackInserts);
    }

    console.log(`[Playlists] Updated: ${updated.slug}`);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[Playlists] Error updating:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar playlist" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a playlist
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
    const email = searchParams.get("email");

    if (!id || !email) {
      return NextResponse.json(
        { success: false, error: "ID y email requeridos" },
        { status: 400 }
      );
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(userPlaylists)
      .where(eq(userPlaylists.id, id))
      .limit(1);

    if (!existing || existing.ownerEmail !== email) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para eliminar esta playlist" },
        { status: 403 }
      );
    }

    // Delete tracks first
    await db.delete(userPlaylistTracks).where(eq(userPlaylistTracks.playlistId, id));

    // Delete playlist
    await db.delete(userPlaylists).where(eq(userPlaylists.id, id));

    console.log(`[Playlists] Deleted: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Playlists] Error deleting:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar playlist" },
      { status: 500 }
    );
  }
}
