type LogPayload = Record<string, unknown>;

const write = (level: "INFO" | "WARN" | "ERROR", message: string, payload?: LogPayload): void => {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(payload ? { payload } : {})
  };

  if (level === "ERROR") {
    console.error(JSON.stringify(entry));
    return;
  }

  if (level === "WARN") {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.info(JSON.stringify(entry));
};

export const logger = {
  info: (message: string, payload?: LogPayload): void => write("INFO", message, payload),
  warn: (message: string, payload?: LogPayload): void => write("WARN", message, payload),
  error: (message: string, payload?: LogPayload): void => write("ERROR", message, payload)
};
