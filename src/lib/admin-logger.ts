/**
 * Simple logging utility for admin routes
 * 
 * Provides structured logging that can be easily replaced with a 
 * proper logging library (pino, winston) in the future.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  source: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

// Set to false to disable console output (e.g., in tests)
const LOGGING_ENABLED = process.env.NODE_ENV !== "test";

function formatLog(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]`;
  return `${prefix} ${entry.message}`;
}

function log(level: LogLevel, source: string, message: string, data?: Record<string, unknown>) {
  if (!LOGGING_ENABLED) return;

  const entry: LogEntry = {
    level,
    source,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  const formatted = formatLog(entry);

  switch (level) {
    case "error":
      console.error(formatted, data ? data : "");
      break;
    case "warn":
      console.warn(formatted, data ? data : "");
      break;
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.log(formatted, data ? data : "");
      }
      break;
    default:
      console.log(formatted, data ? data : "");
  }
}

/**
 * Create a logger instance for a specific admin route
 * 
 * @example
 * const logger = createAdminLogger("census-pull");
 * logger.info("Starting data pull");
 * logger.info("Fetched data", { cityCount: 43 });
 * logger.error("Failed to fetch", { error: err.message });
 */
export function createAdminLogger(source: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => log("info", source, message, data),
    warn: (message: string, data?: Record<string, unknown>) => log("warn", source, message, data),
    error: (message: string, data?: Record<string, unknown>) => log("error", source, message, data),
    debug: (message: string, data?: Record<string, unknown>) => log("debug", source, message, data),
  };
}

export type AdminLogger = ReturnType<typeof createAdminLogger>;
