import { NextRequest, NextResponse } from "next/server";
import { db, executeRaw } from "@/db/client";
import { samplingResources, samplingResourcesSettings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// ===========================================
// Sampling Resources Admin API (DB-backed)
// ===========================================
// All reads/writes go to the Turso database so they work
// on Netlify's read-only serverless filesystem.

type ResourceType = "video" | "channel" | "playlist";
type GateType = "email" | "presave" | "both";

// -------------------------------------------
// Helper: ensure the DB tables exist
// -------------------------------------------
let tablesEnsured = false;

async function ensureTables(): Promise<void> {
  if (tablesEnsured) return;

  try {
    // Run CREATE TABLE IF NOT EXISTS for both tables.
    // This is idempotent and safe to call on every cold start.
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS sampling_resources (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('video', 'channel', 'playlist')),
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        video_id TEXT,
        playlist_id TEXT,
        handle TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS sampling_resources_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log("[sampling-resources] Tables ensured");
  } catch (err) {
    console.warn("[sampling-resources] ensureTables error (may be OK if tables already exist):", err);
  }

  tablesEnsured = true;
}

// -------------------------------------------
// Helper: read settings from DB (with fallback)
// -------------------------------------------
async function readSettingsFromDB(): Promise<{
  title: string;
  subtitle: string;
  internalNote: string;
  gateType: GateType;
  presaveUrl: string;
  presaveCta: string;
}> {
  try {
    const rows = await db.select().from(samplingResourcesSettings);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      title: map.title || "Recursos para Sampling",
      subtitle:
        map.subtitle ||
        "Curaduría interna de canales, videos y playlists de YouTube para encontrar música sampleable.",
      internalNote: map.internalNote || "",
      gateType: (map.gateType as GateType) || "email",
      presaveUrl: map.presaveUrl || "",
      presaveCta: map.presaveCta || "Pre-guardar en Spotify",
    };
  } catch {
    // Settings table might not exist yet — return defaults
    return {
      title: "Recursos para Sampling",
      subtitle:
        "Curaduría interna de canales, videos y playlists de YouTube para encontrar música sampleable.",
      internalNote: "",
      gateType: "email",
      presaveUrl: "",
      presaveCta: "Pre-guardar en Spotify",
    };
  }
}

// -------------------------------------------
// Helper: upsert a single setting
// -------------------------------------------
async function upsertSetting(key: string, value: string): Promise<void> {
  await db
    .insert(samplingResourcesSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: samplingResourcesSettings.key, set: { value, updatedAt: new Date() } });
}

// -------------------------------------------
// Helper: parse DB row into resource object
// -------------------------------------------
function rowToResource(row: (typeof samplingResources)["$inferSelect"]) {
  return {
    id: row.id,
    type: row.type as ResourceType,
    title: row.title,
    url: row.url,
    category: row.category,
    description: row.description,
    tags: JSON.parse(row.tags || "[]"),
    ...(row.videoId ? { videoId: row.videoId } : {}),
    ...(row.playlistId ? { playlistId: row.playlistId } : {}),
    ...(row.handle ? { handle: row.handle } : {}),
  };
}

// GET — list all resources + settings
export async function GET() {
  try {
    await ensureTables();

    const [settings, rows] = await Promise.all([
      readSettingsFromDB(),
      db.select().from(samplingResources).orderBy(asc(samplingResources.sortOrder)),
    ]);

    const resources = rows.map(rowToResource);

    // If DB is empty, seed from JSON file (one-time migration)
    if (resources.length === 0) {
      const seeded = await seedFromJsonFile();
      if (seeded) {
        const [settings2, rows2] = await Promise.all([
          readSettingsFromDB(),
          db.select().from(samplingResources).orderBy(asc(samplingResources.sortOrder)),
        ]);
        return NextResponse.json({
          success: true,
          data: { ...settings2, resources: rows2.map(rowToResource) },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...settings, resources },
    });
  } catch (error) {
    console.error("[sampling-resources] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Error al leer recursos." },
      { status: 500 }
    );
  }
}

// POST — add a new resource OR save settings
export async function POST(request: NextRequest) {
  try {
    await ensureTables();

    const body = await request.json();

    // Check if this is a settings update (has _action: "settings")
    if (body._action === "settings") {
      const validGateTypes: GateType[] = ["email", "presave", "both"];
      const gateType = validGateTypes.includes(body.gateType) ? body.gateType : "email";
      const presaveUrl = (body.presaveUrl || "").trim();
      const presaveCta = (body.presaveCta || "").trim() || "Pre-guardar en Spotify";

      await upsertSetting("gateType", gateType);
      await upsertSetting("presaveUrl", presaveUrl);
      await upsertSetting("presaveCta", presaveCta);

      return NextResponse.json({
        success: true,
        data: { gateType, presaveUrl, presaveCta },
      });
    }

    // Otherwise, create a new resource
    const { type, title, url, category, description, tags, videoId, playlistId, handle } = body;

    if (!type || !title || !url || !category || !description) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos: type, title, url, category, description" },
        { status: 400 }
      );
    }

    if (!["video", "channel", "playlist"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Tipo inválido. Debe ser: video, channel o playlist" },
        { status: 400 }
      );
    }

    // Get max sort order
    const allRows = await db.select().from(samplingResources);
    const maxSort = allRows.reduce((max, r) => Math.max(max, r.sortOrder), -1);

    const id = `${type.charAt(0) === "c" ? "ch" : type === "video" ? "vid" : "pl"}-${generateUUID().slice(0, 8)}`;

    const newResource = {
      id,
      type: type as ResourceType,
      title: title.trim(),
      url: url.trim(),
      category: category.trim(),
      description: description.trim(),
      tags: JSON.stringify(
        Array.isArray(tags) ? tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean) : []
      ),
      videoId: type === "video" && videoId ? videoId.trim() : null,
      playlistId: type === "playlist" && playlistId ? playlistId.trim() : null,
      handle: type === "channel" && handle ? handle.trim() : null,
      sortOrder: maxSort + 1,
    };

    await db.insert(samplingResources).values(newResource);

    return NextResponse.json({ success: true, data: rowToResource(newResource as any) });
  } catch (error) {
    console.error("[sampling-resources] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear recurso." },
      { status: 500 }
    );
  }
}

// PUT — update an existing resource
export async function PUT(request: NextRequest) {
  try {
    await ensureTables();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido para actualizar." },
        { status: 400 }
      );
    }

    // Check existence
    const [existing] = await db.select().from(samplingResources).where(eq(samplingResources.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Recurso no encontrado." },
        { status: 404 }
      );
    }

    const newType = (updates.type || existing.type) as ResourceType;

    // Build update object
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.url !== undefined) updateData.url = updates.url.trim();
    if (updates.category !== undefined) updateData.category = updates.category.trim();
    if (updates.description !== undefined) updateData.description = updates.description.trim();
    if (updates.type !== undefined) updateData.type = updates.type;

    if (updates.tags !== undefined) {
      updateData.tags = JSON.stringify(
        updates.tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean)
      );
    }

    // Type-specific fields: clear fields that don't belong to the new type
    updateData.videoId = newType === "video" && updates.videoId ? updates.videoId.trim() : null;
    updateData.playlistId = newType === "playlist" && updates.playlistId ? updates.playlistId.trim() : null;
    updateData.handle = newType === "channel" && updates.handle ? updates.handle.trim() : null;

    await db.update(samplingResources).set(updateData).where(eq(samplingResources.id, id));

    const [updated] = await db.select().from(samplingResources).where(eq(samplingResources.id, id)).limit(1);

    return NextResponse.json({ success: true, data: rowToResource(updated!) });
  } catch (error) {
    console.error("[sampling-resources] PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar recurso." },
      { status: 500 }
    );
  }
}

// PATCH — reorder resources
export async function PATCH(request: NextRequest) {
  try {
    await ensureTables();

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { success: false, error: "orderedIds debe ser un array." },
        { status: 400 }
      );
    }

    // Update sort orders in sequence
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(samplingResources)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(samplingResources.id, orderedIds[i]));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[sampling-resources] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Error al reordenar recursos." },
      { status: 500 }
    );
  }
}

// DELETE — remove a resource
export async function DELETE(request: NextRequest) {
  try {
    await ensureTables();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido para eliminar." },
        { status: 400 }
      );
    }

    const [existing] = await db.select().from(samplingResources).where(eq(samplingResources.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Recurso no encontrado." },
        { status: 404 }
      );
    }

    await db.delete(samplingResources).where(eq(samplingResources.id, id));

    return NextResponse.json({ success: true, data: rowToResource(existing) });
  } catch (error) {
    console.error("[sampling-resources] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar recurso." },
      { status: 500 }
    );
  }
}

// -------------------------------------------
// One-time seed: migrate JSON file → DB
// -------------------------------------------
async function seedFromJsonFile(): Promise<boolean> {
  try {
    const { readFile } = await import("fs/promises");
    const path = await import("path");
    const dataPath = path.join(process.cwd(), "src/data/sampling-resources.json");
    const raw = await readFile(dataPath, "utf-8");
    const data = JSON.parse(raw);

    if (!data.resources || data.resources.length === 0) return false;

    // Seed settings
    for (const [key, value] of Object.entries({
      title: data.title || "",
      subtitle: data.subtitle || "",
      internalNote: data.internalNote || "",
    })) {
      await db
        .insert(samplingResourcesSettings)
        .values({ key, value })
        .onConflictDoUpdate({ target: samplingResourcesSettings.key, set: { value, updatedAt: new Date() } });
    }

    // Seed resources
    for (let i = 0; i < data.resources.length; i++) {
      const r = data.resources[i];
      await db.insert(samplingResources).values({
        id: r.id || generateUUID(),
        type: r.type,
        title: r.title,
        url: r.url,
        category: r.category,
        description: r.description,
        tags: JSON.stringify(r.tags || []),
        videoId: r.videoId || null,
        playlistId: r.playlistId || null,
        handle: r.handle || null,
        sortOrder: i,
      });
    }

    console.log(`[sampling-resources] Seeded ${data.resources.length} resources from JSON file`);
    return true;
  } catch (err) {
    // JSON file might not exist in production build — that's fine
    console.warn("[sampling-resources] Could not seed from JSON file:", err);
    return false;
  }
}
