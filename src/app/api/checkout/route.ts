import { NextRequest, NextResponse } from "next/server";
import { stripeClient } from "@/lib/clients";
import { productsRepository } from "@/lib/repositories";

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripeClient.isConfigured()) {
      return NextResponse.json(
        { success: false, error: "E-commerce is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { items, customerEmail } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items provided" },
        { status: 400 }
      );
    }

    // Validate items and build line items
    const lineItems: { price: string; quantity: number }[] = [];

    for (const item of items) {
      const product = await productsRepository.findById(item.productId);

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }

      if (!product.isActive) {
        return NextResponse.json(
          { success: false, error: `Product is not available: ${product.name}` },
          { status: 400 }
        );
      }

      if (!product.stripePriceId) {
        return NextResponse.json(
          { success: false, error: `Product not configured for checkout: ${product.name}` },
          { status: 400 }
        );
      }

      lineItems.push({
        price: product.stripePriceId,
        quantity: item.quantity || 1,
      });
    }

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
                    request.headers.get("origin") ||
                    "http://localhost:3000";

    // Create checkout session
    const session = await stripeClient.createCheckoutSession({
      lineItems,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/checkout/cancelled`,
      customerEmail,
      metadata: {
        source: "sonido-liquido-crew",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
