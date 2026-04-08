import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { generateUUID, slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allProducts = await db.query.products.findMany({
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });

    return NextResponse.json({ success: true, data: allProducts });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      description,
      price,
      compareAtPrice,
      category,
      imageUrl,
      stockQuantity,
      isActive,
      isFeatured,
      currency,
      additionalImages,
    } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const productId = generateUUID();
    const slug = slugify(name);

    // Check if slug exists
    const existing = await db.query.products.findFirst({
      where: (p, { eq }) => eq(p.slug, slug),
    });

    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    await db.insert(products).values({
      id: productId,
      name,
      slug: finalSlug,
      description: description || null,
      price: price,
      compareAtPrice: compareAtPrice || null,
      category: category || "merchandise",
      imageUrl: imageUrl || null,
      stockQuantity: stockQuantity ?? null,
      isActive: isActive ?? true,
      isFeatured: isFeatured ?? false,
      currency: currency || "MXN",
    });

    return NextResponse.json({
      success: true,
      data: { id: productId, slug: finalSlug },
    });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing product ID" },
        { status: 400 }
      );
    }

    await db.update(products)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing product ID" },
        { status: 400 }
      );
    }

    await db.delete(products).where(eq(products.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
