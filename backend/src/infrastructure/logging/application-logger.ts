import type { LoggerService } from "@nestjs/common";
import type { FastifyBaseLogger } from "fastify";

export class ApplicationLogger implements LoggerService {
  constructor(private readonly logger: FastifyBaseLogger) {}

  log(message: unknown, context?: string): void {
    this.logger.info({ context }, safeMessage(message));
  }

  error(message: unknown, _trace?: string, context?: string): void {
    this.logger.error({ context }, safeMessage(message));
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn({ context }, safeMessage(message));
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug({ context }, safeMessage(message));
  }

  verbose(message: unknown, context?: string): void {
    this.logger.trace({ context }, safeMessage(message));
  }

  fatal(message: unknown, context?: string): void {
    this.logger.fatal({ context }, safeMessage(message));
  }
}

function safeMessage(message: unknown): string {
  if (typeof message === "string") return message;
  if (message instanceof Error) return message.name;
  return "Application event";
}
