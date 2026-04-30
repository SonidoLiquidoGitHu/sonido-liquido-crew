import { NextRequest, NextResponse } from "next/server";
import { eventsRepository } from "@/lib/repositories";
import {
  AppError,
  DatabaseError,
  errorLogger,
  createErrorResponse,
} from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = Math.random().toString(36).substring(7);

  try {
    const event = await eventsRepository.findById(id);

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Event not found: ${id}` } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: event,
      requestId,
    });
  } catch (error) {
    errorLogger.log(
      DatabaseError.queryFailed("fetch", "event", `ID: ${id}`, error as Error)
    );

    return NextResponse.json(
      createErrorResponse(error, "Failed to fetch event"),
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = Math.random().toString(36).substring(7);

  try {
    const body = await request.json();

    const existingEvent = await eventsRepository.findById(id);
    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Event not found: ${id}` } },
        { status: 404 }
      );
    }

    errorLogger.info(`Updating event`, { requestId, eventId: id });

    const event = await eventsRepository.update(id, {
      title: body.title,
      description: body.description || null,
      venue: body.venue,
      city: body.city,
      country: body.country || "México",
      eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
      eventTime: body.eventTime || null,
      ticketUrl: body.ticketUrl || null,
      imageUrl: body.imageUrl || null,
      isFeatured: body.isFeatured || false,
      isCancelled: body.isCancelled || false,
    });

    errorLogger.info(`Event updated successfully`, { requestId, eventId: id });

    return NextResponse.json({
      success: true,
      data: event,
      requestId,
    });
  } catch (error) {
    errorLogger.log(
      error instanceof AppError
        ? error
        : DatabaseError.queryFailed("update", "event", `ID: ${id}`, error as Error)
    );

    return NextResponse.json(
      createErrorResponse(error, "Failed to update event"),
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = Math.random().toString(36).substring(7);

  try {
    const existingEvent = await eventsRepository.findById(id);
    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Event not found: ${id}` } },
        { status: 404 }
      );
    }

    errorLogger.info(`Deleting event`, { requestId, eventId: id, title: existingEvent.title });

    const deleted = await eventsRepository.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "DELETE_FAILED", message: "Failed to delete event" } },
        { status: 500 }
      );
    }

    errorLogger.info(`Event deleted successfully`, { requestId, eventId: id });

    return NextResponse.json({
      success: true,
      message: "Event deleted",
      requestId,
    });
  } catch (error) {
    errorLogger.log(
      error instanceof AppError
        ? error
        : DatabaseError.queryFailed("delete", "event", `ID: ${id}`, error as Error)
    );

    return NextResponse.json(
      createErrorResponse(error, "Failed to delete event"),
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
}
