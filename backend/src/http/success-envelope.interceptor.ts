import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { map, type Observable } from "rxjs";

interface SuccessEnvelope {
  readonly success: true;
  readonly data: unknown;
  readonly meta?: unknown;
}

@Injectable()
export class SuccessEnvelopeInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    // Skip wrapping for SSE streaming endpoints
    const acceptHeader = request?.headers?.accept ?? "";
    if (
      acceptHeader.includes("text/event-stream") ||
      request?.url?.includes("/notifications/stream")
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map((body: unknown) => {
        if (reply.statusCode === 204 || isSuccessEnvelope(body)) return body;
        return { success: true as const, data: body };
      }),
    );
  }
}

function isSuccessEnvelope(body: unknown): body is SuccessEnvelope {
  return (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    body.success === true &&
    "data" in body
  );
}
