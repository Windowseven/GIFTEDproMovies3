import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
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
    const reply = context.switchToHttp().getResponse<FastifyReply>();
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
