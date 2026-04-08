import { NextRequest, NextResponse } from "next/server";
import { eventsRepository } from "@/lib/repositories";
import {
  AppError,
  DatabaseError,
  ValidationError,
  errorLogger,
  getErrorMessage,
  createErrorResponse,
  ErrorCode,
} from "@/lib/errors";

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const events = await eventsRepository.findAll();

    return NextResponse.json({
      success: true,
      data: events,
      count: events.length,
      requestId,
    });
  } catch (error) {
    errorLogger.log(
      DatabaseError.queryFailed("fetch", "events", getErrorMessage(error), error as Error)
    );

    return NextResponse.json(
      createErrorResponse(error, "Failed to fetch events"),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      throw ValidationError.missingRequired("title");
    }
    if (!body.venue) {
      throw ValidationError.missingRequired("venue");
    }
    if (!body.city) {
      throw ValidationError.missingRequired("city");
    }
    if (!body.eventDate) {
      throw ValidationError.missingRequired("eventDate");
    }

    errorLogger.info(`Creating event`, { requestId, title: body.title });

    const event = await eventsRepository.create({
      title: body.title,
      description: body.description || null,
      venue: body.venue,
      city: body.city,
      country: body.country || "México",
      eventDate: new Date(body.eventDate),
      eventTime: body.eventTime || null,
      ticketUrl: body.ticketUrl || null,
      imageUrl: body.imageUrl || null,
      isFeatured: body.isFeatured || false,
      isCancelled: body.isCancelled || false,
    });

    errorLogger.info(`Event created successfully`, { requestId, eventId: event.id });

    return NextResponse.json({
      success: true,
      data: event,
      requestId,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          requestId,
        },
        { status: 400 }
      );
    }

    errorLogger.log(
      error instanceof AppError
        ? error
        : DatabaseError.queryFailed("create", "event", getErrorMessage(error), error as Error)
    );

    return NextResponse.json(
      createErrorResponse(error, "Failed to create event"),
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
}
