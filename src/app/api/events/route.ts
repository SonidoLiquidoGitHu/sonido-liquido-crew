import { NextRequest, NextResponse } from "next/server";
import { eventsService } from "@/lib/services";
import {
  AppError,
  errorLogger,
  getErrorMessage,
  createErrorResponse,
  ErrorCode,
} from "@/lib/errors";

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get("filter"); // "upcoming" | "past" | "all"
    const limit = parseInt(searchParams.get("limit") || "10");

    errorLogger.info(`Fetching events`, { requestId, filter, limit });

    let events;

    if (filter === "past") {
      events = await eventsService.getPast(limit);
    } else if (filter === "all") {
      events = await eventsService.getAll({ limit });
    } else {
      // Default to upcoming
      events = await eventsService.getUpcoming(limit);
    }

    return NextResponse.json({
      success: true,
      data: events,
      meta: {
        filter: filter || "upcoming",
        count: events.length,
      },
      requestId,
    });
  } catch (error) {
    errorLogger.log(
      error instanceof AppError
        ? error
        : new AppError(
            `Failed to fetch events: ${getErrorMessage(error)}`,
            ErrorCode.UNKNOWN_ERROR,
            500,
            { service: "EventsAPI", method: "GET", requestId },
            error as Error
          )
    );

    return NextResponse.json(
      {
        ...createErrorResponse(error, "Failed to fetch events"),
        requestId,
      },
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
}
