import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { generateUUID } from "@/lib/utils";

// ===========================================
// Sampling Resources Admin API
// ===========================================
// Reads/writes src/data/sampling-resources.json directly.
// This is a file-based resource (not DB-backed) since it's a
// curated list that changes infrequently.

const DATA_PATH = path.join(process.cwd(), "src/data/sampling-resources.json");

type ResourceType = "video" | "channel" | "playlist";

interface SamplingResource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  category: string;
  description: string;
  tags: string[];
  videoId?: string;
  playlistId?: string;
  handle?: string;
}

interface SamplingData {
  title: string;
  subtitle: string;
  internalNote: string;
  resources: SamplingResource[];
}

async function readData(): Promise<SamplingData> {
  const raw = await readFile(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeData(data: SamplingData): Promise<void> {
  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// GET — list all resources
export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[sampling-resources] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Error al leer recursos." },
      { status: 500 }
    );
  }
}

// POST — add a new resource
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, url, category, description, tags, videoId, playlistId, handle } = body;

    // Validate required fields
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

    const data = await readData();

    const newResource: SamplingResource = {
      id: `${type.charAt(0) === "c" ? "ch" : type === "video" ? "vid" : "pl"}-${generateUUID().slice(0, 8)}`,
      type,
      title: title.trim(),
      url: url.trim(),
      category: category.trim(),
      description: description.trim(),
      tags: Array.isArray(tags) ? tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean) : [],
    };

    // Add type-specific fields
    if (type === "video" && videoId) newResource.videoId = videoId.trim();
    if (type === "playlist" && playlistId) newResource.playlistId = playlistId.trim();
    if (type === "channel" && handle) newResource.handle = handle.trim();

    data.resources.push(newResource);
    await writeData(data);

    return NextResponse.json({ success: true, data: newResource });
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
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido para actualizar." },
        { status: 400 }
      );
    }

    const data = await readData();
    const index = data.resources.findIndex((r) => r.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Recurso no encontrado." },
        { status: 404 }
      );
    }

    // Clean up tags if provided
    if (updates.tags) {
      updates.tags = updates.tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean);
    }

    // Clean up optional fields — remove type-specific fields if type changed
    const existing = data.resources[index];
    const newType = updates.type || existing.type;

    // Remove fields that don't belong to the new type
    if (newType !== "video") delete updates.videoId;
    if (newType !== "playlist") delete updates.playlistId;
    if (newType !== "channel") delete updates.handle;

    data.resources[index] = { ...existing, ...updates };
    await writeData(data);

    return NextResponse.json({ success: true, data: data.resources[index] });
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
    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { success: false, error: "orderedIds debe ser un array." },
        { status: 400 }
      );
    }

    const data = await readData();
    const resourceMap = new Map(data.resources.map((r) => [r.id, r]));
    data.resources = orderedIds
      .map((id: string) => resourceMap.get(id))
      .filter(Boolean) as SamplingResource[];

    await writeData(data);
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido para eliminar." },
        { status: 400 }
      );
    }

    const data = await readData();
    const index = data.resources.findIndex((r) => r.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Recurso no encontrado." },
        { status: 404 }
      );
    }

    const deleted = data.resources.splice(index, 1)[0];
    await writeData(data);

    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    console.error("[sampling-resources] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar recurso." },
      { status: 500 }
    );
  }
}
