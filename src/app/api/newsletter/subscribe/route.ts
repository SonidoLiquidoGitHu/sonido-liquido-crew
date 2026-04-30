import { NextRequest, NextResponse } from "next/server";
import { subscribersService } from "@/lib/services";
import { subscribeSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, name, source } = parsed.data;

    // Subscribe
    const subscriber = await subscribersService.subscribe(
      email,
      name || undefined,
      source || "website"
    );

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to newsletter",
      data: {
        email: subscriber.email,
        subscribedAt: subscriber.subscribedAt,
      },
    });
  } catch (error) {
    console.error("Error subscribing:", error);
    return NextResponse.json(
      { success: false, error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
