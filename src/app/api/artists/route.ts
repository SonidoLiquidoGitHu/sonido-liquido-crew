import { NextRequest, NextResponse } from "next/server";
import { artistsService } from "@/lib/services";
import { artistFilterSchema } from "@/lib/validations";
import {
  AppError,
  ValidationError,
  errorLogger,
  getErrorMessage,
  createErrorResponse,
  ErrorCode,
} from "@/lib/errors";

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const context = { service: "ArtistsAPI", method: "GET", requestId };

  try {
    const searchParams = request.nextUrl.searchParams;

    errorLogger.info(`Fetching artists`, {
      requestId,
      params: {
        role: searchParams.get("role"),
        isActive: searchParams.get("isActive"),
        isFeatured: searchParams.get("isFeatured"),
        page: searchParams.get("page"),
        pageSize: searchParams.get("pageSize"),
      },
    });

    // Parse and validate query params
    const rawParams = {
      role: searchParams.get("role") || undefined,
      isActive: searchParams.get("isActive") === "true" ? true :
                searchParams.get("isActive") === "false" ? false : undefined,
      isFeatured: searchParams.get("isFeatured") === "true" ? true : undefined,
      page: searchParams.get("page") || 1,
      pageSize: searchParams.get("pageSize") || 50,
    };

    const params = artistFilterSchema.safeParse(rawParams);

    if (!params.success) {
      const validationErrors = params.error.flatten().fieldErrors;
      const errorMessage = Object.entries(validationErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
        .join("; ");

      errorLogger.warn(`Validation failed for artists query`, {
        requestId,
        errors: validationErrors,
      });

      throw ValidationError.schemaValidation(
        Object.fromEntries(
          Object.entries(validationErrors).map(([k, v]) => [k, v || []])
        )
      );
    }

    const options = {
      role: params.data.role,
      onlyActive: params.data.isActive,
      onlyFeatured: params.data.isFeatured,
      limit: params.data.pageSize,
      offset: (params.data.page - 1) * params.data.pageSize,
    };

    // Fetch artists - if count fails, continue with 0
    const [artists, total] = await Promise.all([
      artistsService.getAll(options),
      artistsService.getCount().catch((err) => {
        errorLogger.warn(`Failed to count artists: ${err.message}`);
        return 0;
      }),
    ]);

    errorLogger.info(`Artists fetched successfully`, {
      requestId,
      count: artists.length,
      total,
      page: params.data.page,
    });

    // Return data array directly for backward compatibility with client components
    // Also include pagination metadata
    return NextResponse.json({
      success: true,
      data: artists, // Direct array for backward compatibility
      pagination: {
        total,
        page: params.data.page,
        pageSize: params.data.pageSize,
        totalPages: Math.ceil(total / params.data.pageSize),
      },
      requestId,
    });
  } catch (error) {
    // Handle validation errors with 400 status
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            validationErrors: error.validationErrors,
          },
          requestId,
        },
        { status: 400 }
      );
    }

    // Log and handle other errors
    errorLogger.log(
      error instanceof AppError
        ? error
        : new AppError(
            `Failed to fetch artists: ${getErrorMessage(error)}`,
            ErrorCode.UNKNOWN_ERROR,
            500,
            context,
            error as Error
          )
    );

    return NextResponse.json(
      {
        ...createErrorResponse(error, "Failed to fetch artists"),
        requestId,
        help: "Check database connection and try again. If the problem persists, contact support.",
      },
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
}
