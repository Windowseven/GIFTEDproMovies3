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
  [HttpStatus.UNAUTHORIZED]: {
    code: "UNAUTHORIZED",
    message: "Invalid credentials or unauthorized access.",
  },
  [HttpStatus.FORBIDDEN]: {
    code: "FORBIDDEN",
    message: "Access forbidden.",
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

    const rawResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const isCustomObject =
      typeof rawResponse === "object" && rawResponse !== null && !Array.isArray(rawResponse);
    const customResponse = isCustomObject
      ? (rawResponse as Record<string, unknown>)
      : null;
    const customStringMessage = typeof rawResponse === "string" ? rawResponse : null;

    const statusDetails = STATUS_DETAILS[statusCode];

    const code =
      statusCode === HttpStatus.SERVICE_UNAVAILABLE
        ? typeof customResponse?.code === "string" && customResponse.code.length > 0
          ? customResponse.code
          : statusDetails?.code ?? "SERVICE_UNAVAILABLE"
        : statusCode >= 500
          ? "INTERNAL_ERROR"
          : typeof customResponse?.code === "string" && customResponse.code.length > 0
            ? customResponse.code
            : statusDetails?.code ?? "REQUEST_REJECTED";

    const message =
      statusCode === HttpStatus.SERVICE_UNAVAILABLE
        ? typeof customResponse?.message === "string" && customResponse.message.length > 0
          ? customResponse.message
          : customStringMessage ?? statusDetails?.message ?? "The service is temporarily unavailable."
        : statusCode >= 500
          ? "An unexpected error occurred."
          : typeof customResponse?.message === "string" && customResponse.message.length > 0
            ? customResponse.message
            : customStringMessage ?? statusDetails?.message ?? "The request was rejected.";

    if (statusCode >= 500 && statusCode !== HttpStatus.SERVICE_UNAVAILABLE) {
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
    const customDetails =
      Array.isArray(customResponse?.details) ? (customResponse!.details as unknown[]) : null;

    const details =
      validationErrors.length > 0
        ? validationErrors
        : customDetails !== null
          ? customDetails
          : undefined;

    const error = {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
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
