/**
 * Tiny structured console logger. Swap for pino/winston later without
 * touching call sites - everything in the app imports from here.
 */

type Level = "info" | "warn" | "error" | "debug";

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  const line = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ?? {}),
  };
  const serialized = JSON.stringify(line);

  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => emit("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit("error", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") emit("debug", message, meta);
  },
};
