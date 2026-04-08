import { NextResponse } from "next/server";
import { uploadToDropbox, isDropboxConfigured } from "@/lib/clients/dropbox";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    configured: isDropboxConfigured(),
  });
}

export async function POST(request: Request) {
  try {
    if (!isDropboxConfigured()) {
      return NextResponse.json(
        { success: false, error: "Dropbox not configured", configured: false },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "/sonido-liquido";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await uploadToDropbox(arrayBuffer, file.name, folder);

    if (result.success) {
      return NextResponse.json({
        success: true,
        url: result.url,
        fileName: file.name,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
