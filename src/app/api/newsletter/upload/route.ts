import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // For now, we'll just return a placeholder URL
    // In production, you would upload to a cloud storage service
    const fileName = file.name;
    const fileUrl = `/uploads/${Date.now()}-${fileName}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName,
      message: "File upload simulated (configure cloud storage for production)",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
