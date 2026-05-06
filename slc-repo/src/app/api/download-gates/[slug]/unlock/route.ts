import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { downloadGates, downloadGateActions, fileAssets } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { unlockDownloadGateSchema } from "@/lib/validations";
import { generateUUID } from "@/lib/utils";
import { subscribersService } from "@/lib/services";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    // Get the download gate
    const [gate] = await db
      .select()
      .from(downloadGates)
      .where(eq(downloadGates.slug, slug))
      .limit(1);

    if (!gate) {
      return NextResponse.json(
        { success: false, error: "Download gate not found" },
        { status: 404 }
      );
    }

    if (!gate.isActive) {
      return NextResponse.json(
        { success: false, error: "This download is no longer available" },
        { status: 410 }
      );
    }

    // Validate input based on gate type
    const parsed = unlockDownloadGateSchema.safeParse(body);

    // Check requirements
    if (gate.requireEmail && !parsed.data?.email) {
      return NextResponse.json(
        { success: false, error: "Email is required to unlock this download" },
        { status: 400 }
      );
    }

    if (gate.requireFollow && !parsed.data?.followCompleted) {
      return NextResponse.json(
        { success: false, error: "Please follow us to unlock this download" },
        { status: 400 }
      );
    }

    // Get the file asset
    const [asset] = await db
      .select()
      .from(fileAssets)
      .where(eq(fileAssets.id, gate.fileAssetId))
      .limit(1);

    if (!asset || !asset.publicUrl) {
      return NextResponse.json(
        { success: false, error: "Download file not available" },
        { status: 500 }
      );
    }

    // Record the download action
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    await db.insert(downloadGateActions).values({
      id: generateUUID(),
      downloadGateId: gate.id,
      email: parsed.data?.email || null,
      ipAddress,
      userAgent,
    });

    // Increment download count
    await db
      .update(downloadGates)
      .set({
        downloadCount: sql`${downloadGates.downloadCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(downloadGates.id, gate.id));

    // Subscribe email if provided
    if (parsed.data?.email) {
      try {
        await subscribersService.subscribe(
          parsed.data.email,
          undefined,
          `download-gate:${slug}`
        );
      } catch {
        // Non-critical, continue
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: asset.publicUrl,
        filename: asset.filename,
        fileSize: asset.fileSize,
      },
    });
  } catch (error) {
    console.error("Error unlocking download gate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to unlock download" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const [gate] = await db
      .select({
        slug: downloadGates.slug,
        title: downloadGates.title,
        description: downloadGates.description,
        gateType: downloadGates.gateType,
        requireEmail: downloadGates.requireEmail,
        requireFollow: downloadGates.requireFollow,
        followUrl: downloadGates.followUrl,
        isActive: downloadGates.isActive,
        downloadCount: downloadGates.downloadCount,
      })
      .from(downloadGates)
      .where(eq(downloadGates.slug, slug))
      .limit(1);

    if (!gate) {
      return NextResponse.json(
        { success: false, error: "Download gate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: gate,
    });
  } catch (error) {
    console.error("Error fetching download gate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch download gate" },
      { status: 500 }
    );
  }
}
