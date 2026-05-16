type LogLevel = "info" | "warn" | "error";
type LogMetadata = Record<string, unknown>;

function writeLog(level: LogLevel, event: string, metadata: LogMetadata = {}): void {
  const record = {
    level,
    time: new Date().toISOString(),
    event,
    ...metadata
  };

  console[level](JSON.stringify(record));
}

export const logger = {
  info: (event: string, metadata?: LogMetadata) => writeLog("info", event, metadata),
  warn: (event: string, metadata?: LogMetadata) => writeLog("warn", event, metadata),
  error: (event: string, metadata?: LogMetadata) => writeLog("error", event, metadata)
};

export function serializeError(error: unknown): LogMetadata {
  if (error instanceof Error) {
    const serialized: LogMetadata = {
      name: error.name,
      message: error.message
    };

    if (error.stack !== undefined) {
      serialized.stack = error.stack;
    }

    if (error.cause !== undefined) {
      serialized.cause = serializeError(error.cause);
    }

    return serialized;
  }

  return {
    message: String(error),
    value: error
  };
}
