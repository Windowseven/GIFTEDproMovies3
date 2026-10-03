import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyBaseLogger } from "fastify";

interface ValidationIssue {
  readonly field: string;
  readonly messages: readonly string[];
}

interface ExceptionResponse {
  readonly validationErrors?: readonly ValidationIssue[];
}

const STATUS_DETAILS: Readonly<Record<number, { code: string; message: string }>> = {
  [HttpStatus.BAD_REQUEST]: {
    code: "BAD_REQUEST",
    message: "The request is invalid.",
  },
  [HttpStatus.NOT_FOUND]: {
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
  },
  [HttpStatus.METHOD_NOT_ALLOWED]: {
    code: "METHOD_NOT_ALLOWED",
    message: "The request method is not supported.",
  },
  [HttpStatus.REQUEST_TIMEOUT]: {
    code: "REQUEST_TIMEOUT",
    message: "The request timed out.",
  },
  [HttpStatus.PAYLOAD_TOO_LARGE]: {
    code: "PAYLOAD_TOO_LARGE",
    message: "The request body exceeds the allowed size.",
  },
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: {
    code: "UNSUPPORTED_MEDIA_TYPE",
    message: "The request media type is not supported.",
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    code: "TOO_MANY_REQUESTS",
    message: "Too many requests.",
  },
  [HttpStatus.SERVICE_UNAVAILABLE]: {
    code: "SERVICE_UNAVAILABLE",
    message: "The service is temporarily unavailable.",
  },
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: FastifyBaseLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const statusDetails = STATUS_DETAILS[statusCode];
    const code = statusDetails?.code ??
      (statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_REJECTED");
    const message = statusDetails?.message ??
      (statusCode >= 500 ? "An unexpected error occurred." : "The request was rejected.");

    if (statusCode >= 500) {
      this.logger.error(
        {
          requestId: request.id,
          route: request.routeOptions.url,
          errorType: exception instanceof Error ? exception.name : "UnknownError",
        },
        "Unhandled HTTP request error",
      );
    }

    const validationErrors = getValidationErrors(exception);
    const error = {
      code,
      message,
      ...(validationErrors.length > 0 ? { details: validationErrors } : {}),
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };
    reply.status(statusCode).send({ success: false, error });
  }
}

function getValidationErrors(exception: unknown): readonly ValidationIssue[] {
  if (!(exception instanceof HttpException)) return [];
  const response = exception.getResponse();
  if (typeof response !== "object" || response === null) return [];
  const candidate = response as ExceptionResponse;
  return Array.isArray(candidate.validationErrors)
    ? candidate.validationErrors
    : [];
}
