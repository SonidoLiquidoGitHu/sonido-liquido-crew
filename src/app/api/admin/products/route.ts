import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const isFeatured = searchParams.get("isFeatured");

    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { contains: search };
    }
    if (category) {
      where.category = category;
    }
    if (isFeatured === "true") {
      where.isFeatured = true;
    }

    const products = await db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const product = await db.product.create({
      data: {
        name: body.name,
        slug: body.slug || null,
        description: body.description || null,
        price: body.price,
        comparePrice: body.comparePrice || null,
        imageUrl: body.imageUrl || null,
        category: body.category || null,
        stock: body.stock || 0,
        isFeatured: body.isFeatured || false,
        isDigital: body.isDigital || false,
        downloadUrl: body.downloadUrl || null,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}
