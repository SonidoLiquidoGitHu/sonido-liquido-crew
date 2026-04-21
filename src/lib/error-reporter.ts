type Severity = "debug" | "info" | "warn" | "error" | "fatal";

interface ErrorContext {
  /** Where the error originated — e.g. "api:/api/artists", "page:/artistas", "component:ArtistCard" */
  source: string;
  /** What was happening when it happened */
  action?: string;
  /** Any relevant IDs (artist id, slug, etc.) */
  meta?: Record<string, string | number | boolean>;
  /** Original error */
  error?: unknown;
}

interface ErrorLogEntry {
  timestamp: string;
  severity: Severity;
  source: string;
  action?: string;
  message: string;
  meta?: Record<string, string | number | boolean>;
  stack?: string;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const MIN_SEVERITY: Severity =
  (process.env.NODE_ENV === "production" ? "warn" : "debug") as Severity;

function shouldLog(severity: Severity): boolean {
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[MIN_SEVERITY];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function extractStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

/**
 * Central error reporter.
 * Logs structured entries to console and stores them for inspection.
 */
function createEntry(severity: Severity, ctx: ErrorContext): ErrorLogEntry {
  return {
    timestamp: formatTimestamp(),
    severity,
    source: ctx.source,
    action: ctx.action,
    message: extractMessage(ctx.error),
    meta: ctx.meta,
    stack: extractStack(ctx.error),
  };
}

function logEntry(entry: ErrorLogEntry): void {
  if (!shouldLog(entry.severity)) return;

  const label = `[${entry.severity.toUpperCase()}]`;
  const where = entry.source;
  const when = entry.action ? ` @ ${entry.action}` : "";
  const extra = entry.meta ? ` ${JSON.stringify(entry.meta)}` : "";

  const prefix = `${label} ${where}${when}${extra}`;

  switch (entry.severity) {
    case "debug":
      console.debug(prefix, entry.message);
      break;
    case "info":
      console.info(prefix, entry.message);
      break;
    case "warn":
      console.warn(prefix, entry.message);
      break;
    case "error":
    case "fatal":
      console.error(prefix, entry.message);
      if (entry.stack) console.error(entry.stack);
      break;
  }
}

// ── In-memory log buffer (client + server) ──────────────────────────

const LOG_BUFFER_SIZE = 100;
const logBuffer: ErrorLogEntry[] = [];

function pushToBuffer(entry: ErrorLogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) logBuffer.shift();
}

// ── Public API ──────────────────────────────────────────────────────

export const reporter = {
  debug(ctx: ErrorContext) {
    const entry = createEntry("debug", ctx);
    logEntry(entry);
    pushToBuffer(entry);
  },

  info(ctx: ErrorContext) {
    const entry = createEntry("info", ctx);
    logEntry(entry);
    pushToBuffer(entry);
  },

  warn(ctx: ErrorContext) {
    const entry = createEntry("warn", ctx);
    logEntry(entry);
    pushToBuffer(entry);
  },

  error(ctx: ErrorContext) {
    const entry = createEntry("error", ctx);
    logEntry(entry);
    pushToBuffer(entry);
  },

  fatal(ctx: ErrorContext) {
    const entry = createEntry("fatal", ctx);
    logEntry(entry);
    pushToBuffer(entry);
  },

  /** Get all buffered log entries (for debugging / error pages) */
  getLogs(): ErrorLogEntry[] {
    return [...logBuffer];
  },

  /** Get only error+fatal entries */
  getErrors(): ErrorLogEntry[] {
    return logBuffer.filter(
      (e) => e.severity === "error" || e.severity === "fatal"
    );
  },

  /** Clear the buffer */
  clear() {
    logBuffer.length = 0;
  },
};

/**
 * Build a user-facing error message from an API error response.
 * Extracts the `error` field if present, otherwise falls back.
 */
export function parseApiError(data: unknown, fallback = "Request failed"): string {
  if (data && typeof data === "object" && "error" in data) {
    return String((data as { error: unknown }).error);
  }
  return fallback;
}

/**
 * Classify an HTTP status for error reporting.
 */
export function classifyStatus(status: number): Severity {
  if (status >= 500) return "error";
  if (status === 429) return "warn";
  if (status >= 400) return "warn";
  return "info";
}
