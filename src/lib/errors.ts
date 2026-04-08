// ===========================================
// ERROR HANDLING UTILITIES
// ===========================================

/**
 * Custom error codes for categorizing errors
 */
export enum ErrorCode {
  // Database errors
  DB_CONNECTION_FAILED = "DB_CONNECTION_FAILED",
  DB_QUERY_FAILED = "DB_QUERY_FAILED",
  DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED",
  DB_RECORD_NOT_FOUND = "DB_RECORD_NOT_FOUND",
  DB_DUPLICATE_ENTRY = "DB_DUPLICATE_ENTRY",
  DB_CONSTRAINT_VIOLATION = "DB_CONSTRAINT_VIOLATION",

  // API errors
  API_REQUEST_FAILED = "API_REQUEST_FAILED",
  API_RATE_LIMITED = "API_RATE_LIMITED",
  API_UNAUTHORIZED = "API_UNAUTHORIZED",
  API_NOT_FOUND = "API_NOT_FOUND",
  API_INVALID_RESPONSE = "API_INVALID_RESPONSE",

  // External service errors
  SPOTIFY_ERROR = "SPOTIFY_ERROR",
  YOUTUBE_ERROR = "YOUTUBE_ERROR",
  DROPBOX_ERROR = "DROPBOX_ERROR",
  MAILCHIMP_ERROR = "MAILCHIMP_ERROR",

  // Validation errors
  VALIDATION_FAILED = "VALIDATION_FAILED",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Authentication errors
  AUTH_REQUIRED = "AUTH_REQUIRED",
  AUTH_INVALID_TOKEN = "AUTH_INVALID_TOKEN",
  AUTH_EXPIRED = "AUTH_EXPIRED",
  AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_INSUFFICIENT_PERMISSIONS",

  // Business logic errors
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED",
  DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE",

  // Unknown
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Structured error context for debugging
 */
export interface ErrorContext {
  service?: string;
  method?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  requestId?: string;
  timestamp?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Base application error with context
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode = 500,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.context = {
      ...context,
      timestamp: new Date().toISOString(),
    };
    this.isOperational = true;
    this.originalError = originalError;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Format error for logging
   */
  toLogFormat(): string {
    const parts = [
      `[${this.code}]`,
      this.message,
      this.context.service ? `| Service: ${this.context.service}` : "",
      this.context.method ? `| Method: ${this.context.method}` : "",
      this.context.entityType ? `| Entity: ${this.context.entityType}` : "",
      this.context.entityId ? `| ID: ${this.context.entityId}` : "",
    ].filter(Boolean);

    return parts.join(" ");
  }

  /**
   * Format error for API response
   */
  toApiResponse() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(process.env.NODE_ENV === "development" && {
          context: this.context,
          stack: this.stack,
        }),
      },
    };
  }
}

// ===========================================
// SPECIALIZED ERROR CLASSES
// ===========================================

/**
 * Database-related errors
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.DB_QUERY_FAILED,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, code, 500, { ...context, service: "Database" }, originalError);
    this.name = "DatabaseError";
  }

  static connectionFailed(details?: string, originalError?: Error): DatabaseError {
    return new DatabaseError(
      `Database connection failed${details ? `: ${details}` : ""}. Check DATABASE_URL and DATABASE_AUTH_TOKEN environment variables.`,
      ErrorCode.DB_CONNECTION_FAILED,
      {},
      originalError
    );
  }

  static notConfigured(): DatabaseError {
    return new DatabaseError(
      "Database is not configured. Set DATABASE_URL and DATABASE_AUTH_TOKEN environment variables.",
      ErrorCode.DB_NOT_CONFIGURED,
      {}
    );
  }

  static recordNotFound(entityType: string, identifier: string): DatabaseError {
    return new DatabaseError(
      `${entityType} not found with identifier: ${identifier}`,
      ErrorCode.DB_RECORD_NOT_FOUND,
      { entityType, entityId: identifier }
    );
  }

  static queryFailed(operation: string, entityType: string, details?: string, originalError?: Error): DatabaseError {
    return new DatabaseError(
      `Failed to ${operation} ${entityType}${details ? `: ${details}` : ""}`,
      ErrorCode.DB_QUERY_FAILED,
      { method: operation, entityType },
      originalError
    );
  }

  static duplicateEntry(entityType: string, field: string, value: string): DatabaseError {
    return new DatabaseError(
      `${entityType} with ${field} "${value}" already exists`,
      ErrorCode.DB_DUPLICATE_ENTRY,
      { entityType, additionalData: { field, value } }
    );
  }
}

/**
 * External API errors
 */
export class ExternalApiError extends AppError {
  public readonly serviceName: string;
  public readonly httpStatus?: number;
  public readonly responseBody?: unknown;

  constructor(
    serviceName: string,
    message: string,
    code: ErrorCode = ErrorCode.API_REQUEST_FAILED,
    httpStatus?: number,
    responseBody?: unknown,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, code, 502, { ...context, service: serviceName }, originalError);
    this.name = "ExternalApiError";
    this.serviceName = serviceName;
    this.httpStatus = httpStatus;
    this.responseBody = responseBody;
  }

  static spotifyError(operation: string, details?: string, httpStatus?: number, originalError?: Error): ExternalApiError {
    return new ExternalApiError(
      "Spotify",
      `Spotify API error during ${operation}${details ? `: ${details}` : ""}`,
      ErrorCode.SPOTIFY_ERROR,
      httpStatus,
      undefined,
      { method: operation },
      originalError
    );
  }

  static youtubeError(operation: string, details?: string, httpStatus?: number, originalError?: Error): ExternalApiError {
    return new ExternalApiError(
      "YouTube",
      `YouTube API error during ${operation}${details ? `: ${details}` : ""}`,
      ErrorCode.YOUTUBE_ERROR,
      httpStatus,
      undefined,
      { method: operation },
      originalError
    );
  }

  static dropboxError(operation: string, details?: string, httpStatus?: number, originalError?: Error): ExternalApiError {
    return new ExternalApiError(
      "Dropbox",
      `Dropbox API error during ${operation}${details ? `: ${details}` : ""}`,
      ErrorCode.DROPBOX_ERROR,
      httpStatus,
      undefined,
      { method: operation },
      originalError
    );
  }

  static rateLimited(serviceName: string, retryAfter?: number): ExternalApiError {
    return new ExternalApiError(
      serviceName,
      `${serviceName} API rate limit exceeded${retryAfter ? `. Retry after ${retryAfter} seconds` : ""}`,
      ErrorCode.API_RATE_LIMITED,
      429,
      undefined,
      { additionalData: { retryAfter } }
    );
  }

  static unauthorized(serviceName: string): ExternalApiError {
    return new ExternalApiError(
      serviceName,
      `${serviceName} API authentication failed. Check API credentials.`,
      ErrorCode.API_UNAUTHORIZED,
      401
    );
  }

  static notFound(serviceName: string, resourceType: string, resourceId: string): ExternalApiError {
    return new ExternalApiError(
      serviceName,
      `${resourceType} not found on ${serviceName}: ${resourceId}`,
      ErrorCode.API_NOT_FOUND,
      404,
      undefined,
      { entityType: resourceType, entityId: resourceId }
    );
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly validationErrors?: Record<string, string[]>;

  constructor(
    message: string,
    field?: string,
    validationErrors?: Record<string, string[]>,
    context: ErrorContext = {}
  ) {
    super(message, ErrorCode.VALIDATION_FAILED, 400, context);
    this.name = "ValidationError";
    this.field = field;
    this.validationErrors = validationErrors;
  }

  static invalidInput(field: string, message: string): ValidationError {
    return new ValidationError(
      `Invalid value for ${field}: ${message}`,
      field
    );
  }

  static missingRequired(field: string): ValidationError {
    return new ValidationError(
      `Missing required field: ${field}`,
      field
    );
  }

  static schemaValidation(errors: Record<string, string[]>): ValidationError {
    const fieldErrors = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return new ValidationError(
      `Validation failed: ${fieldErrors}`,
      undefined,
      errors
    );
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(entityType: string, identifier: string, context: ErrorContext = {}) {
    super(
      `${entityType} not found: ${identifier}`,
      ErrorCode.RESOURCE_NOT_FOUND,
      404,
      { ...context, entityType, entityId: identifier }
    );
    this.name = "NotFoundError";
  }
}

// ===========================================
// ERROR LOGGER
// ===========================================

/**
 * Structured error logger with context
 */
export const errorLogger = {
  /**
   * Log error with full context
   */
  log(error: Error | AppError, additionalContext?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const isAppError = error instanceof AppError;

    // Build log entry
    const logEntry = {
      timestamp,
      level: "error",
      name: error.name,
      message: error.message,
      ...(isAppError && {
        code: (error as AppError).code,
        context: (error as AppError).context,
      }),
      ...(additionalContext && { additionalContext }),
      stack: error.stack,
    };

    // Format for console
    if (isAppError) {
      console.error(`\n[ERROR] ${(error as AppError).toLogFormat()}`);
      if ((error as AppError).originalError) {
        console.error(`  Original Error: ${(error as AppError).originalError?.message}`);
      }
    } else {
      console.error(`\n[ERROR] ${error.name}: ${error.message}`);
    }

    // Log full details in development
    if (process.env.NODE_ENV === "development") {
      console.error("  Details:", JSON.stringify(logEntry, null, 2));
    }
  },

  /**
   * Log warning
   */
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`\n[WARN] ${message}`, context ? JSON.stringify(context) : "");
  },

  /**
   * Log info for debugging
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "development") {
      console.info(`\n[INFO] ${message}`, context ? JSON.stringify(context) : "");
    }
  },

  /**
   * Create error summary for API response
   */
  summarize(error: Error | AppError): {
    message: string;
    code: string;
    statusCode: number;
  } {
    if (error instanceof AppError) {
      return {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      };
    }

    return {
      message: error.message || "An unexpected error occurred",
      code: ErrorCode.UNKNOWN_ERROR,
      statusCode: 500,
    };
  },
};

// ===========================================
// ERROR HANDLING HELPERS
// ===========================================

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        // Create a new error with merged context since context is readonly
        const mergedError = new AppError(
          error.message,
          error.code,
          error.statusCode,
          { ...error.context, ...context },
          error.originalError
        );
        throw mergedError;
      }

      const wrappedError = new AppError(
        (error as Error).message || "An unexpected error occurred",
        ErrorCode.UNKNOWN_ERROR,
        500,
        context,
        error as Error
      );

      throw wrappedError;
    }
  }) as T;
}

/**
 * Extract meaningful error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
    if ("error" in error && typeof error.error === "string") {
      return error.error;
    }
  }

  return "An unexpected error occurred";
}

/**
 * Check if error is a specific type
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return error instanceof AppError && error.code === code;
}

/**
 * Create standardized API error response
 */
export function createErrorResponse(
  error: Error | AppError | unknown,
  defaultMessage = "An unexpected error occurred"
): {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
} {
  // Log the error
  if (error instanceof Error) {
    errorLogger.log(error);
  }

  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(process.env.NODE_ENV === "development" && {
          details: {
            context: error.context,
            originalError: error.originalError?.message,
          },
        }),
      },
    };
  }

  return {
    success: false,
    error: {
      code: ErrorCode.UNKNOWN_ERROR,
      message: getErrorMessage(error) || defaultMessage,
    },
  };
}
