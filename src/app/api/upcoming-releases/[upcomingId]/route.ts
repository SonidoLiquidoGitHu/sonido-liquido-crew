import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ upcomingId: string }> }
) {
  try {
    const { upcomingId } = await params;

    await initializeDatabase();
    const client = await getClient();

    const result = await client.execute({
      sql: "SELECT * FROM upcoming_releases WHERE id = ?",
      args: [upcomingId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Upcoming release not found" },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const release = {
      id: row.id,
      title: row.title,
      artistName: row.artist_name,
      releaseType: row.release_type,
      releaseDate: row.release_date,
      coverImageUrl: row.cover_image_url,
      description: row.description,
      status: row.status,
      isFeatured: Boolean(row.is_featured),
      isActive: Boolean(row.is_active),
      presaveUrl: row.presave_url,
      presavePlatform: row.presave_platform,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ success: true, release });
  } catch (error) {
    console.error("Error fetching upcoming release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch upcoming release" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ upcomingId: string }> }
) {
  try {
    const { upcomingId } = await params;
    const data = await request.json();

    await initializeDatabase();
    const client = await getClient();

    const now = new Date().toISOString();

    await client.execute({
      sql: `
        UPDATE upcoming_releases SET
          title = ?,
          artist_name = ?,
          release_type = ?,
          release_date = ?,
          cover_image_url = ?,
          description = ?,
          status = ?,
          is_featured = ?,
          is_active = ?,
          presave_url = ?,
          presave_platform = ?,
          sort_order = ?,
          updated_at = ?
        WHERE id = ?
      `,
      args: [
        data.title,
        data.artistName,
        data.releaseType || "single",
        data.releaseDate,
        data.coverImageUrl || null,
        data.description || null,
        data.status || "listo",
        data.isFeatured ? 1 : 0,
        data.isActive !== false ? 1 : 0,
        data.presaveUrl || null,
        data.presavePlatform || "onerpm",
        data.sortOrder || 0,
        now,
        upcomingId,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Upcoming release updated successfully",
    });
  } catch (error) {
    console.error("Error updating upcoming release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update upcoming release" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ upcomingId: string }> }
) {
  try {
    const { upcomingId } = await params;

    await initializeDatabase();
    const client = await getClient();

    await client.execute({
      sql: "DELETE FROM upcoming_releases WHERE id = ?",
      args: [upcomingId],
    });

    return NextResponse.json({
      success: true,
      message: "Upcoming release deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting upcoming release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete upcoming release" },
      { status: 500 }
    );
  }
}
