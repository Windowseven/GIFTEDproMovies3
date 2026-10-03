import pino from "pino";
import type { DestinationStream, Logger } from "pino";
import type { LogLevel } from "../../config/environment.js";
import { REDACTED_VALUE, SENSITIVE_LOG_PATHS } from "./redaction.js";

export function createStructuredLogger(
  level: LogLevel,
  destination?: DestinationStream,
): Logger {
  const options = {
    level,
    messageKey: "msg",
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [...SENSITIVE_LOG_PATHS],
      censor: REDACTED_VALUE,
    },
  };
  return destination === undefined ? pino(options) : pino(options, destination);
}
