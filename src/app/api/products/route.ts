import { NextRequest, NextResponse } from "next/server";
import { productsService } from "@/lib/services";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const options = {
      category: searchParams.get("category") || undefined,
      isActive: searchParams.get("isActive") !== "false",
      limit: parseInt(searchParams.get("limit") || "20"),
    };

    const products = await productsService.getAll(options);
    const total = await productsService.getCount();

    return NextResponse.json({
      success: true,
      data: {
        items: products,
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
